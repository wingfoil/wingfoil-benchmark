import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/pre-review.sh');

/**
 * A repository whose branch changes `files` over `main`, and stub `npx` and `npm` that record each call and fail the
 * command named by `failing`: what the script runs, without running a check (dl-020, task-098).
 */
function fixture(files: readonly string[], failing?: string) {
  const root = tempDir('bench-pre-review-');
  const repo = join(root, 'repo');
  mkdirSync(repo);
  const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'seed');
  git('checkout', '-q', '-b', 'task/x');
  for (const file of files) {
    mkdirSync(join(repo, dirname(file)), { recursive: true });
    writeFileSync(join(repo, file), 'x\n');
  }
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'change');
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const calls = join(root, 'calls.txt');
  for (const tool of ['npx', 'npm']) {
    writeFileSync(
      join(bin, tool),
      [
        '#!/usr/bin/env bash',
        `echo "${tool} $*" >> '${calls}'`,
        failing === undefined ? 'exit 0' : `case "${tool} $*" in "${failing}"*) exit 1;; esac`,
        'exit 0',
      ].join('\n'),
    );
    chmodSync(join(bin, tool), 0o755);
  }
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}` };
  const run = () => spawnSync('bash', [SCRIPT, 'main'], { cwd: repo, env, encoding: 'utf8' });
  const recorded = () => (existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : []);
  return { run, recorded };
}

describe('scripts/pre-review.sh (dl-020, task-098)', () => {
  it('runs Prettier on every changed file, tsc, the touched tests with traceability, and test:bin for CLI changes', () => {
    const { run, recorded } = fixture(['src/cli/a.ts', 'test/unit/x.test.ts', 'docs/n.md']);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    expect(recorded()).toEqual([
      'npx prettier --check --ignore-unknown docs/n.md src/cli/a.ts test/unit/x.test.ts',
      'npx tsc --noEmit -p .',
      'npx vitest run --maxWorkers=2 test/unit/x.test.ts test/acceptance/traceability.test.ts',
      'npm run test:bin -- --maxWorkers=2',
    ]);
  });

  it('runs test:bin only when files under src/cli/ or src/site/ changed', () => {
    const { run, recorded } = fixture(['src/core/a.ts', 'docs/n.md']);
    expect(run().status).toBe(0);
    expect(recorded().some((call) => call.includes('test:bin'))).toBe(false);
    const site = fixture(['src/site/b.ts']);
    expect(site.run().status).toBe(0);
    expect(site.recorded()).toContain('npm run test:bin -- --maxWorkers=2');
  });

  it('stops at the first red check and exits non-zero, naming it', () => {
    const { run, recorded } = fixture(['src/cli/a.ts', 'docs/n.md'], 'npx prettier');
    const result = run();
    expect(result.status).not.toBe(0);
    expect(recorded()).toEqual(['npx prettier --check --ignore-unknown docs/n.md src/cli/a.ts']);
    expect(result.stdout + result.stderr).toMatch(/prettier/);
  });
});
