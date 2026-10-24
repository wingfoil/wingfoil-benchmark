import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

import { OPENAI_PRICES } from '../../../src/agents/index.js';
import { checkCampaign } from '../../../src/runner/index.js';
import { repoPath } from '../../support/paths.js';

/** dl-022's Codex baseline campaign (arm A) and its dry-run profile (task-102). */
describe('the Codex baseline campaign files (task-102)', () => {
  const MODELS = ['gpt-6.1-sol', 'gpt-5.6-terra', 'gpt-6-luna'];

  it('validates, extending baseline-across-agents with the baseline arm and the three models at medium', () => {
    const checked = checkCampaign(repoPath('campaigns/codex-baseline.yaml'));
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const { spec, extended } = checked.value.campaign;

    expect(extended?.preset).toBe('presets/baseline-across-agents.yaml');
    expect(spec.arms).toEqual(['baseline']);
    expect(spec.agent).toEqual({
      name: 'codex',
      version: '0.162.1',
      effort: Object.fromEntries(MODELS.map((model) => [model, 'medium'])),
    });
    expect([spec.models.default, ...(spec.models.slices ?? []).map((slice) => slice.model)]).toEqual(MODELS);
    // Every model runs what the default runs: S1 three times, S2, S3 and S8 once (review round 1).
    for (const model of MODELS.slice(1)) {
      const runs = Object.fromEntries(
        (spec.models.slices ?? [])
          .filter((slice) => slice.model === model)
          .flatMap((slice) => slice.scenarios.map((id) => [id, slice.repetitions])),
      );
      expect(runs, model).toEqual(spec.repetitions);
    }
  });

  it('prices every model it runs', () => {
    for (const model of MODELS) expect(OPENAI_PRICES[model], model).toBeDefined();
  });

  it("gives its dry-run profile the campaign's agent, rate and baseline digest", () => {
    const profile = parse(readFileSync(repoPath('campaigns/codex-baseline.dry-run.yaml'), 'utf8')) as Record<
      string,
      unknown
    >;
    const checked = checkCampaign(repoPath('campaigns/codex-baseline.yaml'));
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const { spec } = checked.value.campaign;

    expect(profile.agent).toEqual(spec.agent);
    expect(profile.currency).toEqual(spec.currency);
    expect(profile.arm_digests).toEqual(spec.arm_digests);
  });
});
