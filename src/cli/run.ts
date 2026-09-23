import { loadFakeScript } from '../agents/index.js';
import type { AgentPort } from '../agents/index.js';
import { fakeAgent } from '../agents/index.js';
import { dockerCli, gitCli, systemProcess } from '../core/index.js';
import type { DockerPort, GitPort, Issue, Result } from '../core/index.js';
import { checkCampaign, runCampaign } from '../runner/index.js';

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

/** The agents a run can use today: W2 adds the Claude Code adapter (F2.3). */
const AVAILABLE_AGENTS = ['fake'];

/** Where the scripted fake agent reads its script, until W2 records real sessions. */
const FAKE_SCRIPT_VARIABLE = 'BENCH_FAKE_SCRIPT';

const USAGE = 'usage: bench campaign validate <file>\n       bench campaign run <file>\n';
const HELP_FLAGS = ['--help', '-h'];

/** Run the `bench` command line `argv` (without the executable) and return its exit code. */
export async function main(argv: readonly string[], io: Io, ports?: Ports): Promise<number> {
  if (argv.length === 1 && HELP_FLAGS.includes(argv[0] as string)) {
    io.stdout(USAGE);
    return EXIT.ok;
  }
  const [noun, verb, file, ...extra] = argv;
  if (noun !== 'campaign' || !isFileArgument(file) || extra.length > 0) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  if (verb === 'validate') return validateCampaign(file, io);
  if (verb === 'run') return runCampaignCommand(file, io, ports);
  io.stderr(USAGE);
  return EXIT.usage;
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
 * REQ-CLI-03, as far as W1 goes: `bench campaign run <file>` executes the campaign against the
 * scripted fake agent. The cost estimate, the warning and the ceiling arrive with F1.2 and F1.3 (W5).
 */
async function runCampaignCommand(file: string, io: Io, ports?: Ports): Promise<number> {
  const checked = checkCampaign(file);
  if (!checked.ok) return report(checked.issues, io);

  const agentName = checked.value.campaign.spec.agent.name;
  if (!AVAILABLE_AGENTS.includes(agentName)) {
    io.stderr(`agent '${agentName}' is not available yet: W1 runs the scripted fake agent\n`);
    return EXIT.failure;
  }

  const resolved = ports ? { ok: true as const, value: ports } : realPorts();
  if (!resolved.ok) return report(resolved.issues, io);

  const summary = await runCampaign(checked.value, {
    ...resolved.value,
    log: (line) => io.stdout(`${line}\n`),
    logError: (line) => io.stderr(`${line}\n`),
  });
  const failed = summary.runs.filter((run) => run.outcome === 'failed').length;
  io.stdout(`${count(summary.runs.length - failed, 'run')} completed, ${failed} failed\n`);
  return summary.completed ? EXIT.ok : EXIT.failure;
}

/** The real ports, with the fake agent's script read from the environment. */
export function realPorts(): Result<Ports> {
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
    value: { docker: dockerCli(systemProcess), git: gitCli(systemProcess), agent: fakeAgent(loaded.value) },
  };
}

function report(issues: readonly Issue[], io: Io): number {
  io.stderr(issues.map((issue) => `${issue.path}: ${issue.message}\n`).join(''));
  return EXIT.failure;
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
