// bug-033, items 3 and 4: what a harness pin must be, checked before any image is built, by a campaign and a dry run.
import { copyFileSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkCampaign, checkDryRun } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { dryRunProfileYaml, writeDryRunProfile } from '../../support/dry-run-fixture.js';
import { registerEntry, TEST_REGISTER, writeRegister } from '../../support/eligibility-fixture.js';
import { repoPath } from '../../support/paths.js';

const COMMIT = '1'.repeat(40);

/** A repository whose campaign runs `arm` on `pin`, with the repository's own openspec arm. */
function repository(arm: string, pin: Record<string, unknown>) {
  const repo = writeRepo(
    {
      ...completeCampaignYaml(),
      arms: ['baseline', arm],
      harnesses: { [arm]: pin },
      scenarios: [{ id: 'S1', version: '1.0' }],
      repetitions: { S1: 1 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
    },
    ['S1@1.0'],
  );
  if (arm === 'openspec') {
    rmSync(join(repo.root, 'arms', 'openspec'), { recursive: true, force: true });
    cpSync(repoPath('arms/openspec'), join(repo.root, 'arms', 'openspec'), { recursive: true });
  }
  copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(repo.root, 'scenarios', 'leak-scan.yaml'));
  writeDryRunProfile(repo.root, { ...dryRunProfileYaml(), harnesses: { [arm]: pin } });
  return repo;
}

const campaignIssues = (file: string) => {
  const checked = checkCampaign(file);
  return checked.ok ? [] : checked.issues;
};
const dryRunIssues = (root: string, arm: string) => {
  const checked = checkDryRun({ id: 'S1', version: '1.0', arm }, root);
  return checked.ok ? [] : checked.issues;
};

const BY_COMMIT = {
  path: 'harnesses.openspec.commit',
  message: 'openspec is fetched from the npm registry by version: it has no commit to pin',
};
const NOT_RELEASED = {
  path: 'harnesses.openspec.version',
  message: "'abc1234' is not a released version of openspec, which the npm registry would read as a tag",
};

describe('a registry harness pin (bug-033, item 4)', () => {
  it('is refused by commit, by the campaign check', () => {
    const repo = repository('openspec', { tool: 'openspec', version: '1.14.0', commit: COMMIT });
    expect(campaignIssues(repo.file)).toEqual([BY_COMMIT]);
  });

  it('is refused at a version that is no release, once, by the campaign check', () => {
    const repo = repository('openspec', { tool: 'openspec', version: 'abc1234' });
    expect(campaignIssues(repo.file)).toEqual([NOT_RELEASED]);
  });

  it('is refused by the dry run check too', () => {
    const byCommit = repository('openspec', { tool: 'openspec', version: '1.14.0', commit: COMMIT });
    expect(dryRunIssues(byCommit.root, 'openspec')).toEqual([BY_COMMIT]);
    const notReleased = repository('openspec', { tool: 'openspec', version: 'abc1234' });
    expect(dryRunIssues(notReleased.root, 'openspec')).toEqual([NOT_RELEASED]);
  });

  it('passes at a release the register admits', () => {
    const repo = repository('openspec', { tool: 'openspec', version: '1.14.0' });
    expect(campaignIssues(repo.file)).toEqual([]);
    expect(dryRunIssues(repo.root, 'openspec')).toEqual([]);
  });
});

describe("the dry run's eligibility check (bug-033, item 3)", () => {
  const PIN = { tool: 'wingfoil', version: '3df305e' };

  it('refuses a version the register has not assessed, in the campaign check’s words', () => {
    const repo = repository('wingfoil', PIN);
    writeRegister(repo.root, [registerEntry('speckit', 'v1.1.0')]);
    expect(dryRunIssues(repo.root, 'wingfoil')).toEqual(campaignIssues(repo.file));
    expect(dryRunIssues(repo.root, 'wingfoil')).toEqual([
      {
        path: 'harnesses.wingfoil.version',
        message:
          'wingfoil 3df305e is not assessed in eligibility/register.yaml: assess it before a campaign pins it',
      },
    ]);
  });

  it('refuses a version the register excludes', () => {
    const repo = repository('wingfoil', PIN);
    writeRegister(repo.root, [registerEntry('wingfoil', '3df305e', ['pinnable'])]);
    expect(dryRunIssues(repo.root, 'wingfoil').map((issue) => issue.message)).toEqual([
      expect.stringContaining('wingfoil 3df305e is excluded by the eligibility register: it fails pinnable'),
    ]);
  });

  it('passes an admitted version, and asks nothing of an arm with no harness', () => {
    const repo = repository('wingfoil', PIN);
    writeRegister(repo.root, TEST_REGISTER);
    expect(dryRunIssues(repo.root, 'wingfoil')).toEqual([]);
    writeRegister(repo.root, []);
    expect(dryRunIssues(repo.root, 'baseline')).toEqual([]);
  });
});
