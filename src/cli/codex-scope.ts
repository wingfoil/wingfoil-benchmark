import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

import { codexMcpServers } from '../agents/index.js';
import type { Issue } from '../core/index.js';

/**
 * dl-024: the last day the Codex credential may serve a session (the ChatGPT Plus subscription's end), inclusive, as a
 * UTC date. REQ-RUN-15 as amended in 1.35.
 */
export const CODEX_SCOPE_END = '2026-11-13';

/** The first instant out of scope: the day after {@link CODEX_SCOPE_END}, at 00:00 UTC. */
const OUT_OF_SCOPE_FROM = Date.parse(`${CODEX_SCOPE_END}T00:00:00Z`) + 24 * 60 * 60 * 1000;

/** What the Codex credential may serve under one decision. */
interface Allowed {
  /** The campaign file it is kept to, relative to the repository; absent when any file extending the preset is. */
  readonly campaign?: string;
  readonly preset: string;
  readonly profile: string;
  readonly arms: readonly string[];
  /** The models it may run; any, when absent. */
  readonly models?: readonly string[];
  readonly decision: string;
}

/**
 * What the Codex credential may serve (dl-024, widened by dl-025, dl-027 and dl-028; REQ-RUN-15 as amended in 1.37 and
 * 1.41): per campaign preset, or per campaign file, and per dry-run profile, the arms it may run (the baseline among
 * them) and the models, and the decisions that allow it.
 */
const ALLOWED: readonly Allowed[] = [
  {
    preset: 'presets/baseline-across-agents.yaml',
    profile: 'campaigns/codex-baseline.dry-run.yaml',
    arms: ['baseline'],
    decision: 'dl-024',
  },
  {
    preset: 'presets/harness-vs-docs.yaml',
    profile: 'campaigns/codex-terra-harness-vs-docs.dry-run.yaml',
    arms: ['baseline', 'baseline-docs', 'wingfoil'],
    models: ['gpt-5.6-terra'],
    decision: 'dl-025',
  },
  {
    // campaign-007: the step-A arms on Terra, with gpt-6.1-terra's slice (task-114).
    campaign: 'campaigns/codex-terra-step-a.yaml',
    preset: 'presets/harness-vs-docs.yaml',
    profile: 'campaigns/codex-terra-step-a.dry-run.yaml',
    arms: ['baseline', 'baseline-docs', 'wingfoil'],
    models: ['gpt-5.6-terra', 'gpt-6.1-terra'],
    decision: 'dl-027, dl-028',
  },
];

/** The decisions, as a refusal names them. */
const DECISIONS = [...new Set(ALLOWED.flatMap((one) => one.decision.split(', ')))].join(', ');

/** Each of {@link ALLOWED}'s values once, in order, joined with "or". */
function either(values: readonly string[]): string {
  return [...new Set(values)].join(' or ');
}

/**
 * What a campaign or a dry run asks of the agent: its name and, for a campaign, the preset it extends, its arms and
 * models; for a dry run, its one arm, its profile (relative to the repository) and its model.
 */
export type CodexScopeInput =
  | {
      readonly agent: string;
      /** The campaign file, relative to the repository. */
      readonly campaign?: string;
      readonly preset?: string;
      readonly arms: readonly string[];
      readonly models: readonly string[];
    }
  | { readonly agent: string; readonly dryRunArm: string; readonly profile: string; readonly model: string };

/**
 * dl-024's scope as dl-025, dl-027 and dl-028 widen it, checked before any Codex session (REQ-RUN-15 as amended in 1.35,
 * 1.37 and 1.41): no
 * session after {@link CODEX_SCOPE_END}; a campaign extends one of {@link ALLOWED}'s presets and runs its arms and
 * models only, those of the entry kept to its file when one is; a dry run reads one of their profiles, of one of its arms on one of its models. Nothing for another
 * agent.
 */
export function codexScopeIssues(input: CodexScopeInput, now: number): Issue[] {
  if (input.agent !== 'codex') return [];
  if (now >= OUT_OF_SCOPE_FROM) {
    return [
      { path: 'agent', message: `codex's credential is in scope until ${CODEX_SCOPE_END} only (dl-024)` },
    ];
  }
  const armsOf = (allowed: Allowed) => allowed.arms.join(', ');
  if ('dryRunArm' in input) {
    const allowed = ALLOWED.find((one) => one.profile === input.profile);
    if (allowed === undefined) {
      const profiles = either(ALLOWED.map((one) => one.profile));
      return [{ path: 'profile', message: `a codex dry run reads ${profiles} (${DECISIONS})` }];
    }
    if (!allowed.arms.includes(input.dryRunArm)) {
      return [
        {
          path: 'arm',
          message: `a codex dry run of ${allowed.profile} runs ${armsOf(allowed)} only (${allowed.decision})`,
        },
      ];
    }
    if (allowed.models !== undefined && !allowed.models.includes(input.model)) {
      return [
        {
          path: 'model',
          message: `a codex dry run of ${allowed.profile} runs ${allowed.models.join(', ')} only (${allowed.decision})`,
        },
      ];
    }
    return [];
  }
  // A campaign file an entry is kept to reads that entry; any other file extending its preset, the preset's own.
  const allowed =
    ALLOWED.find(
      (one) => one.campaign !== undefined && one.campaign === input.campaign && one.preset === input.preset,
    ) ?? ALLOWED.find((one) => one.campaign === undefined && one.preset === input.preset);
  if (allowed === undefined) {
    const presets = either(ALLOWED.map((one) => one.preset));
    return [{ path: 'extends', message: `a codex campaign must extend ${presets} (${DECISIONS})` }];
  }
  if (!input.arms.includes('baseline') || !input.arms.every((arm) => allowed.arms.includes(arm))) {
    return [
      {
        path: 'arms',
        message: `a codex campaign of ${allowed.campaign ?? allowed.preset} runs ${armsOf(allowed)} only (${allowed.decision})`,
      },
    ];
  }
  if (
    allowed.models !== undefined &&
    !input.models.every((model) => allowed.models?.includes(model) === true)
  ) {
    return [
      {
        path: 'models',
        message: `a codex campaign of ${allowed.campaign ?? allowed.preset} runs ${allowed.models.join(', ')} only (${allowed.decision})`,
      },
    ];
  }
  return [];
}

/**
 * The arms' MCP servers Codex is given (REQ-RUN-15 as amended in 1.37), rendered before anything is built: an arm whose
 * `mcp.json` Codex cannot be given is refused before the run, naming its file. Nothing for another agent.
 */
export function codexMcpIssues(
  agent: string,
  arms: readonly { readonly mcpPath?: string }[],
  root: string,
): Issue[] {
  if (agent !== 'codex') return [];
  return arms.flatMap((arm) => {
    if (arm.mcpPath === undefined) return [];
    try {
      codexMcpServers(JSON.parse(readFileSync(arm.mcpPath, 'utf8')) as unknown);
      return [];
    } catch (error) {
      return [{ path: relative(root, arm.mcpPath), message: (error as Error).message }];
    }
  });
}
