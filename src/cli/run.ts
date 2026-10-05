import { missingCapabilities } from '../arms/index.js';
import { reasonOf } from '../core/index.js';
import type { Result } from '../core/index.js';
import { checkCampaign, estimateCampaign, formatEstimate, runCampaign, totalLine } from '../runner/index.js';
import type { CheckedCampaign } from '../runner/index.js';

import { dryRunCommand } from './dry-run.js';
import { campaignRequirements, FAKE_SCRIPT_VARIABLE, formatRequirement, refusalOf } from './preflight.js';
import { parseScenarioArguments, validateScenario } from './scenario.js';
import { scoreCommand } from './score.js';
import { findingCommand } from './finding.js';
import { runCommand } from './show.js';
import { siteCommand } from './site.js';
import { transcriptsCommand } from './transcripts.js';
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
  if (argv[0] === 'score') return scoreCommand(argv.slice(1), io, ports, root);
  if (argv[0] === 'run') return runCommand(argv.slice(1), io, root);
  if (argv[0] === 'finding') return findingCommand(argv.slice(1), io, root);
  if (argv[0] === 'site') return siteCommand(argv.slice(1), io, root, ports?.publish);
  if (argv[0] === 'transcripts') return transcriptsCommand(argv.slice(1), io, root);
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
  // Every run that will be an expected failure (F3.6), before anything is spent: it runs, and is marked.
  for (const scenario of result.value.scenarios) {
    for (const arm of result.value.arms) {
      const missing = missingCapabilities(scenario, arm);
      if (missing.length > 0) {
        io.stdout(
          `expected failure: ${scenario.id}@${scenario.version} in ${arm.name} (missing ${missing.join(', ')})\n`,
        );
      }
    }
  }
  // What the runs need from this machine (bug-014): listed, not refused — the file is valid whatever the
  // environment of the machine that validates it, and `run` refuses what is missing.
  for (const requirement of campaignRequirements(result.value))
    io.stdout(`${formatRequirement(requirement)}\n`);
  return EXIT.ok;
}

/** How every refusal of the budget guard begins. */
const NOT_STARTED = 'not started: ';

/** An amount in EUR as the guard prints it. */
function eur(value: number): string {
  return `${value.toFixed(4)} EUR`;
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
 * REQ-CLI-03: `bench campaign run <file>` executes the campaign, one session per step (F2.2). Before
 * anything is built, the budget guard (F1.3, task-023 Design): no estimate or an estimate above
 * `ceiling_eur` refuses, with no override; then a real agent only with {@link SPENDING_FLAG}; then above
 * `warn_eur` the maintainer confirms on a terminal. It prints its estimate before and its cost after
 * (REQ-NFR-06).
 */
async function runCampaignCommand(
  file: string,
  io: Io,
  ports?: Ports,
  allowSpending = false,
): Promise<number> {
  const checked = checkCampaign(file);
  if (!checked.ok) return report(checked.issues, io);

  // What the runs need from this machine, all at once and before the estimate (bug-014): a campaign never gets as far
  // as its estimate to stop on a variable nobody declared. A missing variable is always refused; a path that names
  // the wrong thing only with the real ports, since injected ones use no path of this machine (and need no script).
  const unmet = campaignRequirements(checked.value).filter(
    (r) =>
      r.neededBy === 'run' &&
      (r.state === 'missing' || (r.state === 'invalid' && ports === undefined)) &&
      !(ports !== undefined && r.variable === FAKE_SCRIPT_VARIABLE),
  );
  if (unmet.length > 0) return report(unmet.map(refusalOf), io);

  const spec = checked.value.campaign.spec;
  const rate = spec.currency.usd_to_eur;
  // What it expects to spend, before anything is built (REQ-NFR-06), and the budget guard's first two
  // refusals (F1.3, task-023): a campaign whose cost is unknown, and one above its ceiling, never start.
  const estimate = estimateCampaign(checked.value);
  if (!estimate.ok) {
    io.stdout(`estimate: not available, ${count(estimate.issues.length, 'dry run')} missing\n`);
    return report(
      [...estimate.issues, { path: 'campaign', message: NOT_STARTED + 'its cost cannot be estimated' }],
      io,
    );
  }
  io.stdout(`${totalLine(estimate.value.totalUsd, rate, 'estimate')}\n`);
  const { totalEur } = estimate.value;
  const { warn_eur, ceiling_eur } = spec.budget;
  if (totalEur > ceiling_eur) {
    // No option is read here, and none exists: the ceiling is the campaign file's (acceptance decision 2).
    return report(
      [
        {
          path: 'campaign',
          message:
            `${NOT_STARTED}the estimate, ${eur(totalEur)}, is above the ceiling, ${ceiling_eur} EUR. No option ` +
            "overrides it: lower the campaign's cost, or raise ceiling_eur, which makes a new campaign",
        },
      ],
      io,
    );
  }

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

  // The warning, last, so that nobody confirms what a missing credential would stop a second later.
  if (totalEur > warn_eur) {
    io.stderr(`campaign: the estimate, ${eur(totalEur)}, is above the warning threshold, ${warn_eur} EUR\n`);
    if (io.ask === undefined) {
      return report(
        [
          {
            path: 'campaign',
            message: `${NOT_STARTED}a campaign above its warning threshold is confirmed on a terminal`,
          },
        ],
        io,
      );
    }
    const answer = (await io.ask('Start the campaign? [y/N] ')).trim().toLowerCase();
    if (answer !== 'y' && answer !== 'yes')
      return report([{ path: 'campaign', message: `${NOT_STARTED}not confirmed` }], io);
  }

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
  const ended = (outcome: string) => summary.runs.filter((run) => run.outcome === outcome).length;
  // The runs that stopped at a cap or at the quota, after the usual two counts (task-024).
  const stopped = (['cap reached', 'quota exhausted'] as const)
    .filter((outcome) => ended(outcome) > 0)
    .map((outcome) => `, ${ended(outcome)} ${outcome}`)
    .join('');
  io.stdout(`${count(ended('completed'), 'run')} completed, ${ended('failed')} failed${stopped}\n`);
  if (summary.outcome !== 'completed') io.stdout(`campaign ended: ${summary.outcome}\n`);
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
