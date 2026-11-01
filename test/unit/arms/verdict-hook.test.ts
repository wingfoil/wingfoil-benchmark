import { spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/**
 * The wingfoil arm's verdict hook (`arms/wingfoil/verdict.sh`, task-118), run on this machine against the WingFoil the
 * benchmark pins (the same release as the arm's harness), in a scratch project set up as the arm's setup does: a
 * developer, and Dana as the separate approver. bug-041: a refused verb keeps WingFoil's reason.
 */

const WINGFOIL = repoPath('node_modules/.bin/wingfoil');
const DANA = { name: 'Dana Okafor', email: 'dana@example.org' };

interface Project {
  readonly home: string;
  readonly workspace: string;
}

/**
 * The scratch project's environment: its own home and no git configuration but its own, and none of the variables
 * that would point git at another repository or another identity (as the git port clears them).
 */
function isolated(home: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
  return { ...env, HOME: home, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', ...extra };
}

function wrapper(at: string, tool: string): void {
  writeFileSync(at, `#!/bin/sh\nexec "${tool}" "$@"\n`);
  chmodSync(at, 0o755);
}

/** A Kanban project with `tasks` tasks submitted and waiting for the approver; `wingfoil` on the hook's PATH. */
function project(tasks = 1): Project {
  const root = tempDir('bench-verdict-hook-');
  const home = join(root, 'home');
  const workspace = join(root, 'workspace');
  mkdirSync(join(home, '.local', 'bin'), { recursive: true });
  mkdirSync(workspace);
  wrapper(join(home, '.local', 'bin', 'wingfoil'), WINGFOIL);
  const run = (command: string, ...args: string[]) => {
    const result = spawnSync(command, args, { cwd: workspace, encoding: 'utf8', env: isolated(home) });
    if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}: ${result.stderr}`);
  };
  run('git', 'init', '--quiet');
  run('git', 'config', 'user.name', 'Benchmark Developer');
  run('git', 'config', 'user.email', 'developer@benchmark.localhost');
  writeFileSync(join(workspace, 'README.md'), 'seed\n');
  run('git', 'add', '--all');
  run('git', 'commit', '--quiet', '--message', 'seed');
  run(WINGFOIL, 'init', '--template', 'Kanban');
  const member = (name: string, email: string, role: string) =>
    run(
      WINGFOIL,
      'dna',
      'add',
      'team.members',
      '--value',
      name,
      '--entry-email',
      email,
      '--entry-roles',
      role,
    );
  member('Benchmark Developer', 'developer@benchmark.localhost', 'developer');
  member(DANA.name, DANA.email, 'approver');
  for (let n = 1; n <= tasks; n++) {
    run(WINGFOIL, 'memory', 'add', '--type', 'task', '--title', `Discount codes ${n}`);
    run(WINGFOIL, 'memory', 'submit', taskIds(workspace)[n - 1] ?? '');
  }
  return { home, workspace };
}

function taskIds(workspace: string): string[] {
  return readdirSync(join(workspace, 'docs', 'memory', 'task'))
    .sort()
    .map((file) => file.replace(/\.md$/, ''));
}

function hook(at: Project, verdict = 'approve'): Record<string, unknown> {
  const result = spawnSync(
    'bash',
    [repoPath('arms/wingfoil/verdict.sh'), verdict, DANA.name, DANA.email, 'The codes behave as asked.'],
    { encoding: 'utf8', env: isolated(at.home, { WORKSPACE: at.workspace }) },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout.trim().split('\n').pop() ?? '') as Record<string, unknown>;
}

describe("the wingfoil arm's verdict hook (task-118, bug-041)", () => {
  it('carries the verdict out on the one task waiting, with no detail', () => {
    const at = project();
    expect(hook(at)).toEqual({ outcome: 'done', target: taskIds(at.workspace)[0] });
  }, 30_000);

  it.each([
    ['no task waiting', 0, 'approve', 'no-target'],
    ['two tasks waiting', 2, 'approve', 'ambiguous'],
    ['a verdict it does not know', 1, 'maybe', 'unknown-verdict'],
  ])(
    'answers %s as before, with no detail',
    (_case, tasks, verdict, outcome) => {
      expect(hook(project(tasks), verdict)).toEqual({ outcome });
    },
    30_000,
  );

  it("keeps WingFoil's reason when the verb is refused: an uncommitted edit of the task (bug-041)", () => {
    const at = project();
    const [id = ''] = taskIds(at.workspace);
    appendFileSync(join(at.workspace, 'docs', 'memory', 'task', `${id}.md`), '\nThe outcome.\n');
    const answer = hook(at);
    expect(answer).toMatchObject({ outcome: 'refused', target: id });
    expect(answer.detail).toMatch(/^error: refusing to commit .*uncommitted modifications/);
  }, 30_000);

  it("keeps the search's reason when it fails, its last error: line, at most 500 characters (bug-041)", () => {
    const failing = join(tempDir('bench-verdict-hook-tool-'), 'wingfoil');
    const said = `error: ${'é'.repeat(900)}`;
    writeFileSync(
      failing,
      `#!/bin/sh\necho "error: first" >&2\necho "${said}" >&2\necho "hint: retry" >&2\nexit 1\n`,
    );
    chmodSync(failing, 0o755);
    const at = project();
    wrapper(join(at.home, '.local', 'bin', 'wingfoil'), failing);
    const answer = hook(at);
    expect(answer.outcome).toBe('search-failed');
    expect(answer.detail).toBe([...said].slice(0, 500).join(''));
  }, 30_000);
});
