import { join, relative } from 'node:path';

import { effortRefusal, missingEffort, reasonOf } from '../core/index.js';
import { latestDryRun } from '../results/index.js';
import { checkDryRun, runDryRun } from '../runner/index.js';
import type { DryRunRequest } from '../runner/index.js';

import { parseScenarioRef } from './scenario.js';
import { checkSpending, EXIT, portsFor, report, SPENDING_FLAG, USAGE } from './shared.js';
import type { Io, Ports } from './shared.js';

/** `bench scenario dry-run`'s arguments (REQ-CLI-05). */
export interface DryRunArguments extends DryRunRequest {
  readonly allowSpending: boolean;
}

/** The options that take a value, and the flag. */
const ARM_OPTION = '--arm';
const MODEL_OPTION = '--model';

/**
 * `<id>@<version> --arm <arm> [--model <id>] [--allow-spending]`, the options in any order, each at
 * most once; `undefined` for anything else. `--arm` is required.
 */
export function parseDryRunArguments(args: readonly string[]): DryRunArguments | undefined {
  const [ref, ...rest] = args;
  const reference = parseScenarioRef(ref);
  if (reference === undefined) return undefined;
  const values = new Map<string, string>();
  let allowSpending = false;
  for (let index = 0; index < rest.length; index += 1) {
    const option = rest[index] as string;
    if (option === SPENDING_FLAG && !allowSpending) {
      allowSpending = true;
      continue;
    }
    const value = rest[index + 1];
    if (![ARM_OPTION, MODEL_OPTION].includes(option) || values.has(option)) return undefined;
    if (value === undefined || value === '' || value.startsWith('-')) return undefined;
    values.set(option, value);
    index += 1;
  }
  const arm = values.get(ARM_OPTION);
  if (arm === undefined) return undefined;
  const model = values.get(MODEL_OPTION);
  return { ...reference, arm, ...(model === undefined ? {} : { model }), allowSpending };
}

/**
 * REQ-CLI-05: `bench scenario dry-run <id>@<version> --arm <arm> [--model <id>] [--allow-spending]`
 * (F3.3). Checks the dry run and whatever spending it needs before anything is built, prints what it
 * expects to spend, runs it, and prints what it spent (REQ-NFR-06). Exit 0 when the run completed.
 */
export async function dryRunCommand(
  argv: readonly string[],
  io: Io,
  ports: Ports | undefined,
  root: string,
): Promise<number> {
  const args = parseDryRunArguments(argv);
  if (args === undefined) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  const checked = checkDryRun(args, root);
  if (!checked.ok) return report(checked.issues, io);
  const { profile, scenario, arm, model } = checked.value;

  const spending = checkSpending(profile, {
    allowSpending: args.allowSpending,
    builds: checked.value.arms.flatMap((loaded) => (loaded.requires === undefined ? [] : [loaded.requires])),
    refusal: {
      path: 'dry run',
      message:
        `agent '${profile.agent.name}' spends real money, up to the run's cap of ` +
        `${profile.caps.run_cost_eur} EUR; pass ${SPENDING_FLAG} to run it`,
    },
  });
  if (!spending.ok) return report(spending.issues, io);
  // dl-015: a real agent's dry run runs its model at the profile's pinned effort.
  const unpinned = missingEffort(profile.agent, [model]);
  if (unpinned.length > 0) return report(unpinned.map(effortRefusal), io);
  const { credential, harnessSources } = spending.value;
  const resolved = ports ? { ok: true as const, value: ports } : portsFor(profile, credential);
  if (!resolved.ok) return report(resolved.issues, io);

  // What it expects to spend, before anything is built (REQ-NFR-06).
  const rate = profile.currency.usd_to_eur;
  const what = `${scenario.id}@${scenario.version} in ${arm.name} on ${model}`;
  const latest = latestDryRun(join(root, 'results'), {
    id: scenario.id,
    version: scenario.version,
    hash: scenario.hash,
    arm: arm.name,
    model,
    ...(profile.agent.effort?.[model] === undefined ? {} : { effort: profile.agent.effort[model] }),
  });
  io.stdout(
    latest === undefined
      ? `dry run ${what}: no dry run yet; this one may spend up to its cap, ${profile.caps.run_cost_eur} EUR\n`
      : `dry run ${what}: the latest dry run cost ${money(latest.costUsd, rate)} (${relative(root, latest.dir)})\n`,
  );

  let summary;
  try {
    summary = await runDryRun(checked.value, {
      ...resolved.value,
      ...(harnessSources === undefined ? {} : { harnessSources }),
      log: (line) => io.stdout(`${line}\n`),
      logError: (line) => io.stderr(`${line}\n`),
      // The credential reaches the container here and nowhere else (REQ-RUN-15, REQ-NFR-01).
      ...(credential === undefined ? {} : { containerEnv: credential, secrets: Object.values(credential) }),
    });
  } catch (error) {
    // The dry run could not start at all: no Docker daemon, no results directory, no image.
    return report([{ path: 'dry run', message: reasonOf(error) }], io);
  }

  // What it spent, once it ended (REQ-NFR-06): what the agent reports, in USD, and at the profile's rate.
  const [run] = summary.runs;
  if (run === undefined) return report([{ path: 'dry run', message: 'no run was executed' }], io);
  const costs = run.steps.map((step) => step.usage.costUsd);
  const total = costs.reduce((sum, cost) => sum + cost, 0);
  const perStep = run.steps
    .map((step) => `step ${String(step.n).padStart(2, '0')} ${step.usage.costUsd.toFixed(4)} USD`)
    .join(', ');
  io.stdout(
    `dry run ${scenario.id}@${scenario.version} in ${arm.name}: ${run.outcome}, ${money(total, rate)}` +
      `${perStep === '' ? '' : ` — ${perStep}`} — ${relative(root, summary.resultsDir)}\n`,
  );
  return run.outcome === 'completed' ? EXIT.ok : EXIT.failure;
}

/** A cost as the agent reports it, in USD, and at `rate` in EUR. */
function money(usd: number, rate: number): string {
  return `${usd.toFixed(4)} USD (${(usd * rate).toFixed(4)} EUR)`;
}
