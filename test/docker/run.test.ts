import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { readSession } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';

/**
 * The waves' "Ends with" against the real Docker: W1's trivial scenario, and W2's multi-step run.
 * These are the only tests that need Docker, so they live outside `npm test` (`npm run test:docker`).
 * Do not interrupt them: a run killed mid-way leaves its container behind (bug-003).
 */
describe('runs in a real container', () => {
  let image = '';

  afterEach(() => {
    if (image !== '') execFileSync('docker', ['image', 'rm', '--force', image], { encoding: 'utf8' });
  });

  it('runs from a campaign file and leaves the workspace behind, with no container', async () => {
    // A repository of its own, so the benchmark's own runs/ and results/ stay untouched.
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script.json');

    let output = '';
    const code = await main(['campaign', 'run', join(root, 'campaigns', 'smoke.yaml')], {
      stdout: (text) => (output += text),
      stderr: (text) => (output += text),
    });

    expect({ code, output }).toEqual({
      code: 0,
      output: expect.stringContaining('1 run completed, 0 failed'),
    });
    image = /campaign ([0-9a-f]{12})/.exec(output)?.[1] ?? '';
    expect(image).toMatch(/^[0-9a-f]{12}$/);

    const workspace = join(root, 'runs', image, '1', 'T0@1.0', 'baseline', 'fake-model', 'r1', 'workspace');
    expect(readFileSync(join(workspace, 'hello.txt'), 'utf8')).toBe('hello\n');
    expect(existsSync(join(workspace, '.git'))).toBe(true);
    expect(existsSync(join(root, 'results', image, '1', 'campaign.yaml'))).toBe(true);

    // No container is left, and the image is the campaign's.
    const containers = execFileSync('docker', ['ps', '--all', '--format', '{{.Names}}'], {
      encoding: 'utf8',
    });
    expect(containers).not.toContain(`bench-${image}-`);
    const images = execFileSync('docker', ['image', 'ls', '--format', '{{.Repository}}'], {
      encoding: 'utf8',
    });
    expect(images.split('\n')).toContain(image);
  });

  it('W2: a multi-step run, with usage captured per step and interventions counted', async () => {
    // Real Docker, and the fake replaying sessions the real agent produced during the spike: one
    // question, one approval request, one session that simply finished. No credential, no spending.
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script-multi-step.json');

    let output = '';
    const code = await main(['campaign', 'run', join(root, 'campaigns', 'multi-step.yaml')], {
      stdout: (text) => (output += text),
      stderr: (text) => (output += text),
    });

    expect({ code, output }).toEqual({
      code: 0,
      output: expect.stringContaining('1 run completed, 0 failed'),
    });
    image = /campaign ([0-9a-f]{12})/.exec(output)?.[1] ?? '';
    expect(image).toMatch(/^[0-9a-f]{12}$/);
    const name = ['T1@1.0', 'baseline', 'fake-model', 'r1'];
    const workspace = join(root, 'runs', image, '1', ...name, 'workspace');
    const outputDir = join(root, 'results', image, '1', 'runs', ...name);

    // One session per step, each continued by its own resumes, and every step completed.
    const record = JSON.parse(readFileSync(join(outputDir, 'run.json'), 'utf8')) as {
      approver_policy: string;
      interventions: unknown[];
      steps: { n: number; session: string; outcome: string; interventions: number }[];
    };
    expect(record.steps.map(({ n, outcome, interventions }) => ({ n, outcome, interventions }))).toEqual([
      { n: 1, outcome: 'completed', interventions: 1 },
      { n: 2, outcome: 'completed', interventions: 1 },
      { n: 3, outcome: 'completed', interventions: 0 },
    ]);
    expect(new Set(record.steps.map((step) => step.session)).size).toBe(3);
    // The interventions counted, with their kind and reply, under the policy version.
    expect(record.approver_policy).toBe('v1');
    expect(record.interventions).toEqual([
      {
        step: 1,
        kind: 'question',
        reply: 'No further input is available. Make the most reasonable choice, record it, and proceed.',
      },
      { step: 2, kind: 'approval', reply: 'Approved. Proceed.' },
    ]);

    // A `step <NN>` commit per step, in the container's own repository.
    const subjects = execFileSync('git', ['-C', workspace, '-c', 'safe.directory=*', 'log', '--format=%s'], {
      encoding: 'utf8',
    });
    expect(subjects.trim().split('\n')).toEqual(['step 03', 'step 02', 'step 01', 'seed']);

    // A patch per step, holding what that step and its resumes did in the container.
    const patch = (n: string) => readFileSync(join(outputDir, 'steps', n, 'diff.patch'), 'utf8');
    expect(patch('01')).toMatch(/\+\+\+ b\/cache\.txt[\s\S]*\+cache\n\+redis/);
    expect(patch('02')).toMatch(/\+\+\+ b\/deleted\.txt/);
    expect(patch('02')).not.toContain('old.txt');
    expect(patch('03')).toMatch(/\+\+\+ b\/ready\.txt/);

    // Usage per step: the step's session and its resume, as the parser reads the two recordings.
    const recording = (file: string) =>
      readFileSync(repoPath(join('test/fixtures/sessions', file)), 'utf8')
        .split('\n')
        .filter(Boolean);
    const expected = {
      '01': ['question.jsonl', 'resumed.jsonl'],
      '02': ['approval.jsonl', 'completed.jsonl'],
      '03': ['completed.jsonl'],
    };
    for (const [n, files] of Object.entries(expected)) {
      const usage: unknown = JSON.parse(readFileSync(join(outputDir, 'steps', n, 'usage.json'), 'utf8'));
      expect(usage).toEqual(readSession(files.flatMap(recording), 1).usage);
    }

    // No container is left.
    const containers = execFileSync('docker', ['ps', '--all', '--format', '{{.Names}}'], {
      encoding: 'utf8',
    });
    expect(containers).not.toContain(`bench-${image}-`);
  });

  it('bug-003: a container an interrupted run left behind is reported, never removed', async () => {
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script.json');
    const campaign = join(root, 'campaigns', 'smoke.yaml');
    const run = async () => {
      let output = '';
      const code = await main(['campaign', 'run', campaign], {
        stdout: (text) => (output += text),
        stderr: (text) => (output += text),
      });
      return { code, output };
    };

    const first = await run();
    expect(first.code).toBe(0);
    image = /campaign ([0-9a-f]{12})/.exec(first.output)?.[1] ?? '';
    // What an interrupted run leaves: a container with the name execution 1's run used.
    const stale = `bench-${image}-1-T0-1.0-baseline-fake-model-r1`;
    execFileSync('docker', ['create', '--name', stale, image, 'sleep', 'infinity'], { encoding: 'utf8' });
    try {
      // With the results gone the rerun is execution 1 again, and needs that very name.
      rmSync(join(root, 'results'), { recursive: true, force: true });
      const collided = await run();
      expect(collided.code).toBe(1);
      expect(collided.output).toContain(
        `container ${stale} already exists: an interrupted run of execution 1 of this campaign left it ` +
          `behind (bug-003). Remove it with: docker rm --force ${stale}`,
      );

      // The ordinary rerun gets the next execution: it warns about the leftover and completes.
      const rerun = await run();
      expect(rerun.code).toBe(0);
      expect(rerun.output).toContain(
        `container ${stale} was left behind by an interrupted run of execution 1 of this campaign`,
      );

      // And the runner removed nothing it did not create.
      const names = execFileSync('docker', ['ps', '--all', '--format', '{{.Names}}'], { encoding: 'utf8' });
      expect(names.split('\n')).toContain(stale);
    } finally {
      execFileSync('docker', ['rm', '--force', stale], { encoding: 'utf8' });
    }
  });
});
