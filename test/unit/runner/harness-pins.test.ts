// bug-033, items 3 and 4: what a harness pin must be, checked before any image is built, by a campaign and a dry run.
import { copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { registryPinIssues } from '../../../src/core/index.js';
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

describe("the dry run and the eligibility register (bug-033, item 3; the approver's choice A)", () => {
  const PIN = { tool: 'wingfoil', version: '3df305e' };
  const notes = (root: string, arm: string) => {
    const checked = checkDryRun({ id: 'S1', version: '1.0', arm }, root);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    return checked.value.notes;
  };

  it('lets a version the register has not assessed run, because dry runs are how it is studied, and notes it', () => {
    const repo = repository('wingfoil', PIN);
    writeRegister(repo.root, [registerEntry('speckit', 'v1.1.0')]);
    expect(campaignIssues(repo.file).map((issue) => issue.message)).toEqual(notes(repo.root, 'wingfoil'));
    expect(notes(repo.root, 'wingfoil')).toEqual([
      'wingfoil 3df305e is not assessed in eligibility/register.yaml: assess it before a campaign pins it',
    ]);
  });

  it('notes a version the register excludes, and still lets it run', () => {
    const repo = repository('wingfoil', PIN);
    writeRegister(repo.root, [registerEntry('wingfoil', '3df305e', ['pinnable'])]);
    expect(notes(repo.root, 'wingfoil')).toEqual([
      expect.stringContaining('wingfoil 3df305e is excluded by the eligibility register: it fails pinnable'),
    ]);
  });

  it('notes nothing for an admitted version, or for an arm with no harness', () => {
    const repo = repository('wingfoil', PIN);
    writeRegister(repo.root, TEST_REGISTER);
    expect(notes(repo.root, 'wingfoil')).toEqual([]);
    writeRegister(repo.root, []);
    expect(notes(repo.root, 'baseline')).toEqual([]);
  });

  it('names the register in the note when it is missing or invalid, and still runs', () => {
    const repo = repository('wingfoil', PIN);
    rmSync(join(repo.root, 'eligibility'), { recursive: true, force: true });
    expect(notes(repo.root, 'wingfoil')).toEqual([
      'eligibility/register.yaml: not found: a harness arm can pin only a tool the register admits (REQ-FMT-11)',
    ]);
    mkdirSync(join(repo.root, 'eligibility'));
    writeFileSync(join(repo.root, 'eligibility', 'register.yaml'), 'criteria: 3\nentries: nope\n');
    const invalid = notes(repo.root, 'wingfoil');
    expect(invalid.length).toBeGreaterThan(0);
    for (const note of invalid) expect(note).toMatch(/^eligibility\/register\.yaml/);
  });

  it('refuses a campaign on the same pin all the same', () => {
    const repo = repository('wingfoil', PIN);
    writeRegister(repo.root, []);
    expect(campaignIssues(repo.file).map((issue) => issue.path)).toEqual(['harnesses.wingfoil.version']);
  });
});

describe('registryPinIssues (bug-033, item 4)', () => {
  it("reads a configured arm's pin from its base arm's entry", () => {
    const harnesses = { openspec: { tool: 'openspec', version: '1.14.0', commit: COMMIT } };
    const arms = [{ name: 'openspec-configured', requires: 'openspec', configuredOf: 'openspec' }];
    expect(registryPinIssues(harnesses, arms)).toEqual([BY_COMMIT]);
  });
});
