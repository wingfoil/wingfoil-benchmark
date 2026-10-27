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

/**
 * What the Codex credential may serve (dl-024, widened by dl-025, REQ-RUN-15 as amended in 1.37): per campaign preset
 * and per dry-run profile, the arms it may run (the baseline among them) and the models (any, when absent), and the
 * decision that allows it.
 */
const ALLOWED = [
  {
    preset: 'presets/baseline-across-agents.yaml',
    profile: 'campaigns/codex-baseline.dry-run.yaml',
    arms: ['baseline'],
    models: undefined,
    decision: 'dl-024',
  },
  {
    preset: 'presets/harness-vs-docs.yaml',
    profile: 'campaigns/codex-terra-harness-vs-docs.dry-run.yaml',
    arms: ['baseline', 'baseline-docs', 'wingfoil'],
    models: ['gpt-5.6-terra'],
    decision: 'dl-025',
  },
] as const;

/**
 * Dry-run profiles the credential may serve with no campaign of theirs (dl-027): the step-A spike's (task-107), its
 * one arm on Terra. Apart from {@link ALLOWED}, whose entries a campaign is matched against by its preset.
 */
/** What a dry-run profile lets the credential serve. */
interface DryRunScope {
  readonly profile: string;
  readonly arms: readonly string[];
  readonly models: readonly string[] | undefined;
  readonly decision: string;
}

const DRY_RUN_ONLY: readonly DryRunScope[] = [
  {
    profile: 'campaigns/wingfoil-step-a-spike.dry-run.yaml',
    arms: ['wingfoil-step-a-spike'],
    models: ['gpt-5.6-terra'],
    decision: 'dl-027',
  },
];

/** The decisions, as a refusal names them: a campaign's, and a dry run's (which dl-027's spike widens). */
const DECISIONS = 'dl-024, dl-025';
const DRY_RUN_DECISIONS = 'dl-024, dl-025, dl-027';

/**
 * What a campaign or a dry run asks of the agent: its name and, for a campaign, the preset it extends, its arms and
 * models; for a dry run, its one arm, its profile (relative to the repository) and its model.
 */
export type CodexScopeInput =
  | {
      readonly agent: string;
      readonly preset?: string;
      readonly arms: readonly string[];
      readonly models: readonly string[];
    }
  | { readonly agent: string; readonly dryRunArm: string; readonly profile: string; readonly model: string };

/**
 * dl-024's scope as dl-025 widens it, checked before any Codex session (REQ-RUN-15 as amended in 1.35 and 1.37): no
 * session after {@link CODEX_SCOPE_END}; a campaign extends one of {@link ALLOWED}'s presets and runs its arms and
 * models only; a dry run reads one of their profiles, of one of its arms on one of its models. Nothing for another
 * agent.
 */
export function codexScopeIssues(input: CodexScopeInput, now: number): Issue[] {
  if (input.agent !== 'codex') return [];
  if (now >= OUT_OF_SCOPE_FROM) {
    return [
      { path: 'agent', message: `codex's credential is in scope until ${CODEX_SCOPE_END} only (dl-024)` },
    ];
  }
  const armsOf = (allowed: { readonly arms: readonly string[] }) => allowed.arms.join(', ');
  if ('dryRunArm' in input) {
    const profilesAllowed: readonly DryRunScope[] = [...ALLOWED, ...DRY_RUN_ONLY];
    const allowed = profilesAllowed.find((one) => one.profile === input.profile);
    if (allowed === undefined) {
      const profiles = profilesAllowed.map((one) => one.profile).join(' or ');
      return [{ path: 'profile', message: `a codex dry run reads ${profiles} (${DRY_RUN_DECISIONS})` }];
    }
    if (!(allowed.arms as readonly string[]).includes(input.dryRunArm)) {
      return [
        {
          path: 'arm',
          message: `a codex dry run of ${allowed.profile} runs ${armsOf(allowed)} only (${allowed.decision})`,
        },
      ];
    }
    if (allowed.models !== undefined && !(allowed.models as readonly string[]).includes(input.model)) {
      return [
        {
          path: 'model',
          message: `a codex dry run of ${allowed.profile} runs ${allowed.models.join(', ')} only (${allowed.decision})`,
        },
      ];
    }
    return [];
  }
  const allowed = ALLOWED.find((one) => one.preset === input.preset);
  if (allowed === undefined) {
    const presets = ALLOWED.map((one) => one.preset).join(' or ');
    return [{ path: 'extends', message: `a codex campaign must extend ${presets} (${DECISIONS})` }];
  }
  if (
    !input.arms.includes('baseline') ||
    !input.arms.every((arm) => (allowed.arms as readonly string[]).includes(arm))
  ) {
    return [
      {
        path: 'arms',
        message: `a codex campaign of ${allowed.preset} runs ${armsOf(allowed)} only (${allowed.decision})`,
      },
    ];
  }
  if (
    allowed.models !== undefined &&
    !input.models.every((model) => (allowed.models as readonly string[]).includes(model))
  ) {
    return [
      {
        path: 'models',
        message: `a codex campaign of ${allowed.preset} runs ${allowed.models.join(', ')} only (${allowed.decision})`,
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
