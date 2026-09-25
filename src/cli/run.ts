import { dirname } from 'node:path';

import { claudeCodeAgent, loadAgentToken, loadFakeScript } from '../agents/index.js';
import type { AgentPort } from '../agents/index.js';
import { fakeAgent } from '../agents/index.js';
import { dockerCli, gitCli, reasonOf, systemProcess } from '../core/index.js';
import type { DockerPort, GitPort, Issue, Result } from '../core/index.js';
import { checkCampaign, runCampaign } from '../runner/index.js';
import type { CheckedCampaign } from '../runner/index.js';

import { parseScenarioArguments, validateScenario } from './scenario.js';

/** Where the command writes its output; the bin passes the process streams, tests capture them. */
export interface Io {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

/** The ports a run uses. Tests pass doubles; the bin passes the real ones (REQ-ARC-04). */
export interface Ports {
  readonly docker: DockerPort;
  readonly git: GitPort;
  readonly agent: AgentPort;
}

/** REQ-CLI exit codes. */
export const EXIT = { ok: 0, failure: 1, usage: 2 } as const;

/**
 * The agent that costs nothing: every other one needs {@link SPENDING_FLAG}. Which agents exist at
 * all is the campaign schema's business (`agent.name` is an enum), so the command no longer keeps a
 * list of its own: adr-001 default 7's refusal is spent now that F2.3 gives `claude-code` an adapter.
 */
const FREE_AGENT = 'fake';

/**
 * Spending stays deliberate until the budget guard exists (F1.3, W5): a campaign with a real agent
 * runs only when whoever runs it says so on the command line.
 */
const SPENDING_FLAG = '--allow-spending';

/** Where the agent's long-lived token is read from (REQ-RUN-15, requirements 1.3). */
const TOKEN_VARIABLE = 'BENCH_AGENT_TOKEN_FILE';

/** The variable the agent reads its credential from. `ANTHROPIC_API_KEY` does not work (task-004). */
const AGENT_TOKEN_VARIABLE = 'ANTHROPIC_AUTH_TOKEN';

/** Where the scripted fake agent reads its script, until W2 records real sessions. */
const FAKE_SCRIPT_VARIABLE = 'BENCH_FAKE_SCRIPT';

/** The local WingFoil clone the WingFoil under test is built from (REQ-RUN-14). */
const WINGFOIL_REPO_VARIABLE = 'BENCH_WINGFOIL_REPO';

const USAGE =
  'usage: bench campaign validate <file>\n' +
  '       bench campaign run <file> [--allow-spending]\n' +
  '       bench scenario validate <id>@<version> [--holdout <path>]\n';
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
  if (verb === 'run') return runCampaignCommand(file, io, ports, allowSpending);
  io.stderr(USAGE);
  return EXIT.usage;
}

/** `bench scenario validate` (REQ-CLI-04), the only scenario command so far. */
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
 * REQ-CLI-03, as far as W2 goes: `bench campaign run <file>` executes the campaign against the
 * scripted fake agent, one session per step (F2.2). The Claude Code adapter arrives with F2.3, and
 * the cost estimate, the warning and the ceiling with F1.2 and F1.3 (W5).
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
  const agentName = spec.agent.name;
  if (agentName !== FREE_AGENT && !allowSpending) {
    io.stderr(
      `campaign: agent '${agentName}' spends real money, up to ${spec.budget.ceiling_eur} EUR; ` +
        `pass ${SPENDING_FLAG} to run it\n`,
    );
    return EXIT.failure;
  }

  // Whenever the agent is not the free one, whoever runs the container needs the credential — with
  // injected ports too, because the container's environment is the runner's business, not the
  // port's. Requiring it only for real ports left the whole credential path untested.
  const credential = agentName === FREE_AGENT ? undefined : agentCredential();
  if (credential !== undefined && !credential.ok) return report(credential.issues, io);
  // A campaign with a WingFoil harness needs the clone it is built from, before anything is built.
  const pinsWingfoil = Object.values(spec.harnesses).some((harness) => harness.tool === 'wingfoil');
  const wingfoilRepo = process.env[WINGFOIL_REPO_VARIABLE];
  if (pinsWingfoil && (wingfoilRepo === undefined || wingfoilRepo === '')) {
    return report(
      [
        {
          path: WINGFOIL_REPO_VARIABLE,
          message: 'is not set: it names the local WingFoil clone the WingFoil under test is built from',
        },
      ],
      io,
    );
  }

  const resolved = ports
    ? { ok: true as const, value: ports }
    : realPorts(checked.value, credential?.ok === true ? credential.value : undefined);
  if (!resolved.ok) return report(resolved.issues, io);

  let summary;
  try {
    summary = await runCampaign(checked.value, {
      ...resolved.value,
      ...(pinsWingfoil && wingfoilRepo !== undefined ? { harnessSources: { wingfoil: wingfoilRepo } } : {}),
      log: (line) => io.stdout(`${line}\n`),
      logError: (line) => io.stderr(`${line}\n`),
      // The credential reaches the container here and nowhere else (REQ-RUN-15, REQ-NFR-01), and
      // the values to scrub are named rather than taken from the whole environment.
      ...(credential?.ok === true
        ? { containerEnv: credential.value, secrets: Object.values(credential.value) }
        : {}),
    });
  } catch (error) {
    // The campaign could not start at all: no Docker daemon, no results directory, no image.
    return report([{ path: 'campaign', message: reasonOf(error) }], io);
  }
  const failed = summary.runs.filter((run) => run.outcome === 'failed').length;
  io.stdout(`${count(summary.runs.length - failed, 'run')} completed, ${failed} failed\n`);
  return summary.completed ? EXIT.ok : EXIT.failure;
}

/**
 * The real ports for this campaign. The campaign is already checked by the time this runs, so the
 * agent is chosen by what it pins and is given the currency rate it needs to report a cost. A
 * campaign with a real agent brings its credential, which the adapter keeps only in order to scrub
 * it out of what is stored (REQ-NFR-01).
 */
export function realPorts(
  campaign: CheckedCampaign,
  credential?: Readonly<Record<string, string>>,
): Result<Ports> {
  const usdToEur = campaign.campaign.spec.currency.usd_to_eur;
  const name = campaign.campaign.spec.agent.name;
  // Exhaustive over the campaign schema's enum on purpose: adding an agent there without an adapter
  // here is a build error, rather than a run that quietly gets Claude Code's command line.
  if (name === 'claude-code') {
    return {
      ok: true,
      value: {
        docker: dockerCli(systemProcess),
        git: gitCli(systemProcess),
        agent: claudeCodeAgent({ token: credential?.[AGENT_TOKEN_VARIABLE] ?? '', usdToEur }),
      },
    };
  }
  name satisfies typeof FREE_AGENT;
  const script = process.env[FAKE_SCRIPT_VARIABLE];
  if (script === undefined) {
    return {
      ok: false,
      issues: [{ path: FAKE_SCRIPT_VARIABLE, message: "is not set: it holds the fake agent's script" }],
    };
  }
  const loaded = loadFakeScript(script);
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    value: {
      docker: dockerCli(systemProcess),
      git: gitCli(systemProcess),
      agent: fakeAgent(loaded.value, { dir: dirname(script), usdToEur }),
    },
  };
}

/**
 * The agent's credential (REQ-RUN-15): the long-lived token, read from the file the operator names
 * and stripped of the whitespace a paste leaves behind, before any container is created.
 */
export function agentCredential(): Result<Readonly<Record<string, string>>> {
  const file = process.env[TOKEN_VARIABLE];
  if (file === undefined || file === '') {
    return {
      ok: false,
      issues: [{ path: TOKEN_VARIABLE, message: "is not set: it names the file holding the agent's token" }],
    };
  }
  const token = loadAgentToken(file);
  if (!token.ok) return token;
  return { ok: true, value: { [AGENT_TOKEN_VARIABLE]: token.value } };
}

function report(issues: readonly Issue[], io: Io): number {
  io.stderr(issues.map((issue) => `${issue.path}: ${issue.message}\n`).join(''));
  return EXIT.failure;
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
