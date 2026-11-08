import { relative } from 'node:path';

import { codexFileSecrets } from '../agents/index.js';
import { effortRefusal, missingEffort, reasonOf } from '../core/index.js';
import { checkConfigure, runConfigure } from '../runner/index.js';
import type { ConfigureRequest } from '../runner/index.js';
import { checkHoldoutRoot, loadHoldoutAdditions } from '../scenario/index.js';
import type { HoldoutAdditions } from '../scenario/index.js';

import { HOLDOUT_VARIABLE } from './preflight.js';
import { parseScenarioRef } from './scenario.js';
import { checkSpending, EXIT, portsFor, report, SPENDING_FLAG, USAGE, withInterrupt } from './shared.js';
import type { Io, Ports } from './shared.js';

/** `bench scenario configure`'s arguments (REQ-CLI-14). */
export interface ConfigureArguments extends ConfigureRequest {
  readonly allowSpending: boolean;
}

const ARM_OPTION = '--arm';
const REPLACE_FLAG = '--replace';

/**
 * `<id>@<version> --arm <harness> [--allow-spending] [--replace]`, the options in any order, each at most once;
 * `undefined` for anything else. `--arm` is required.
 */
export function parseConfigureArguments(args: readonly string[]): ConfigureArguments | undefined {
  const [ref, ...rest] = args;
  const reference = parseScenarioRef(ref);
  if (reference === undefined) return undefined;
  let arm: string | undefined;
  let allowSpending = false;
  let replace = false;
  for (let index = 0; index < rest.length; index += 1) {
    const option = rest[index] as string;
    if (option === SPENDING_FLAG && !allowSpending) allowSpending = true;
    else if (option === REPLACE_FLAG && !replace) replace = true;
    else if (option === ARM_OPTION && arm === undefined) {
      const value = rest[index + 1];
      if (value === undefined || value === '' || value.startsWith('-')) return undefined;
      arm = value;
      index += 1;
    } else return undefined;
  }
  return arm === undefined ? undefined : { ...reference, arm, allowSpending, replace };
}

/**
 * REQ-CLI-14: `bench scenario configure <id>@<version> --arm <harness> [--allow-spending] [--replace]` (F7.5). Checks
 * the session before anything is built (REQ-RUN-20), refuses without {@link SPENDING_FLAG}, prints the session's
 * ceiling, runs it, and prints the outcome, the configuration's files, the record's path and the cost. Exit 0 when the
 * configuration is written; 1 when refused before the session, when its result is refused, or when it ended early.
 */
export async function configureCommand(
  argv: readonly string[],
  io: Io,
  ports: Ports | undefined,
  root: string,
): Promise<number> {
  const args = parseConfigureArguments(argv);
  if (args === undefined) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  // The hold-out's literals are searched for in the prompt when a hold-out is set (REQ-FMT-08 as amended in 1.50).
  let holdout: HoldoutAdditions | undefined;
  const holdoutPath = process.env[HOLDOUT_VARIABLE];
  if (holdoutPath !== undefined && holdoutPath !== '') {
    const checkedRoot = checkHoldoutRoot(holdoutPath);
    if (!checkedRoot.ok) {
      return report(
        checkedRoot.issues.map((issue) => ({
          path: HOLDOUT_VARIABLE,
          message: `${issue.path} ${issue.message}`,
        })),
        io,
      );
    }
    const additions = loadHoldoutAdditions(holdoutPath, args.id, args.version);
    if (!additions.ok) return report(additions.issues, io);
    holdout = additions.value;
  }
  const checked = checkConfigure(args, root, holdout);
  if (!checked.ok) return report(checked.issues, io);
  const { profile, scenario, arm, model } = checked.value;
  const ceiling = profile.caps.run_cost_eur;

  // Every configuring session is a real-agent session (REQ-RUN-20): campaign run's refusal, whatever the agent.
  if (!args.allowSpending) {
    return report(
      [
        {
          path: 'configure',
          message:
            `agent '${profile.agent.name}' spends real money, up to the session's ceiling of ${ceiling} EUR; ` +
            `pass ${SPENDING_FLAG} to run it`,
        },
      ],
      io,
    );
  }
  // dl-015: the model runs at the profile's pinned effort, refused first, as a dry run's.
  const unpinned = missingEffort(profile.agent, [model]);
  if (unpinned.length > 0) {
    return report(
      unpinned.map((m) => effortRefusal(m, profile.agent.name)),
      io,
    );
  }
  const spending = checkSpending(profile, {
    allowSpending: true,
    builds: arm.requires === undefined ? [] : [arm.requires],
    refusal: { path: 'configure', message: '' },
  });
  if (!spending.ok) return report(spending.issues, io);
  const { credential, credentialFile, secrets, harnessSources } = spending.value;
  const resolved = ports
    ? { ok: true as const, value: ports }
    : portsFor(profile, credential, credentialFile);
  if (!resolved.ok) return report(resolved.issues, io);

  const what = `${scenario.id}@${scenario.version} for ${arm.name}`;
  io.stdout(`configure ${what} on ${model}: the session may spend up to ${ceiling} EUR\n`);
  let summary;
  try {
    summary = await withInterrupt(io, (signal) =>
      runConfigure(checked.value, {
        ...resolved.value,
        ...(harnessSources === undefined ? {} : { harnessSources }),
        log: (line) => io.stdout(`${line}\n`),
        logError: (line) => io.stderr(`${line}\n`),
        // The credential reaches the container here and nowhere else (REQ-RUN-15, REQ-NFR-01).
        ...(credential === undefined ? {} : { containerEnv: credential, secrets: Object.values(credential) }),
        ...(credentialFile === undefined
          ? {}
          : {
              credentialFile,
              secrets: secrets ?? [],
              refreshSecrets: () => codexFileSecrets(credentialFile),
            }),
        signal,
      }),
    );
  } catch (error) {
    // The session never started: no image, no harness, no workspace, a failed setup. No record is written.
    return report([{ path: 'configure', message: reasonOf(error) }], io);
  }

  const { record } = summary;
  const at = (path: string) => relative(root, path);
  io.stdout(`configure ${what}: ${record.outcome}, ${record.cost_eur.toFixed(4)} EUR\n`);
  if (record.files !== undefined) {
    io.stdout(`${at(summary.configurationDir)}: ${record.files.length} files\n`);
    for (const file of record.files) io.stdout(`  ${file.path}\n`);
  }
  io.stdout(`record ${summary.index}: ${at(summary.recordFile)}\n`);
  io.stdout(`transcript: ${at(summary.transcript)}\n`);
  if (summary.loadIssues.length > 0) return report(summary.loadIssues, io);
  if (record.outcome === 'written') return EXIT.ok;
  io.stderr(
    `configure ${what}: ${record.outcome}${record.reason === undefined ? '' : `: ${record.reason}`}\n`,
  );
  return EXIT.failure;
}
