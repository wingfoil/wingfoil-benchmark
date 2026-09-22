import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';

import { loadCampaign } from '../../src/campaign/index.js';
import { checkCampaign } from '../../src/cli/index.js';
import { nextExecution } from '../../src/results/index.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';

describe('campaign.feature', () => {
  it('@F1.1 A campaign file pins every variable', () => {
    const { file } = writeRepo();

    const result = checkCampaign(file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { campaign } = result.value;
    expect(campaign.id).toMatch(/^[0-9a-f]{12}$/);
    expect(campaign.spec.harnesses).toEqual({ wingfoil: { tool: 'wingfoil', version: '3df305e' } });
    expect(result.value.scenarios.map((s) => `${s.id}@${s.version}`)).toEqual([
      'S1@1.0',
      'S2@1.0',
      'S3@1.0',
      'S8@1.0',
    ]);
    expect(campaign.spec.arms).toEqual(['baseline', 'baseline-docs', 'wingfoil']);
    expect(campaign.spec.agent).toEqual({ name: 'claude-code', version: '2.1.221' });
    expect(campaign.spec.models.default).toBe('claude-sonnet-5');
    expect(campaign.spec.repetitions).toEqual({ S1: 3, S2: 1, S3: 1, S8: 1 });
    expect(campaign.spec.approver_policy).toBe('v1');
    expect(campaign.spec.currency.usd_to_eur).toBe(0.92);
  });

  it('@F1.1 A campaign with an unpinned harness is rejected', () => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = { wingfoil: { tool: 'wingfoil', version: 'main' } };

    const result = checkCampaign(writeRepo(yaml).file);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      { path: 'harnesses.wingfoil.version', message: expect.stringMatching(/'main' is not pinned/) },
    ]);
  });

  it('@F1.1 The same campaign file identifies the same campaign', () => {
    const { root, file } = writeRepo();
    const first = loadCampaign(file);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    mkdirSync(join(root, 'results', first.value.id, '1'), { recursive: true });

    const reordered = Object.fromEntries(Object.entries(completeCampaignYaml()).reverse());
    writeFileSync(file, `# the same campaign, reformatted\n${stringify(reordered, { indent: 4 })}`);
    const again = loadCampaign(file);

    expect(again.ok && again.value.id).toBe(first.value.id);
    expect(nextExecution(first.value.resultsRoot, first.value.id)).toBe(2);
  });
});
