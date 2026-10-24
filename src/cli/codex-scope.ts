import type { Issue } from '../core/index.js';

/**
 * dl-024: the last day the Codex credential may serve a session (the ChatGPT Plus subscription's end), inclusive, as a
 * UTC date. REQ-RUN-15 as amended in 1.35.
 */
export const CODEX_SCOPE_END = '2026-11-13';

/** The first instant out of scope: the day after {@link CODEX_SCOPE_END}, at 00:00 UTC. */
const OUT_OF_SCOPE_FROM = Date.parse(`${CODEX_SCOPE_END}T00:00:00Z`) + 24 * 60 * 60 * 1000;

/** The one preset a Codex campaign may extend (dl-022, dl-024). */
const CODEX_PRESET = 'presets/baseline-across-agents.yaml';

/**
 * What a campaign or a dry run asks of the agent: its name and, for a campaign, the preset it extends and its arms; for
 * a dry run, its one arm.
 */
export type CodexScopeInput =
  | { readonly agent: string; readonly preset?: string; readonly arms: readonly string[] }
  | { readonly agent: string; readonly dryRunArm: string };

/**
 * dl-024's scope, checked before any Codex session (REQ-RUN-15 as amended in 1.35): no session after
 * {@link CODEX_SCOPE_END}; a campaign extends `presets/baseline-across-agents.yaml` and runs the baseline arm only; a
 * dry run runs the baseline arm. Nothing for another agent.
 */
export function codexScopeIssues(input: CodexScopeInput, now: number): Issue[] {
  if (input.agent !== 'codex') return [];
  if (now >= OUT_OF_SCOPE_FROM) {
    return [
      { path: 'agent', message: `codex's credential is in scope until ${CODEX_SCOPE_END} only (dl-024)` },
    ];
  }
  if ('dryRunArm' in input) {
    return input.dryRunArm === 'baseline'
      ? []
      : [{ path: 'arm', message: 'a codex dry run runs the baseline arm only (dl-024)' }];
  }
  if (input.preset !== CODEX_PRESET) {
    return [{ path: 'extends', message: `a codex campaign must extend ${CODEX_PRESET} (dl-024)` }];
  }
  if (input.arms.length !== 1 || input.arms[0] !== 'baseline') {
    return [{ path: 'arms', message: 'a codex campaign runs the baseline arm only (dl-024)' }];
  }
  return [];
}
