import { describe, expect, it } from 'vitest';

import { checkCampaign, main } from '../../../src/cli/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { repoPath } from '../../support/paths.js';

async function run(...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(argv, {
    stdout: (text) => (stdout += text),
    stderr: (text) => (stderr += text),
  });
  return { code, stdout, stderr };
}

describe('bench campaign validate', () => {
  it('prints the identity of a valid campaign and exits 0', async () => {
    const { file } = writeRepo();
    const { code, stdout, stderr } = await run('campaign', 'validate', file);
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(stdout).toMatch(/^campaign [0-9a-f]{12} is valid \(4 scenarios, 3 arms\)\n$/);
  });

  it('uses the singular for one scenario and one arm', async () => {
    const { stdout } = await run('campaign', 'validate', repoPath('test/fixtures/campaigns/smoke.yaml'));
    expect(stdout).toMatch(/ is valid \(1 scenario, 1 arm\)\n$/);
  });

  it('prints one line per issue and exits 1 on an invalid campaign', async () => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = { wingfoil: { tool: 'wingfoil', version: 'latest' } };
    yaml.arms = ['wingfoil'];
    const { code, stdout, stderr } = await run('campaign', 'validate', writeRepo(yaml).file);
    expect({ code, stdout }).toEqual({ code: 1, stdout: '' });
    expect(stderr.trimEnd().split('\n')).toEqual([
      "harnesses.wingfoil.version: 'latest' is not pinned: use a released version or a commit SHA",
      'arms: must include the baseline arm',
    ]);
  });

  it.each([
    [[]],
    [['campaign']],
    [['campaign', 'validate']],
    [['campaign', 'validate', 'a.yaml', 'b.yaml']],
    [['campaign', 'run', 'a.yaml']],
    [['scenario', 'validate', 'S1@1.0']],
    [['--help']],
  ])('exits 2 with the usage on a usage error (%j)', async (argv) => {
    const { code, stdout, stderr } = await run(...argv);
    expect({ code, stdout }).toEqual({ code: 2, stdout: '' });
    expect(stderr).toMatch(/^usage: bench campaign validate <file>\n/);
  });
});

describe('checkCampaign', () => {
  it('loads every scenario the campaign names, in order', () => {
    const { root, file } = writeRepo();
    const result = checkCampaign(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scenarios.map((s) => s.dir)).toEqual(
      ['S1', 'S2', 'S3', 'S8'].map((id) => `${root}/scenarios/${id}/1.0`),
    );
  });

  it('reports scenarios that do not load, naming the entry and the scenario', () => {
    const result = checkCampaign(writeRepo(completeCampaignYaml(), ['S1@1.0', 'S2@1.0', 'S8@1.0']).file);
    expect(result.ok ? [] : result.issues).toEqual([
      { path: 'scenarios[2]', message: expect.stringMatching(/^S3@1\.0: scenario\.yaml not found/) },
    ]);
  });

  it('reports an invalid campaign without loading scenarios', () => {
    const yaml = completeCampaignYaml();
    yaml.arms = ['wingfoil'];
    const result = checkCampaign(writeRepo(yaml, []).file);
    expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual(['arms']);
  });
});
