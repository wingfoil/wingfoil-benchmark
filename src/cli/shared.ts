import { dirname } from 'node:path';

import { claudeCodeAgent, loadAgentToken, loadFakeScript } from '../agents/index.js';
import type { AgentPort } from '../agents/index.js';
import { fakeAgent } from '../agents/index.js';
import { dockerCli, gitCli, systemProcess } from '../core/index.js';
import type { DockerPort, GitPort, Issue, Result } from '../core/index.js';
import type { RunPins } from '../runner/index.js';

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
}

/** The command line's usage, printed on `--help` and on a usage error. */
export const USAGE =
  'usage: bench campaign validate <file>\n' +
  '       bench campaign estimate <file>\n' +
  '       bench campaign run <file> [--allow-spending]\n' +
  '       bench scenario validate <id>@<version> [--holdout <path>]\n' +
  '       bench scenario dry-run <id>@<version> --arm <arm> [--model <id>] [--allow-spending]\n' +
  '       bench score <campaign-id>/<n>|dry-runs/<n> [--holdout <path>]\n' +
  '       bench run show <run> [--full]\n' +
  '       bench run compare <run> <run>\n' +
  '       bench finding <campaign-id>/<n> --scenario <id>@<version> --metric <metric> --arms <arm>,… --as bug|decision-log\n' +
  '       bench site build <campaign-id>/<n>\n';

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

/** Where the agent's long-lived token is read from (REQ-RUN-15, requirements 1.3). */
const TOKEN_VARIABLE = 'BENCH_AGENT_TOKEN_FILE';

/** The variable the agent reads its credential from. `ANTHROPIC_API_KEY` does not work (task-004). */
const AGENT_TOKEN_VARIABLE = 'ANTHROPIC_AUTH_TOKEN';

/** Where the scripted fake agent reads its script, until W2 records real sessions. */
const FAKE_SCRIPT_VARIABLE = 'BENCH_FAKE_SCRIPT';

/** The local WingFoil clone the WingFoil under test is built from (REQ-RUN-14). */
const WINGFOIL_REPO_VARIABLE = 'BENCH_WINGFOIL_REPO';

/**
 * The real ports for what `pins` pins — a campaign or a dry run, already checked — so the agent is
 * chosen by what it pins and is given the currency rate it needs to report a cost. A real agent
 * brings its credential, which the adapter keeps only in order to scrub it out of what is stored
 * (REQ-NFR-01).
 */
export function portsFor(pins: RunPins, credential?: Readonly<Record<string, string>>): Result<Ports> {
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

/** What an execution that may spend needs before anything is built, besides its ports. */
export interface Spending {
  /** The agent's credential, for any agent but the free one (REQ-RUN-15). */
  readonly credential?: Readonly<Record<string, string>>;
  /** The local clone of each harness tool the execution builds (REQ-RUN-14). */
  readonly harnessSources?: Readonly<Record<string, string>>;
}

/**
 * The checks every command that runs the agent makes before anything is built, in order (task-021,
 * W5 plan-phase decision 5): a real agent only with {@link SPENDING_FLAG} — `refusal` says what is
 * refused and up to what — then its credential, then the WingFoil clone when a WingFoil harness is
 * built. Whenever the agent is not the free one, the credential is required — with injected ports
 * too, because the container's environment is the runner's business, not the port's; requiring it
 * only for real ports left the whole credential path untested.
 */
export function checkSpending(
  pins: RunPins,
  options: { readonly allowSpending: boolean; readonly buildsWingfoil: boolean; readonly refusal: Issue },
): Result<Spending> {
  const agentName = pins.agent.name;
  if (agentName !== FREE_AGENT && !options.allowSpending) return { ok: false, issues: [options.refusal] };
  const credential = agentName === FREE_AGENT ? undefined : agentCredential();
  if (credential !== undefined && !credential.ok) return credential;
  const wingfoilRepo = process.env[WINGFOIL_REPO_VARIABLE];
  if (options.buildsWingfoil && (wingfoilRepo === undefined || wingfoilRepo === '')) {
    return {
      ok: false,
      issues: [
        {
          path: WINGFOIL_REPO_VARIABLE,
          message: 'is not set: it names the local WingFoil clone the WingFoil under test is built from',
        },
      ],
    };
  }
  return {
    ok: true,
    value: {
      ...(credential === undefined ? {} : { credential: credential.value }),
      ...(options.buildsWingfoil && wingfoilRepo !== undefined
        ? { harnessSources: { wingfoil: wingfoilRepo } }
        : {}),
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

export function report(issues: readonly Issue[], io: Io): number {
  io.stderr(issues.map((issue) => `${issue.path}: ${issue.message}\n`).join(''));
  return EXIT.failure;
}

export function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
