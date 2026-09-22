import { describe, expect, it } from 'vitest';

import { main } from '../../../src/cli/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';

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
