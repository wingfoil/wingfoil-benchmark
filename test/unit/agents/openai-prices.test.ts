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

  it('gives every price a source', () => {
    expect(Object.keys(OPENAI_PRICE_SOURCES).sort()).toEqual(Object.keys(OPENAI_PRICES).sort());
  });
});
