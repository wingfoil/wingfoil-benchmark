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

function run(cwd: string, command: string, args: readonly string[], env: NodeJS.ProcessEnv = {}): string {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

/** A Kanban project with one task, submitted and waiting for the approver; `wingfoil` on the hook's PATH. */
function project(): Project {
  const root = tempDir('bench-verdict-hook-');
  const home = join(root, 'home');
  const workspace = join(root, 'workspace');
  mkdirSync(join(home, '.local', 'bin'), { recursive: true });
  mkdirSync(workspace);
  const wrapper = join(home, '.local', 'bin', 'wingfoil');
  writeFileSync(wrapper, `#!/bin/sh\nexec ${WINGFOIL} "$@"\n`);
  chmodSync(wrapper, 0o755);
  run(workspace, 'git', ['init', '--quiet']);
  run(workspace, 'git', ['config', 'user.name', 'Benchmark Developer']);
  run(workspace, 'git', ['config', 'user.email', 'developer@benchmark.localhost']);
  writeFileSync(join(workspace, 'README.md'), 'seed\n');
  run(workspace, 'git', ['add', '--all']);
  run(workspace, 'git', ['commit', '--quiet', '--message', 'seed']);
  const wingfoil = (...args: string[]) => run(workspace, WINGFOIL, args);
  wingfoil('init', '--template', 'Kanban');
  const member = (name: string, email: string, role: string) =>
    wingfoil('dna', 'add', 'team.members', '--value', name, '--entry-email', email, '--entry-roles', role);
  member('Benchmark Developer', 'developer@benchmark.localhost', 'developer');
  member(DANA.name, DANA.email, 'approver');
  wingfoil('memory', 'add', '--type', 'task', '--title', 'Discount codes');
  wingfoil('memory', 'submit', taskId(workspace));
  return { home, workspace };
}

function taskId(workspace: string): string {
  const [file] = readdirSync(join(workspace, 'docs', 'memory', 'task'));
  return (file ?? '').replace(/\.md$/, '');
}

function hook(at: Project, verdict = 'approve'): Record<string, unknown> {
  const result = spawnSync(
    'bash',
    [repoPath('arms/wingfoil/verdict.sh'), verdict, DANA.name, DANA.email, 'The codes behave as asked.'],
    { encoding: 'utf8', env: { ...process.env, HOME: at.home, WORKSPACE: at.workspace } },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout.trim().split('\n').pop() ?? '') as Record<string, unknown>;
}

describe("the wingfoil arm's verdict hook (task-118, bug-041)", () => {
  it('carries the verdict out on the one task waiting, with no detail', () => {
    const at = project();
    expect(hook(at)).toEqual({ outcome: 'done', target: taskId(at.workspace) });
  }, 30_000);

  it("keeps WingFoil's reason when the verb is refused: an uncommitted edit of the task (bug-041)", () => {
    const at = project();
    appendFileSync(
      join(at.workspace, 'docs', 'memory', 'task', `${taskId(at.workspace)}.md`),
      '\nThe outcome.\n',
    );
    const answer = hook(at);
    expect(answer).toMatchObject({ outcome: 'refused', target: taskId(at.workspace) });
    expect(answer.detail).toMatch(/^error: refusing to commit .*uncommitted modifications/);
  }, 30_000);

  it("keeps the search's reason when it fails, and bounds its length (bug-041)", () => {
    const failing = join(tempDir('bench-verdict-hook-tool-'), 'wingfoil');
    writeFileSync(
      failing,
      `#!/bin/sh\necho "some progress" >&2\necho "error: ${'x'.repeat(900)}" >&2\nexit 1\n`,
    );
    chmodSync(failing, 0o755);
    const at = project();
    writeFileSync(join(at.home, '.local', 'bin', 'wingfoil'), `#!/bin/sh\nexec ${failing} "$@"\n`);
    const answer = hook(at);
    expect(answer.outcome).toBe('search-failed');
    expect(answer.detail).toMatch(/^error: x+$/);
    expect(String(answer.detail).length).toBe(500);
  }, 30_000);
});
