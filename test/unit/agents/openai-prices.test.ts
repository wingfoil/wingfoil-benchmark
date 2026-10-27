import { describe, expect, it } from 'vitest';

import { OPENAI_PRICES, OPENAI_PRICE_SOURCES } from '../../../src/agents/index.js';

/** task-102: the Codex campaign's three models (the approver's option A), each with its source and date. */
describe("OpenAI's list prices (REQ-RUN-09 as amended in 1.32)", () => {
  it.each([
    ['gpt-6.1-sol', { input: 2.0, cachedInput: 0.1, cacheWrite: 2.5, output: 10.0 }],
    ['gpt-5.6-terra', { input: 2.0, cachedInput: 0.2, cacheWrite: 2.5, output: 12.0 }],
    ['gpt-6-luna', { input: 0.1, cachedInput: 0.01, cacheWrite: 0.125, output: 0.5 }],
  ])('prices %s at its Standard tier, short context', (model, price) => {
    expect(OPENAI_PRICES[model]).toEqual(price);
    expect(OPENAI_PRICE_SOURCES[model]).toMatch(
      /^developers\.openai\.com\/api\/docs\/pricing, Standard tier, read 2026-10-(15|24)$/,
    );
  });

  // task-110 (dl-028): GPT-6.1 Terra, the Terra of generation 6, and GPT-6 Astra, read on the same page.
  it.each([
    ['gpt-6.1-terra', { input: 1.0, cachedInput: 0.05, cacheWrite: 1.25, output: 5.0 }],
    ['gpt-6-astra', { input: 10.0, cachedInput: 1.0, cacheWrite: 12.5, output: 50.0 }],
  ])('prices %s at its Standard tier, short context, read 2026-10-27', (model, price) => {
    expect(OPENAI_PRICES[model]).toEqual(price);
    expect(OPENAI_PRICE_SOURCES[model]).toBe(
      'developers.openai.com/api/docs/pricing, Standard tier, read 2026-10-27',
    );
  });

  it('holds exactly these five models', () => {
    expect(Object.keys(OPENAI_PRICES).sort()).toEqual([
      'gpt-5.6-terra',
      'gpt-6-astra',
      'gpt-6-luna',
      'gpt-6.1-sol',
      'gpt-6.1-terra',
    ]);
  });

  it('gives every price a source', () => {
    expect(Object.keys(OPENAI_PRICE_SOURCES).sort()).toEqual(Object.keys(OPENAI_PRICES).sort());
  });
});
