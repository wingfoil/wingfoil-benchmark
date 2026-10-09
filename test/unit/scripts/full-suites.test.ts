import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/full-suites.sh');

/**
 * A main checkout with two worktrees, `task/x` and `other`, and a stub `npm` that records each call (its directory and
 * arguments) and fails `test` on `task/x`: what the script runs, without running a suite.
 */
function fixture() {
  const root = tempDir('bench-full-suites-');
  const main = join(root, 'main');
  mkdirSync(main);
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  git(main, 'init', '-q', '-b', 'main');
  git(main, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'seed');
  git(main, 'worktree', 'add', '-q', '-b', 'task/x', join(root, 'task-x'));
  git(main, 'worktree', 'add', '-q', '-b', 'other', join(root, 'other'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const calls = join(root, 'calls.txt');
  writeFileSync(
    join(bin, 'npm'),
    [
      '#!/usr/bin/env bash',
      `echo "$(basename "$PWD") $*" >> '${calls}'`,
      '[ "$(basename "$PWD")" = task-x ] && [ "$1" = test ] && exit 1',
      'exit 0',
    ].join('\n'),
  );
  chmodSync(join(bin, 'npm'), 0o755);
  const out = join(root, 'out');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`, WFB_MAIN: main, WFB_OUT: out };
  return { root, main, out, calls, env };
}

const day = (out: string) =>
  join(out, readdirSync(out).find((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)) ?? '');

describe('scripts/full-suites.sh (dl-016, task-075)', () => {
  it('runs the five stages on main and on every task/* worktree, one at a time, and summarizes their codes', () => {
    const { out, calls, env } = fixture();
    const run = spawnSync('bash', [SCRIPT], { env, encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);

    expect(readFileSync(calls, 'utf8').trim().split('\n')).toEqual([
      'main run lint',
      'main test -- --maxWorkers=2',
      'main run build',
      'main run test:bin -- --maxWorkers=2',
      'main run test:docker',
      'task-x run lint',
      'task-x test -- --maxWorkers=2',
      'task-x run build',
      'task-x run test:bin -- --maxWorkers=2',
      'task-x run test:docker',
    ]);
    const logs = day(out);
    // One log per branch and commit: a later run of the same day never overwrites the log an approval names.
    const names = readdirSync(logs).sort();
    expect(names.filter((name) => name.startsWith('main-'))).toHaveLength(1);
    expect(names.filter((name) => name.startsWith('task_x-'))).toHaveLength(1);
    expect(names.some((name) => name.startsWith('other'))).toBe(false);
    const summary = readFileSync(join(logs, 'summary.txt'), 'utf8');
    expect(summary).toMatch(
      /^main [0-9a-f]+: LINT 0 TEST 0 BUILD 0 BIN 0 DOCKER 0 \(log main-[0-9a-f]+-\d{6}\.txt\)$/m,
    );
    expect(summary).toMatch(
      /^task\/x [0-9a-f]+: LINT 0 TEST 1 BUILD 0 BIN 0 DOCKER 0 \(log task_x-[0-9a-f]+-\d{6}\.txt\)$/m,
    );
  });

  it('names the commit it started on, and says when the worktree had changes not committed', () => {
    const { root, out, env } = fixture();
    writeFileSync(join(root, 'task-x', 'edited.txt'), 'not committed\n');
    expect(spawnSync('bash', [SCRIPT, 'task/x'], { env, encoding: 'utf8' }).status).toBe(0);
    const head = execFileSync('git', ['-C', join(root, 'task-x'), 'rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    expect(readFileSync(join(day(out), 'summary.txt'), 'utf8')).toMatch(
      new RegExp(`^task/x ${head} DIRTY: LINT 0 TEST 1`, 'm'),
    );
  });

  it('says which branches it could not run, and a name that matches no worktree', () => {
    const { root, out, env } = fixture();
    expect(spawnSync('bash', [SCRIPT, 'task/x', 'task/typo'], { env, encoding: 'utf8' }).status).toBe(0);
    expect(readFileSync(join(day(out), 'summary.txt'), 'utf8')).toContain(
      'NOT FOUND task/typo: no worktree has it',
    );
    // A worktree whose directory is gone cannot be entered: it is named, not silently passed over.
    rmSync(join(root, 'task-x'), { recursive: true, force: true });
    expect(spawnSync('bash', [SCRIPT, 'task/x'], { env, encoding: 'utf8' }).status).toBe(0);
    expect(readFileSync(join(day(out), 'summary.txt'), 'utf8')).toMatch(/^SKIPPED task\/x: cannot enter /m);
  });

  it('runs only the branches named as arguments', () => {
    const { calls, env } = fixture();
    expect(spawnSync('bash', [SCRIPT, 'task/x'], { env, encoding: 'utf8' }).status).toBe(0);
    expect(
      readFileSync(calls, 'utf8')
        .trim()
        .split('\n')
        .every((line) => line.startsWith('task-x ')),
    ).toBe(true);
  });

  it('runs nothing while another run holds the lock', () => {
    const { out, calls, env } = fixture();
    mkdirSync(out, { recursive: true });
    const held = spawnSync('flock', [join(out, '.lock'), 'bash', SCRIPT], { env, encoding: 'utf8' });
    expect(held.status, held.stderr).toBe(0);
    expect(existsSync(calls)).toBe(false);
    expect(readFileSync(join(day(out), 'summary.txt'), 'utf8')).toContain(
      'another full-suites run is in progress',
    );
  });
});
