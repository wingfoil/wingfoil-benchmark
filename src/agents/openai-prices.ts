/**
 * OpenAI's list prices, per million tokens, for the models a `codex` campaign may pin (REQ-RUN-09 as amended in 1.32,
 * task-094). Codex reports tokens and no cost, so the benchmark prices them itself and says so: `costBasis:
 * price-table`. Pinned: a price that changes is a new row with its own source and date, never an edit.
 *
 * Source: `developers.openai.com/api/docs/pricing`, Standard tier, read 2026-10-15 (task-094's F1). The short-context
 * prices only: Codex 0.162.1 gives these models a 272 K context window, the long-context tier's threshold, so a Codex
 * request never reaches it.
 */
export interface OpenAiPrice {
  readonly input: number;
  readonly cachedInput: number;
  readonly cacheWrite: number;
  readonly output: number;
}

export const OPENAI_PRICES_SOURCE = 'developers.openai.com/api/docs/pricing, Standard tier, read 2026-10-15';

export const OPENAI_PRICES: Readonly<Record<string, OpenAiPrice>> = {
  'gpt-6.1-sol': { input: 2.0, cachedInput: 0.1, cacheWrite: 2.5, output: 10.0 },
};
