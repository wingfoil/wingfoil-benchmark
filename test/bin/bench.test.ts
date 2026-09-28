import { execFileSync } from 'node:child_process';
import { accessSync, constants, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { REPO_ROOT, repoPath } from '../support/paths.js';

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

  it('exits 2 with the usage when called without arguments', () => {
    const { status, stderr } = bench();
    expect(status).toBe(2);
    expect(stderr).toMatch(
      /^usage: bench campaign validate <file>\n\s+bench campaign estimate <file>\n\s+bench campaign run <file> \[--allow-spending\]\n\s+bench scenario validate <id>@<version> \[--holdout <path>\]\n\s+bench scenario dry-run <id>@<version> --arm <arm> \[--model <id>\] \[--allow-spending\]\n$/,
    );
  });
});
