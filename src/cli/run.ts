import { reasonOf } from '../core/index.js';
import type { Result } from '../core/index.js';
import { checkCampaign, estimateCampaign, formatEstimate, runCampaign, totalLine } from '../runner/index.js';
import type { CheckedCampaign } from '../runner/index.js';

import { dryRunCommand } from './dry-run.js';
import { parseScenarioArguments, validateScenario } from './scenario.js';
import { checkSpending, count, EXIT, portsFor, report, SPENDING_FLAG, USAGE } from './shared.js';
import type { Io, Ports } from './shared.js';

export { agentCredential, EXIT } from './shared.js';
export type { Io, Ports } from './shared.js';

const HELP_FLAGS = ['--help', '-h'];

/**
 * Run the `bench` command line `argv` (without the executable) and return its exit code. `root` is the
 * repository a command that names a scenario reads `scenarios/` from: the working directory.
 */
export async function main(
  argv: readonly string[],
  io: Io,
  ports?: Ports,
  root: string = process.cwd(),
): Promise<number> {
  if (argv.length === 1 && HELP_FLAGS.includes(argv[0] as string)) {
    io.stdout(USAGE);
    return EXIT.ok;
  }
  if (argv[0] === 'scenario' && argv[1] === 'dry-run') return dryRunCommand(argv.slice(2), io, ports, root);
  if (argv[0] === 'scenario') return scenarioCommand(argv.slice(1), io, root);
  const [noun, verb, file, ...extra] = argv;
  // The flag belongs to `run`: accepting it on `validate` would say it means something there.
  const allowSpending = verb === 'run' && extra.includes(SPENDING_FLAG);
  const rest = allowSpending ? extra.filter((argument) => argument !== SPENDING_FLAG) : extra;
  if (noun !== 'campaign' || !isFileArgument(file) || rest.length > 0) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  if (verb === 'validate') return validateCampaign(file, io);
  if (verb === 'estimate') return estimateCommand(file, io);
  if (verb === 'run') return runCampaignCommand(file, io, ports, allowSpending);
  io.stderr(USAGE);
  return EXIT.usage;
}

/** `bench scenario validate` (REQ-CLI-04); `dry-run` is dispatched before it reaches here. */
function scenarioCommand(argv: readonly string[], io: Io, root: string): number {
  const [verb, ...rest] = argv;
  const args = verb === 'validate' ? parseScenarioArguments(rest) : undefined;
  if (args === undefined) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  const result = validateScenario(args, root);
  if (!result.ok) return report(result.issues, io);
  io.stdout(`${result.line}\n`);
  return EXIT.ok;
}

/** A file argument: present, not empty, and not an option. */
function isFileArgument(file: string | undefined): file is string {
  return file !== undefined && file !== '' && !file.startsWith('-');
}

/** REQ-CLI-01: `bench campaign validate <file>`. */
function validateCampaign(file: string, io: Io): number {
  const result = checkCampaign(file);
  if (!result.ok) return report(result.issues, io);
  const { id, spec } = result.value.campaign;
  io.stdout(
    `campaign ${id} is valid (${count(spec.scenarios.length, 'scenario')}, ${count(spec.arms.length, 'arm')})\n`,
  );
  return EXIT.ok;
}

/**
 * REQ-CLI-02: `bench campaign estimate <file>` (F1.2). The campaign's cost from its scenarios' dry
 * runs, one line per scenario version, arm and model, then the total; it reads files only, and
 * starts no container and no session.
 */
function estimateCommand(file: string, io: Io): number {
  const checked = checkCampaign(file);
  if (!checked.ok) return report(checked.issues, io);
  const estimate = estimateCampaign(checked.value);
  if (!estimate.ok) return report(estimate.issues, io);
  io.stdout(
    formatEstimate(estimate.value, checked.value.campaign.repoRoot)
      .map((line) => `${line}\n`)
      .join(''),
  );
  return EXIT.ok;
}

/**
 * REQ-CLI-03, as far as task-022 goes: `bench campaign run <file>` executes the campaign, one session
 * per step (F2.2), a real agent only with {@link SPENDING_FLAG}, printing its estimate before and its
 * cost after (REQ-NFR-06). The warning and the ceiling arrive with F1.3 (task-023).
 */
async function runCampaignCommand(
  file: string,
  io: Io,
  ports?: Ports,
  allowSpending = false,
): Promise<number> {
  const checked = checkCampaign(file);
  if (!checked.ok) return report(checked.issues, io);

  const spec = checked.value.campaign.spec;
  const spending = checkSpending(spec, {
    allowSpending,
    // A campaign with a WingFoil harness needs the clone it is built from, before anything is built.
    buildsWingfoil: Object.values(spec.harnesses).some((harness) => harness.tool === 'wingfoil'),
    refusal: {
      path: 'campaign',
      message:
        `agent '${spec.agent.name}' spends real money, up to ${spec.budget.ceiling_eur} EUR; ` +
        `pass ${SPENDING_FLAG} to run it`,
    },
  });
  if (!spending.ok) return report(spending.issues, io);
  const { credential, harnessSources } = spending.value;

  const resolved = ports ? { ok: true as const, value: ports } : portsFor(spec, credential);
  if (!resolved.ok) return report(resolved.issues, io);

  // What it expects to spend, before anything is built (REQ-NFR-06). A campaign that cannot be
  // estimated still runs here: refusing it is the budget guard's (F1.3, task-023).
  const rate = spec.currency.usd_to_eur;
  const estimate = estimateCampaign(checked.value);
  io.stdout(
    estimate.ok
      ? `${totalLine(estimate.value.totalUsd, rate, 'estimate')}\n`
      : `estimate: not available, ${count(estimate.issues.length, 'dry run')} missing\n`,
  );

  let summary;
  try {
    summary = await runCampaign(checked.value, {
      ...resolved.value,
      ...(harnessSources === undefined ? {} : { harnessSources }),
      log: (line) => io.stdout(`${line}\n`),
      logError: (line) => io.stderr(`${line}\n`),
      // The credential reaches the container here and nowhere else (REQ-RUN-15, REQ-NFR-01), and
      // the values to scrub are named rather than taken from the whole environment.
      ...(credential === undefined ? {} : { containerEnv: credential, secrets: Object.values(credential) }),
    });
  } catch (error) {
    // The campaign could not start at all: no Docker daemon, no results directory, no image.
    return report([{ path: 'campaign', message: reasonOf(error) }], io);
  }
  const failed = summary.runs.filter((run) => run.outcome === 'failed').length;
  io.stdout(`${count(summary.runs.length - failed, 'run')} completed, ${failed} failed\n`);
  // What it spent, once it ended (REQ-NFR-06): every step of every run, as the agent reported it.
  const spent = summary.runs
    .flatMap((run) => run.steps)
    .reduce((total, step) => total + step.usage.costUsd, 0);
  io.stdout(`${totalLine(spent, rate, 'cost')}\n`);
  return summary.completed ? EXIT.ok : EXIT.failure;
}

/** The real ports for a checked campaign: {@link portsFor} its pins. */
export function realPorts(
  campaign: CheckedCampaign,
  credential?: Readonly<Record<string, string>>,
): Result<Ports> {
  return portsFor(campaign.campaign.spec, credential);
}
