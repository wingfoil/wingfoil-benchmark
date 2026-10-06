import { accessSync, constants, existsSync, statSync } from 'node:fs';

import type { Issue } from '../core/index.js';
import type { CheckedCampaign } from '../runner/index.js';
import { checkHoldoutRoot } from '../scenario/index.js';

/** Where the agent's long-lived token is read from (REQ-RUN-15, requirements 1.3). */
export const TOKEN_VARIABLE = 'BENCH_AGENT_TOKEN_FILE';

/** Where the scripted fake agent reads its script. */
export const FAKE_SCRIPT_VARIABLE = 'BENCH_FAKE_SCRIPT';

/** Where scoring finds the hold-out when no `--holdout` is given (REQ-CLI-10). */
export const HOLDOUT_VARIABLE = 'BENCH_HOLDOUT_PATH';

/**
 * The local clone each harness tool is built from (REQ-RUN-14), by tool. The preflight and the spending checks read
 * this one table, so that they cannot name different variables; v0.1 builds WingFoil only, and each competitor arm
 * adds its row. A tool without a row is not listed by the preflight (its build then fails on its own), so a new
 * harness arm adds its row with its builder: test/unit/cli/preflight.test.ts pins the table.
 */
export const HARNESS_SOURCE_VARIABLES = { wingfoil: 'BENCH_WINGFOIL_REPO' } as const;

/** The variable of `tool`'s clone, if this runner builds it. */
function harnessSourceVariable(tool: string): string | undefined {
  return (HARNESS_SOURCE_VARIABLES as Readonly<Record<string, string | undefined>>)[tool];
}

/** One thing a campaign's runs need from the machine they run on (bug-014, task-060). */
export interface Requirement {
  readonly variable: string;
  /** What the variable names, as a maintainer reads it. */
  readonly kind: string;
  /** The command that cannot work without it. */
  readonly neededBy: 'run' | 'score';
  readonly state: 'set' | 'missing' | 'invalid';
  /** Why a set variable is invalid: a path and what is wrong with it, never a file's content. */
  readonly problem?: string;
}

type Check = (path: string) => string | undefined;

const readableFile: Check = (path) => {
  try {
    if (!statSync(path).isFile()) return `${path} is not a readable file`;
    accessSync(path, constants.R_OK);
    return undefined;
  } catch {
    return existsSync(path) ? `${path} is not a readable file` : `${path} does not exist`;
  }
};

const directory: Check = (path) =>
  !existsSync(path)
    ? `${path} does not exist`
    : statSync(path).isDirectory()
      ? undefined
      : `${path} is not a directory`;

const holdoutRoot: Check = (path) => {
  const checked = checkHoldoutRoot(path);
  return checked.ok ? undefined : checked.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ');
};

function requirement(
  env: NodeJS.ProcessEnv,
  variable: string,
  kind: string,
  neededBy: Requirement['neededBy'],
  check: Check,
): Requirement {
  const value = env[variable];
  if (value === undefined || value === '') return { variable, kind, neededBy, state: 'missing' };
  const problem = check(value);
  return problem === undefined
    ? { variable, kind, neededBy, state: 'set' }
    : { variable, kind, neededBy, state: 'invalid', problem };
}

/**
 * What the runs of `campaign` need from the machine, and whether `env` provides it (bug-014): the agent's credential
 * file (or the fake agent's script), the clone of each pinned harness tool, and the hold-out when a scenario declares
 * one. In that order; a set variable is checked for the kind of path it must name.
 */
export function campaignRequirements(
  campaign: CheckedCampaign,
  env: NodeJS.ProcessEnv = process.env,
): Requirement[] {
  const spec = campaign.campaign.spec;
  const requirements =
    spec.agent.name === 'fake'
      ? [requirement(env, FAKE_SCRIPT_VARIABLE, 'fake agent script', 'run', readableFile)]
      : [requirement(env, TOKEN_VARIABLE, 'credential file', 'run', readableFile)];
  const tools = [...new Set(Object.values(spec.harnesses).map((harness) => harness.tool))];
  for (const tool of tools) {
    const variable = harnessSourceVariable(tool);
    if (variable !== undefined)
      requirements.push(requirement(env, variable, `harness clone of ${tool}`, 'run', directory));
  }
  if (campaign.scenarios.some((scenario) => scenario.holdout))
    requirements.push(requirement(env, HOLDOUT_VARIABLE, 'hold-out', 'score', holdoutRoot));
  return requirements;
}

/** What each variable is for, as a refusal explains it. */
export const PURPOSES: Readonly<Record<string, string>> = {
  [TOKEN_VARIABLE]: "it names the file holding the agent's token",
  [FAKE_SCRIPT_VARIABLE]: "it holds the fake agent's script",
  [HARNESS_SOURCE_VARIABLES.wingfoil]:
    'it names the local WingFoil clone the WingFoil under test is built from',
  [HOLDOUT_VARIABLE]: 'it names the hold-out scoring reads',
};

/** The refusal of an unmet requirement: `is not set: <purpose>`, or `is invalid: <problem>`. */
export function refusalOf(r: Requirement): Issue {
  const message =
    r.state === 'invalid'
      ? `is invalid: ${r.problem ?? ''}`
      : `is not set: ${PURPOSES[r.variable] ?? `it names the ${r.kind}`}`;
  return { path: r.variable, message };
}

/** A requirement as `campaign validate` prints it. */
export function formatRequirement(r: Requirement): string {
  const state = r.state === 'invalid' ? `invalid, ${r.problem ?? ''}` : r.state;
  return `requires ${r.variable} (${r.kind}, for ${r.neededBy}): ${state}`;
}
