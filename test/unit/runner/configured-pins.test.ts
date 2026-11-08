import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';

import { armDigest } from '../../../src/arms/index.js';
import { checkCampaign, checkDryRun } from '../../../src/runner/index.js';
import { campaignConsistency } from '../../../src/core/index.js';
import { completeCampaignYaml } from '../../support/campaign-fixture.js';
import {
  commitAll,
  configuredRepo,
  PINS,
  writeFixtureConfiguration,
} from '../../support/configured-arm-fixture.js';
import { writeDryRunProfile } from '../../support/dry-run-fixture.js';
import { repoPath } from '../../support/paths.js';
import type { CampaignFile } from '../../../src/core/index.js';

const WINGFOIL = { '.wingfoil/directives/custom/r9.md': '# Rule r9\n\nA rule.\n' };

const issues = (file: string) => {
  const checked = checkCampaign(file);
  return checked.ok ? [] : checked.issues;
};

describe("a campaign's configured arms (REQ-FMT-01 as amended in 1.50, task-142)", () => {
  it('refuses a configured docs control on a version that holds no configuration, naming it', () => {
    const repo = configuredRepo(['baseline', 'wingfoil-configured', 'baseline-docs-configured'], ['S1@1.1']);
    expect(issues(repo.file)).toEqual([
      {
        path: 'arms',
        message:
          'S1@1.1, wingfoil-configured: the version holds no configuration for wingfoil-configured ' +
          '(REQ-FMT-04 as amended in 1.50)',
      },
      {
        path: 'arms',
        message:
          'S1@1.1, baseline-docs-configured: the version holds no configuration for wingfoil-configured ' +
          '(REQ-FMT-04 as amended in 1.50)',
      },
    ]);
  });

  it("refuses a record whose harness tool differs from the campaign's, at the same version", () => {
    const repo = configuredRepo(
      ['baseline', 'wingfoil-configured'],
      ['S1@1.1'],
      [
        {
          scenario: 'S1@1.1',
          arm: 'wingfoil-configured',
          files: WINGFOIL,
          record: { harness: { tool: 'speckit', version: PINS.wingfoil?.version, commit: 'c'.repeat(40) } },
        },
      ],
    );
    expect(issues(repo.file)).toEqual([
      {
        path: 'harnesses.wingfoil',
        message: `is wingfoil 3df305e, but S1@1.1, wingfoil-configured: the configuration's record pins speckit 3df305e`,
      },
    ]);
  });

  it('refuses every SHA-256 outside a repository, where no commit holds the prompt or the profile', () => {
    const repo = configuredRepo(
      ['baseline', 'wingfoil-configured'],
      ['S1@1.1'],
      [{ scenario: 'S1@1.1', arm: 'wingfoil-configured', files: WINGFOIL }],
    );
    rmSync(join(repo.root, '.git'), { recursive: true, force: true });
    expect(issues(repo.file).map((issue) => issue.message)).toEqual([
      expect.stringMatching(
        /^S1@1\.1, wingfoil-configured: .*prompt_sha256 .*no commit of configuring\/prompt\.md/,
      ),
      expect.stringMatching(
        /^S1@1\.1, wingfoil-configured: .*profile_sha256 .*no commit of configuring\/profile\.yaml/,
      ),
    ]);
  });

  it("lets a campaign pin a configured arm's base arm, run or not, and nothing else outside its arms", () => {
    const campaign = { ...completeCampaignYaml(), arms: ['baseline', 'wingfoil-configured'] };
    delete (campaign as { models?: unknown }).models;
    const spec = {
      ...campaign,
      models: { default: 'claude-sonnet-5' },
      harnesses: { wingfoil: PINS.wingfoil, speckit: PINS.speckit },
    } as unknown as CampaignFile;
    expect(campaignConsistency(spec).filter((issue) => issue.path.startsWith('harnesses'))).toEqual([
      {
        path: 'harnesses.speckit',
        message: "is not one of the campaign's arms, nor the base of a configured one",
      },
    ]);
  });

  it('reads the base arm the pin resolves from the history, its record checked against it', () => {
    const repo = configuredRepo(
      ['baseline', 'wingfoil-configured'],
      ['S1@1.1'],
      [{ scenario: 'S1@1.1', arm: 'wingfoil-configured', files: WINGFOIL }],
    );
    const pins = {
      baseline: armDigest(repo.root, 'baseline').slice(0, 12),
      'wingfoil-configured': armDigest(repo.root, 'wingfoil-configured').slice(0, 12),
    };
    const yaml = parse(readFileSync(repo.file, 'utf8')) as Record<string, unknown>;
    writeFileSync(repo.file, stringify({ ...yaml, arm_digests: pins }));
    commitAll(repo.root);
    // The base arm changes after the configuration was written: the pin still resolves the one it was written for
    writeFileSync(join(repo.root, 'arms', 'wingfoil', 'manual.md'), '# A later manual\n');
    commitAll(repo.root);
    expect(issues(repo.file)).toEqual([]);
    writeFixtureConfiguration(repo.root, {
      scenario: 'S1@1.1',
      arm: 'wingfoil-configured',
      files: WINGFOIL,
      record: { base_arm_digest: armDigest(repo.root, 'wingfoil').slice(0, 12) },
    });
    expect(issues(repo.file).map((issue) => issue.path)).toEqual(['arm_digests.wingfoil-configured']);
  });

  it('refuses a dry run of a configured arm, or of its docs control, as validate refuses a campaign (1.54)', () => {
    const repo = configuredRepo(['baseline', 'wingfoil-configured', 'baseline-docs-configured'], ['S1@1.1']);
    writeDryRunProfile(repo.root);
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(repo.root, 'scenarios', 'leak-scan.yaml'));
    for (const arm of ['wingfoil-configured', 'baseline-docs-configured']) {
      const checked = checkDryRun({ id: 'S1', version: '1.1', arm }, repo.root);
      expect(checked.ok ? [] : checked.issues.map((issue) => issue.message), arm).toContainEqual(
        `S1@1.1, ${arm}: the version holds no configuration for wingfoil-configured (REQ-FMT-04 as amended in 1.50)`,
      );
    }
    writeFixtureConfiguration(repo.root, { scenario: 'S1@1.1', arm: 'wingfoil-configured', files: WINGFOIL });
    expect(checkDryRun({ id: 'S1', version: '1.1', arm: 'baseline-docs-configured' }, repo.root).ok).toBe(
      true,
    );
  });
});
