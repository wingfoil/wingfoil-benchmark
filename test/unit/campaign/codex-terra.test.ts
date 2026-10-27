import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

import { armDigest } from '../../../src/arms/digest.js';
import { codexScopeIssues } from '../../../src/cli/codex-scope.js';
import { loadDryRunProfile } from '../../../src/scenario/dry-run.js';
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
    // ... and every other pin the estimate's key reads (review round 1)
    expect((profile.agent as { version: string }).version).toBe(spec.agent.version);
    expect((profile.agent as { effort: Record<string, string> }).effort['gpt-5.6-terra']).toBe(
      spec.agent.effort?.['gpt-5.6-terra'],
    );
    expect(profile.caps).toEqual(spec.caps);
    expect(profile.approver_policy).toBe(spec.approver_policy);
  });
});

/** dl-022's arm B rerun on approver policy v2 (task-106, bug-035). */
describe('the Terra campaign on approver policy v2 (task-106, characterization)', () => {
  const v1 = checkCampaign(repoPath('campaigns/codex-terra-harness-vs-docs.yaml'));
  const v2 = checkCampaign(repoPath('campaigns/codex-terra-harness-vs-docs-v2.yaml'));

  it("validates inside dl-025 and differs from campaign-005's file in its approver policy only", () => {
    if (!v1.ok) throw new Error(JSON.stringify(v1.issues));
    if (!v2.ok) throw new Error(JSON.stringify(v2.issues));
    const { spec, extended } = v2.value.campaign;
    expect(spec.approver_policy).toBe('v2');
    expect({ ...spec, approver_policy: 'v1' }).toEqual(v1.value.campaign.spec);
    expect(
      codexScopeIssues(
        { agent: 'codex', preset: extended?.preset, arms: spec.arms, models: campaignModels(spec) },
        Date.parse('2026-10-27T12:00:00Z'),
      ),
    ).toEqual([]);
  });
});

/** campaign-007's dry-run profile (task-114, dl-027 item 4, dl-028): the step-A arms on WingFoil v0.3.1. */
describe("campaign-007's dry-run profile (task-114, characterization)", () => {
  const file = 'campaigns/codex-terra-step-a.dry-run.yaml';

  it('loads, pins WingFoil v0.3.1, approver policy v2 and the step-A arms as the tree has them', () => {
    const loaded = loadDryRunProfile(repoPath(file));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const profile = loaded.value;
    expect(profile.harnesses).toEqual({ wingfoil: { tool: 'wingfoil', version: 'v0.3.1' } });
    expect(profile.agent).toMatchObject({ name: 'codex', version: '0.162.1' });
    expect(profile.approver_policy).toBe('v2');
    for (const arm of ['baseline', 'baseline-docs', 'wingfoil'])
      expect(profile.arm_digests?.[arm], arm).toBe(armDigest(repoPath(''), arm).slice(0, 12));
  });

  it('is accepted by the Codex scope for each arm on gpt-5.6-terra and gpt-6.1-terra, each with its effort', () => {
    const loaded = loadDryRunProfile(repoPath(file));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    for (const model of ['gpt-5.6-terra', 'gpt-6.1-terra']) {
      expect(loaded.value.agent.effort?.[model], model).toBe('medium');
      for (const arm of ['baseline', 'baseline-docs', 'wingfoil'])
        expect(
          codexScopeIssues(
            { agent: 'codex', dryRunArm: arm, profile: file, model },
            Date.parse('2026-10-28T12:00:00Z'),
          ),
        ).toEqual([]);
    }
  });
});
