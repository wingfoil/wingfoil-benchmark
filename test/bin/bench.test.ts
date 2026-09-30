import { execFileSync } from 'node:child_process';
import { accessSync, constants, cpSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { beforeAll, describe, expect, it } from 'vitest';

import { writeArmsNamed } from '../support/arm-fixture.js';
import { completeCampaignYaml } from '../support/campaign-fixture.js';
import { priceCampaign } from '../support/dry-run-fixture.js';
import { REPO_ROOT, repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';
import { aggregatedExecution } from '../support/finding-fixture.js';
import { CANCEL, storedRun } from '../support/score-fixture.js';

/**
 * The built command line. Not part of `npm test`: it needs `npm run build`. Run it with
 * `npm run test:bin`.
 */
describe('the built bench command', () => {
  beforeAll(() => {
    execFileSync('npm', ['run', 'build'], { cwd: REPO_ROOT, encoding: 'utf8' });
  }, 120_000);

  function bench(...args: string[]): { status: number; stdout: string; stderr: string } {
    try {
      const stdout = execFileSync('npx', ['bench', ...args], { cwd: REPO_ROOT, encoding: 'utf8' });
      return { status: 0, stdout, stderr: '' };
    } catch (error) {
      const failure = error as { status: number; stdout: string; stderr: string };
      return { status: failure.status, stdout: failure.stdout, stderr: failure.stderr };
    }
  }

  it('is executable straight after the build', () => {
    // Checked before any npx call: npx repairs the mode itself in some layouts, which would hide
    // a build that does not set it.
    const bin = join(REPO_ROOT, 'dist/cli/main.js');
    // From scratch: tsc keeps the mode of a file it overwrites, so an already executable dist/ would
    // hide a build that does not set it.
    rmSync(join(REPO_ROOT, 'dist'), { recursive: true, force: true });
    execFileSync('npm', ['run', 'build'], { cwd: REPO_ROOT, encoding: 'utf8' });
    expect(statSync(bin).isFile()).toBe(true);
    expect(statSync(bin).mode & 0o111).toBe(0o111);
    expect(() => accessSync(bin, constants.X_OK)).not.toThrow();
  });

  it('validates the trivial campaign through npx', () => {
    const { status, stdout } = bench('campaign', 'validate', repoPath('test/fixtures/campaigns/smoke.yaml'));
    expect({ status, stdout }).toEqual({
      status: 0,
      stdout: 'campaign 9491f7cd4bb7 is valid (1 scenario, 1 arm)\n',
    });
  });

  it('reports an invalid file on stderr and exits 1', () => {
    const { status, stderr } = bench(
      'campaign',
      'validate',
      repoPath('test/fixtures/scenarios/T0/1.0/scenario.yaml'),
    );
    expect(status).toBe(1);
    expect(stderr).toMatch(/^harnesses: is required\n/);
  });

  it("W5's Ends with: a campaign refuses to start above the ceiling, whatever its options", () => {
    // A repository of its own: T3 once in the baseline arm, and a dry run that prices it at 130 EUR.
    const root = tempDir('bench-bin-');
    cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
    writeArmsNamed(root, ['baseline']);
    mkdirSync(join(root, 'campaigns'));
    const file = join(root, 'campaigns', 'c.yaml');
    writeFileSync(
      file,
      stringify({
        ...completeCampaignYaml(),
        harnesses: {},
        scenarios: [{ id: 'T3', version: '1.0' }],
        arms: ['baseline'],
        repetitions: { T3: 1 },
        agent: { name: 'fake', version: '1.0.0' },
        models: { default: 'fake-model' },
        budget: { warn_eur: 30, ceiling_eur: 100 },
        currency: { usd_to_eur: 1 },
      }),
    );
    priceCampaign(file, 130);

    for (const flags of [[], ['--allow-spending']]) {
      expect(bench('campaign', 'run', file, ...flags)).toEqual({
        status: 1,
        stdout: 'estimate: 130.0000 USD, 130.0000 EUR at 1 EUR/USD, API-equivalent\n',
        stderr:
          'campaign: not started: the estimate, 130.0000 EUR, is above the ceiling, 100 EUR. No option ' +
          "overrides it: lower the campaign's cost, or raise ceiling_eur, which makes a new campaign\n",
      });
    }
  });

  it('exits 2 with the usage when called without arguments', () => {
    const { status, stderr } = bench();
    expect(status).toBe(2);
    expect(stderr).toMatch(
      /^usage: bench campaign validate <file>\n\s+bench campaign estimate <file>\n\s+bench campaign run <file> \[--allow-spending\]\n\s+bench scenario validate <id>@<version> \[--holdout <path>\]\n\s+bench scenario dry-run <id>@<version> --arm <arm> \[--model <id>\] \[--allow-spending\]\n\s+bench score <campaign-id>\/<n>\|dry-runs\/<n> \[--holdout <path>\]\n\s+bench run show <run> \[--full\]\n\s+bench run compare <run> <run>\n\s+bench finding <campaign-id>\/<n> --scenario <id>@<version> --metric <metric> --arms <arm>,… --as bug\|decision-log\n$/,
    );
  });

  it('shows a stored run and compares two, reading only (F5.3, task-043)', async () => {
    const base = await storedRun({ steps: [{}, CANCEL] });
    const other = await storedRun({ steps: [CANCEL], into: { root: base.root, arm: 'wingfoil' } });

    const shown = bench('run', 'show', base.runDir);
    expect(shown.status).toBe(0);
    expect(shown.stdout).toMatch(/^# Run abcdef012345\/1\/runs\/T3@1\.0\/baseline\/fake-model\/r1\n/);
    expect(shown.stdout).toContain('## Test results\n\nnot scored\n');

    const compared = bench('run', 'compare', base.runDir, other.runDir);
    expect(compared.status).toBe(0);
    expect(compared.stdout).toContain('| 02 | 0.2000 USD | — | 1 | not reached | — | — |');

    expect(bench('run', 'show').status).toBe(2);
  });

  it('writes a finding note from an aggregated execution, in the working directory only (F5.4, task-044)', async () => {
    const { root } = await aggregatedExecution();
    const stdout = execFileSync(
      process.execPath,
      [
        join(REPO_ROOT, 'dist/cli/main.js'),
        'finding',
        'abcdef012345/1',
        '--scenario',
        'T3@1.0',
        '--metric',
        'M-R',
        '--arms',
        'wingfoil',
        '--as',
        'bug',
      ],
      { cwd: root, encoding: 'utf8' },
    );
    expect(stdout).toBe('finding: findings/abcdef012345-1-t3-1.0-m-r-wingfoil.md\n');
    expect(statSync(join(root, 'findings', 'abcdef012345-1-t3-1.0-m-r-wingfoil.md')).isFile()).toBe(true);
  });
});
