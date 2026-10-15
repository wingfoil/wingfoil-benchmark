import { describe, expect, it } from 'vitest';

import { campaignSchema, missingEffort } from '../../../src/core/campaign.js';
import { completeCampaignYaml } from '../../support/campaign-fixture.js';

/** A complete campaign with `agent` replaced. */
function withAgent(agent: Record<string, unknown>) {
  return campaignSchema.safeParse({ ...completeCampaignYaml(), agent });
}

describe("the campaign's agent (REQ-FMT-01, REQ-RUN-16 as amended in 1.32)", () => {
  it("accepts codex, with Codex's effort levels", () => {
    const parsed = withAgent({
      name: 'codex',
      version: '0.162.1',
      effort: { 'gpt-6.1-sol': 'medium', 'gpt-6-astra': 'ultra', 'gpt-6-luna': 'minimal', 'gpt-5.5': 'none' },
    });
    expect(parsed.success).toBe(true);
  });

  it('refuses a level Codex does not take, naming the model', () => {
    const parsed = withAgent({ name: 'codex', version: '0.162.1', effort: { 'gpt-6.1-sol': 'persistent' } });

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain('gpt-6.1-sol');
  });

  it('refuses a Codex level for claude-code, whose levels are unchanged', () => {
    expect(
      withAgent({ name: 'claude-code', version: '2.1.300', effort: { 'claude-sonnet-5-5': 'ultra' } })
        .success,
    ).toBe(false);
    expect(
      withAgent({ name: 'claude-code', version: '2.1.300', effort: { 'claude-sonnet-5-5': 'max' } }).success,
    ).toBe(true);
  });

  it('asks Codex, as a real agent, for an effort on every model it runs', () => {
    expect(missingEffort({ name: 'codex', version: '0.162.1' }, ['gpt-6.1-sol'])).toEqual(['gpt-6.1-sol']);
    expect(
      missingEffort({ name: 'codex', version: '0.162.1', effort: { 'gpt-6.1-sol': 'medium' } }, [
        'gpt-6.1-sol',
      ]),
    ).toEqual([]);
  });
});
