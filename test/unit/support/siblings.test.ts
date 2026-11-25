// task-179 — the WingFoil clone and the hold-out are found by a setting, never by a sibling folder's name: the
// variables first, then the git-ignored config/siblings.local.yaml of the main checkout, then (hold-out only) the
// folder that moves with this repository. A setting that names a missing folder is reported, never replaced.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { tempDir } from '../../support/scenario-fixture.js';
import { HOLDOUT_DEFAULT, LOCAL_FILE, mainCheckout, siblings } from '../../support/siblings.js';

/** A main checkout with one worktree, and the folders a setting may name. */
function fixture() {
  const root = tempDir('bench-siblings-');
  const main = join(root, 'main');
  mkdirSync(main);
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  git(main, 'init', '-q', '-b', 'main');
  writeFileSync(join(main, 'seed'), '');
  git(main, 'add', 'seed');
  git(main, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'seed');
  const worktree = join(root, 'wt', 'task-x');
  git(main, 'worktree', 'add', '-q', '-b', 'task/x', worktree);
  const clone = join(root, 'a-clone');
  const holdout = join(root, 'a-holdout');
  mkdirSync(clone);
  mkdirSync(holdout);
  const local = (text: string) => {
    mkdirSync(join(main, 'config'), { recursive: true });
    writeFileSync(join(main, LOCAL_FILE), text);
  };
  return { root, main, worktree, clone, holdout, local };
}

describe('the sibling repositories, found by a setting (task-179)', () => {
  it('finds the main checkout from a worktree and from the main checkout itself', () => {
    const { main, worktree } = fixture();
    expect(mainCheckout(worktree)).toBe(main);
    expect(mainCheckout(main)).toBe(main);
  });

  it('takes the variables first, over the local file', () => {
    const { main, clone, holdout, root, local } = fixture();
    local(`wingfoil: ${join(root, 'elsewhere')}\nholdout: ${join(root, 'elsewhere')}\n`);
    const found = siblings({ env: { BENCH_WINGFOIL_REPO: clone, BENCH_HOLDOUT_PATH: holdout }, main });
    expect(found.wingfoil).toEqual({ path: clone, source: 'env', reason: undefined });
    expect(found.holdout).toEqual({ path: holdout, source: 'env', reason: undefined });
  });

  it("reads the main checkout's local file from a worktree, a relative path against the main checkout", () => {
    const { main, worktree, clone, holdout, local } = fixture();
    local(`wingfoil: ../a-clone\nholdout: ${holdout}\n`);
    const found = siblings({ env: {}, main: mainCheckout(worktree) });
    expect(found.wingfoil).toEqual({ path: clone, source: 'local', reason: undefined });
    expect(found.holdout).toEqual({ path: holdout, source: 'local', reason: undefined });
    expect(mainCheckout(worktree)).toBe(main);
  });

  it('reads a ~/ path of the local file against the home folder', () => {
    const { root, main, clone, local } = fixture();
    vi.stubEnv('HOME', root);
    local('wingfoil: ~/a-clone\n');
    expect(siblings({ env: {}, main }).wingfoil).toEqual({ path: clone, source: 'local', reason: undefined });
    vi.unstubAllEnvs();
  });

  it('treats an empty variable as unset', () => {
    const { main, clone, local } = fixture();
    local(`wingfoil: ${clone}\n`);
    expect(siblings({ env: { BENCH_WINGFOIL_REPO: '' }, main }).wingfoil.source).toBe('local');
  });

  it('falls back, for the hold-out only, to the folder beside the main checkout that moves with it', () => {
    const { root, main } = fixture();
    mkdirSync(join(root, HOLDOUT_DEFAULT));
    const found = siblings({ env: {}, main });
    expect(found.holdout).toEqual({
      path: join(root, HOLDOUT_DEFAULT),
      source: 'default',
      reason: undefined,
    });
    expect(found.wingfoil.path).toBeUndefined();
  });

  it('gives no path and a reason naming the variable and the file when nothing is set', () => {
    const { main } = fixture();
    const found = siblings({ env: {}, main });
    expect(found.wingfoil.path).toBeUndefined();
    expect(found.wingfoil.source).toBe('none');
    expect(found.wingfoil.reason).toContain('BENCH_WINGFOIL_REPO');
    expect(found.wingfoil.reason).toContain(LOCAL_FILE);
    expect(found.holdout.path).toBeUndefined();
    expect(found.holdout.reason).toContain('BENCH_HOLDOUT_PATH');
    expect(found.holdout.reason).toContain(LOCAL_FILE);
    expect(found.holdout.reason).toContain(HOLDOUT_DEFAULT);
  });

  it('reports a setting that names a missing folder, never replacing it with the next source', () => {
    const { root, main, clone, holdout, local } = fixture();
    mkdirSync(join(root, HOLDOUT_DEFAULT));
    local(`wingfoil: ${clone}\nholdout: ${holdout}\n`);
    const missing = join(root, 'nowhere');
    const byEnv = siblings({ env: { BENCH_WINGFOIL_REPO: missing, BENCH_HOLDOUT_PATH: missing }, main });
    expect(byEnv.wingfoil).toEqual({
      path: undefined,
      source: 'env',
      reason: `BENCH_WINGFOIL_REPO: ${missing} does not exist`,
    });
    expect(byEnv.holdout.path).toBeUndefined();
    expect(byEnv.holdout.reason).toBe(`BENCH_HOLDOUT_PATH: ${missing} does not exist`);

    local(`wingfoil: ${missing}\nholdout: ${missing}\n`);
    const byFile = siblings({ env: {}, main });
    expect(byFile.wingfoil).toEqual({
      path: undefined,
      source: 'local',
      reason: `${LOCAL_FILE}: wingfoil: ${missing} does not exist`,
    });
    expect(byFile.holdout.path).toBeUndefined();
    expect(byFile.holdout.reason).toBe(`${LOCAL_FILE}: holdout: ${missing} does not exist`);
  });

  it('refuses a local file that is not a mapping of the two keys to strings', () => {
    const { main, local } = fixture();
    local('wingfoil: [a]\n');
    expect(() => siblings({ env: {}, main })).toThrow(/siblings\.local\.yaml: wingfoil is not a path/);
    local('clone: /x\n');
    expect(() => siblings({ env: {}, main })).toThrow(/siblings\.local\.yaml: unknown key clone/);
  });
});
