import { readFileSync, realpathSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  claudeCodeAgent,
  codexAgent,
  codexSecrets,
  loadAgentToken,
  loadFakeScript,
} from '../agents/index.js';
import type { AgentPort } from '../agents/index.js';
import { fakeAgent } from '../agents/index.js';
import { dockerCli, gitCli, systemProcess } from '../core/index.js';
import type { DockerPort, GitPort, ImagePort, Issue, PublishPort, Result } from '../core/index.js';
import type { RunPins } from '../runner/index.js';

import {
  CODEX_AUTH_VARIABLE,
  codexAuthFile,
  FAKE_SCRIPT_VARIABLE,
  HARNESS_SOURCE_VARIABLES,
  PURPOSES,
  TOKEN_VARIABLE,
} from './preflight.js';

/** Where the command writes its output; the bin passes the process streams, tests capture them. */
export interface Io {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  /**
   * Ask the maintainer `question` and return the answer; present only when there is a terminal to ask
   * on (task-023). Without it, nothing that needs a confirmation starts.
   */
  readonly ask?: (question: string) => Promise<string>;
}

/** The ports a run uses. Tests pass doubles; the bin passes the real ones (REQ-ARC-04). */
export interface Ports {
  readonly docker: DockerPort;
  readonly git: GitPort;
  readonly agent: AgentPort;
  /** Publishing's git and visibility probe (task-047); the system's when not given. */
  readonly publish?: PublishPort;
  /** The host's images, for `bench images prune` (task-061); the system's when not given. */
  readonly images?: ImagePort;
}

/** The command line's usage, printed on `--help` and on a usage error. */
export const USAGE =
  'usage: bench campaign validate <file>\n' +
  '       bench campaign estimate <file>\n' +
  '       bench campaign run <file> [--resume <campaign-id>/<n>] [--allow-spending]\n' +
  '       bench campaign compare <campaign-id>/<n> <campaign-id>/<n>\n' +
  '       bench scenario validate <id>@<version> [--holdout <path>]\n' +
  '       bench scenario dry-run <id>@<version> --arm <arm> [--model <id>] [--profile <file>] [--allow-spending]\n' +
  '       bench score <campaign-id>/<n>|dry-runs/<n> [--final] [--holdout <path>]\n' +
  '       bench run show <run> [--full]\n' +
  '       bench run compare <run> <run>\n' +
  '       bench finding <campaign-id>/<n> --scenario <id>@<version> --metric <metric> --arms <arm>,… --as bug|decision-log\n' +
  '       bench site build <campaign-id>/<n>\n' +
  '       bench site publish [--remote <name>]\n' +
  '       bench transcripts pack <campaign-id>/<n>\n' +
  '       bench images prune [--dry-run]\n';

/** REQ-CLI exit codes. */
export const EXIT = { ok: 0, failure: 1, usage: 2 } as const;

/**
 * The agent that costs nothing: every other one needs {@link SPENDING_FLAG}. Which agents exist at
 * all is the campaign schema's business (`agent.name` is an enum), so the command no longer keeps a
 * list of its own: adr-001 default 7's refusal is spent now that F2.3 gives `claude-code` an adapter.
 */
export const FREE_AGENT = 'fake';

/**
 * Spending stays deliberate: a campaign or a dry run with a real agent runs only when whoever runs it
 * says so on the command line. The budget guard (F1.3) adds to it, and does not replace it (W5
 * plan-phase decision 5).
 */
export const SPENDING_FLAG = '--allow-spending';

/** The variable the agent reads its credential from. `ANTHROPIC_API_KEY` does not work (task-004). */
const AGENT_TOKEN_VARIABLE = 'ANTHROPIC_AUTH_TOKEN';

/**
 * The real ports for what `pins` pins — a campaign or a dry run, already checked — so the agent is
 * chosen by what it pins and is given the currency rate it needs to report a cost. A real agent
 * brings its credential, which the adapter keeps only in order to scrub it out of what is stored
 * (REQ-NFR-01).
 */
export function portsFor(
  pins: RunPins,
  credential?: Readonly<Record<string, string>>,
  credentialFile?: string,
): Result<Ports> {
  const usdToEur = pins.currency.usd_to_eur;
  const name = pins.agent.name;
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
  if (name === 'codex') {
    // Its credential is a file the runner mounts (dl-019); the adapter reads it only to scrub its values.
    if (credentialFile === undefined) {
      return {
        ok: false,
        issues: [
          { path: CODEX_AUTH_VARIABLE, message: `is not set: ${PURPOSES[CODEX_AUTH_VARIABLE] ?? ''}` },
        ],
      };
    }
    return {
      ok: true,
      value: {
        docker: dockerCli(systemProcess),
        git: gitCli(systemProcess),
        agent: codexAgent({ authFile: credentialFile, usdToEur }),
      },
    };
  }
  name satisfies typeof FREE_AGENT;
  const script = process.env[FAKE_SCRIPT_VARIABLE];
  if (script === undefined) {
    return {
      ok: false,
      issues: [
        { path: FAKE_SCRIPT_VARIABLE, message: `is not set: ${PURPOSES[FAKE_SCRIPT_VARIABLE] ?? ''}` },
      ],
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

/** What an execution that may spend needs before anything is built, besides its ports. */
export interface Spending {
  /** The agent's credential in the environment, for Claude Code (REQ-RUN-15). */
  readonly credential?: Readonly<Record<string, string>>;
  /** The agent's credential as a file the runner mounts, for Codex (dl-019, REQ-RUN-15 as amended in 1.32). */
  readonly credentialFile?: string;
  /** The values to scrub from what is stored, when they are not the environment credential's (REQ-NFR-01). */
  readonly secrets?: readonly string[];
  /** The local clone of each harness tool the execution builds (REQ-RUN-14). */
  readonly harnessSources?: Readonly<Record<string, string>>;
}

/**
 * The checks every command that runs the agent makes before anything is built, in order (task-021,
 * W5 plan-phase decision 5): a real agent only with {@link SPENDING_FLAG} — `refusal` says what is
 * refused and up to what — then its credential, then the clone of each harness tool it builds. Whenever the agent is not the free one, the credential is required — with injected ports
 * too, because the container's environment is the runner's business, not the port's; requiring it
 * only for real ports left the whole credential path untested. Since task-060, `campaign run`'s preflight refuses a
 * missing credential or clone first; these checks stay as the second line of defence, and as `scenario dry-run`'s.
 */
export function checkSpending(
  pins: RunPins,
  options: { readonly allowSpending: boolean; readonly builds: readonly string[]; readonly refusal: Issue },
): Result<Spending> {
  const agentName = pins.agent.name;
  if (agentName !== FREE_AGENT && !options.allowSpending) return { ok: false, issues: [options.refusal] };
  if (agentName === 'codex') {
    const file = codexCredentialFile();
    if (!file.ok) return file;
    // dl-019 bound 6: a credential with nothing to scrub (the placeholder before the login) is refused.
    const secrets = codexSecrets(readFileSync(file.value, 'utf8'));
    if (secrets.length === 0) {
      return {
        ok: false,
        issues: [
          { path: CODEX_AUTH_VARIABLE, message: 'holds no credential value: log in first (dl-019 bound 3)' },
        ],
      };
    }
    const sources = harnessSourcesOf(options.builds);
    if (!sources.ok) return sources;
    return {
      ok: true,
      value: {
        credentialFile: file.value,
        secrets,
        ...(Object.keys(sources.value).length === 0 ? {} : { harnessSources: sources.value }),
      },
    };
  }
  const credential = agentName === FREE_AGENT ? undefined : agentCredential();
  if (credential !== undefined && !credential.ok) return credential;
  const sources = harnessSourcesOf(options.builds);
  if (!sources.ok) return sources;
  return {
    ok: true,
    value: {
      ...(credential === undefined ? {} : { credential: credential.value }),
      ...(Object.keys(sources.value).length === 0 ? {} : { harnessSources: sources.value }),
    },
  };
}

/** The clone of every harness tool the execution builds (REQ-RUN-14, REQ-FMT-12), by the preflight's table. */
function harnessSourcesOf(builds: readonly string[]): Result<Readonly<Record<string, string>>> {
  const sources: Record<string, string> = {};
  for (const tool of [...new Set(builds)].sort()) {
    const variable = (HARNESS_SOURCE_VARIABLES as Readonly<Record<string, string | undefined>>)[tool];
    if (variable === undefined) continue;
    const clone = process.env[variable];
    if (clone === undefined || clone === '') {
      return { ok: false, issues: [{ path: variable, message: `is not set: ${PURPOSES[variable] ?? ''}` }] };
    }
    sources[tool] = clone;
  }
  return { ok: true, value: sources };
}

/** Codex's credential file (dl-019), checked as the preflight checks it; its content is not read here. */
function codexCredentialFile(): Result<string> {
  const file = process.env[CODEX_AUTH_VARIABLE];
  if (file === undefined || file === '') {
    return {
      ok: false,
      issues: [{ path: CODEX_AUTH_VARIABLE, message: `is not set: ${PURPOSES[CODEX_AUTH_VARIABLE] ?? ''}` }],
    };
  }
  const problem = codexAuthFile(file);
  // The real path: what Docker mounts (an absolute source) and what its inspection reports for the mount check.
  return problem === undefined
    ? { ok: true, value: realpathSync(file) }
    : { ok: false, issues: [{ path: CODEX_AUTH_VARIABLE, message: `is invalid: ${problem}` }] };
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
      issues: [{ path: TOKEN_VARIABLE, message: `is not set: ${PURPOSES[TOKEN_VARIABLE] ?? ''}` }],
    };
  }
  const token = loadAgentToken(file);
  if (!token.ok) return token;
  return { ok: true, value: { [AGENT_TOKEN_VARIABLE]: token.value } };
}

export function report(issues: readonly Issue[], io: Io): number {
  io.stderr(issues.map((issue) => `${issue.path}: ${issue.message}\n`).join(''));
  return EXIT.failure;
}

export function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** What a command prints when the maintainer interrupts an execution (REQ-RUN-19, task-079). */
export const INTERRUPT_LINE = "interrupt: stopping after the current step's agent is killed";

/**
 * Run `work` with the maintainer's interrupt (REQ-RUN-19, task-079): the first SIGINT or SIGTERM aborts the signal
 * `work` is given, which stops the execution cleanly, and removes both listeners, so that a second signal of either
 * kind gets Node's own handling and ends the process at once, should the clean stop hang. Both are removed when `work`
 * settles too.
 */
export async function withInterrupt<T>(io: Io, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const stop = () => {
    // Both listeners go with the first signal, whichever it is: the next one ends the process.
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    io.stdout(`${INTERRUPT_LINE}\n`);
    controller.abort();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    return await work(controller.signal);
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}
