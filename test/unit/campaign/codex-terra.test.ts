import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

import { codexScopeIssues } from '../../../src/cli/codex-scope.js';
import { checkCampaign } from '../../../src/runner/index.js';
import type { CampaignFile } from '../../../src/core/index.js';
import { repoPath } from '../../support/paths.js';

/** The models a campaign runs: its default and its slices'. */
function campaignModels(spec: CampaignFile): string[] {
  return [...new Set([spec.models.default, ...(spec.models.slices ?? []).map((slice) => slice.model)])];
}

/** dl-022's arm B as dl-025 allows it (task-105): the campaign file and its dry-run profile. */
describe('the Codex harness-vs-docs campaign on Terra (task-105, characterization)', () => {
  const checked = checkCampaign(repoPath('campaigns/codex-terra-harness-vs-docs.yaml'));

  it('validates, extending harness-vs-docs with the three arms on gpt-5.6-terra, inside dl-025', () => {
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const { spec, extended } = checked.value.campaign;
    expect(extended?.preset).toBe('presets/harness-vs-docs.yaml');
    expect(spec.arms).toEqual(['baseline', 'baseline-docs', 'wingfoil']);
    expect(spec.agent.name).toBe('codex');
    expect(campaignModels(spec)).toEqual(['gpt-5.6-terra']);
    expect(spec.repetitions).toEqual({ S1: 3, S2: 1, S3: 1, S8: 1 });
    expect(
      codexScopeIssues(
        { agent: 'codex', preset: extended?.preset, arms: spec.arms, models: campaignModels(spec) },
        Date.parse('2026-10-25T12:00:00Z'),
      ),
    ).toEqual([]);
  });

  it("gives its dry-run profile the campaign's agent, rate and digests", () => {
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const { spec } = checked.value.campaign;
    const profile = parse(
      readFileSync(repoPath('campaigns/codex-terra-harness-vs-docs.dry-run.yaml'), 'utf8'),
    ) as Record<string, unknown>;
    expect((profile.agent as { name: string }).name).toBe('codex');
    expect(profile.currency).toEqual(spec.currency);
    expect(profile.arm_digests).toEqual(spec.arm_digests);
    expect(profile.harnesses).toEqual(spec.harnesses);
  });
});
