import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { readSession } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { dryRunProfileYaml, priceCampaign, writeDryRunProfile } from '../support/dry-run-fixture.js';
import { repoPath } from '../support/paths.js';
import { referenceScript } from '../support/reference.js';
import { tempDir } from '../support/scenario-fixture.js';

/**
 * The waves' "Ends with" against the real Docker: W1's trivial scenario, and W2's multi-step run.
 * These are the only tests that need Docker, so they live outside `npm test` (`npm run test:docker`).
 * Do not interrupt them: a run killed mid-way leaves its container behind (bug-003).
 */
describe('runs in a real container', () => {
  let image = '';
  /** Images a test built besides `image`: one per dry run (W7). */
  const images: string[] = [];

  afterEach(() => {
    for (const built of [image, ...images.splice(0)]) {
      if (built !== '') execFileSync('docker', ['image', 'rm', '--force', built], { encoding: 'utf8' });
    }
    // Removed once: a later test that builds through `images` only must not remove it again.
    image = '';
  });

  it('runs from a campaign file and leaves the workspace behind, with no container', async () => {
    // A repository of its own, so the benchmark's own runs/ and results/ stay untouched.
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script.json');

    let output = '';
    priceCampaign(join(root, 'campaigns', 'smoke.yaml'));
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
    expect(readFileSync(join(workspace, 'CLAUDE.md'), 'utf8')).toBe(
      readFileSync(repoPath('test/fixtures/arms/baseline/manual.md'), 'utf8'),
    );

    // W3: the arm's setup ran in the container, as its user, from the arm's copy outside the workspace;
    // the agent's identity is in the workspace's own config; the history is seed, setup, step 01.
    const output1 = join(root, 'results', image, '1', 'runs', 'T0@1.0', 'baseline', 'fake-model', 'r1');
    expect(readFileSync(join(output1, 'setup', 'log.txt'), 'utf8')).toBe(
      'fixture setup ran as node in /workspace, from /home/node/arm\n',
    );
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', workspace, '-c', 'safe.directory=*', ...args], { encoding: 'utf8' }).trim();
    expect(git('log', '--format=%s <%ae>').split('\n')).toEqual([
      'step 01 <benchmark@localhost>',
      'setup <benchmark@localhost>',
      'seed <benchmark@localhost>',
    ]);
    expect([git('config', '--local', 'user.name'), git('config', '--local', 'user.email')]).toEqual([
      'Benchmark Approver',
      'approver@benchmark.localhost',
    ]);
    const record = JSON.parse(readFileSync(join(output1, 'run.json'), 'utf8')) as {
      setup: { commit: string };
    };
    expect(record.setup.commit).toBe(git('rev-parse', 'HEAD~1'));

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

  it('W6: a run scored outside its container, its hidden tests executed on every snapshot', async () => {
    // T3 in the baseline arm, the fake writing a binary file in step 1 and the cancellation in step 2.
    // Then `bench score`: the snapshots rebuilt from what the run stored, T3's hidden test run by
    // node:test with tsx in the scoring image, against the census on the seed. No credential, no spending.
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script-scoring.json');
    const campaign = join(root, 'campaigns', 'scoring.yaml');
    priceCampaign(campaign);
    let output = '';
    const io = { stdout: (text: string) => (output += text), stderr: (text: string) => (output += text) };

    expect(await main(['campaign', 'run', campaign], io)).toBe(0);
    image = /campaign ([0-9a-f]{12})/.exec(output)?.[1] ?? '';
    output = '';

    // A hold-out for T3 (task-028): two tests beside the public suite, importing the code under test as
    // its tests do. Step 2's cancellation keeps an order cancelled, but does not refuse a second one.
    const holdout = tempDir('bench-holdout-');
    mkdirSync(join(holdout, 'scenarios', 'T3', '1.0', 'orders'), { recursive: true });
    writeFileSync(
      join(holdout, 'scenarios', 'T3', '1.0', 'orders', 'refund.test.ts'),
      [
        "import assert from 'node:assert/strict';",
        "import { it } from 'node:test';",
        '',
        "it('refuses a second cancellation', async () => {",
        "  const { cancel } = await import('../../seed/src/orders.js');",
        "  assert.equal(typeof cancel, 'function');",
        "  assert.throws(() => cancel(cancel({ id: 'o-2', status: 'pending' })));",
        '});',
        "it('keeps a cancelled order cancelled', async () => {",
        "  const { cancel } = await import('../../seed/src/orders.js');",
        "  assert.equal(cancel({ id: 'o-3', status: 'pending' }).status, 'cancelled');",
        '});',
        '',
      ].join('\n'),
    );

    expect(await main(['score', `${image}/1`, '--holdout', holdout], io, undefined, root)).toBe(0);
    // Step 1 fails the hidden test (the seed cannot cancel), step 2 passes it: shown able to fail. The
    // hold-out's two tests, apart: none after step 1, one after step 2.
    expect(output).toBe(
      'T3@1.0 baseline fake-model r1: step 01 0/1, step 02 1/1, final 1/1; hold-out final 1/2\n' +
        `aggregate: results/${image}/1/aggregate.json (1 group, 0 slices)\n`,
    );
    const runDir = join(root, 'results', image, '1', 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r1');
    const scoreFile = join(runDir, 'score.json');
    const first = readFileSync(scoreFile);
    const score = JSON.parse(first.toString('utf8')) as {
      scorer: { image: string; tsx: string };
      steps: { suites: { failed: string[] }[] }[];
    };
    expect(score.scorer).toEqual({
      image: expect.stringMatching(/^bench-score:[0-9a-f]{12}$/),
      tsx: '4.23.15',
    });
    expect(score.steps[0]?.suites[0]?.failed).toEqual([
      'oracle/public/cancel.test.ts > cancelling an order > marks a pending order as cancelled',
    ]);

    expect(JSON.parse(first.toString('utf8'))).toMatchObject({
      holdout: {
        scored: true,
        steps: [{ m_q1: { passed: 0, total: 2 } }, { m_q1: { passed: 1, total: 2 } }],
      },
    });
    expect(first.toString('utf8')).not.toContain('second cancellation');
    // M-K1 and M-K2 from what the real runner stored (task-029): the fake reports no usage, so every
    // figure is zero, per step and for the run, at the campaign's rate.
    expect(JSON.parse(first.toString('utf8'))).toMatchObject({
      cost: {
        usd_to_eur: 1,
        steps: [
          { n: 1, outcome: 'completed', cost_eur: 0, interventions: 0 },
          { n: 2, outcome: 'completed', cost_eur: 0, interventions: 0 },
        ],
        run: { cost_usd: 0, cost_reported: true, turns: 0 },
      },
    });

    // Scored again: the same bytes (REQ-SCO-03). And no scoring container is left.
    output = '';
    expect(await main(['score', `${image}/1`, '--holdout', holdout], io, undefined, root)).toBe(0);
    expect(readFileSync(scoreFile)).toEqual(first);
    // W7 (task-034): the execution's aggregate, from the committed files only, the same bytes again.
    const aggregateFile = join(root, 'results', image, '1', 'aggregate.json');
    const aggregate = readFileSync(aggregateFile, 'utf8');
    expect(JSON.parse(aggregate)).toMatchObject({
      campaign: image,
      execution: 1,
      groups: [
        {
          runs: [`${image}/1/runs/T3@1.0/baseline/fake-model/r1`],
          n: 1,
          preliminary: true,
          metrics: { m_q1: { final: { m_q1: { values: [{ passed: 1, total: 1 }] } } } },
        },
      ],
      slices: [],
    });
    const containers = execFileSync('docker', ['ps', '--all', '--format', '{{.Names}}'], {
      encoding: 'utf8',
    });
    expect(containers).not.toContain('bench-score-');
  });

  it('W2: a multi-step run, with usage captured per step and interventions counted', async () => {
    // Real Docker, and the fake replaying sessions the real agent produced during the spike: one
    // question, one approval request, one session that simply finished. No credential, no spending.
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script-multi-step.json');

    let output = '';
    priceCampaign(join(root, 'campaigns', 'multi-step.yaml'));
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
    expect(subjects.trim().split('\n')).toEqual(['step 03', 'step 02', 'step 01', 'setup', 'seed']);

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

  it('W5 (task-021): a dry run in a real container, stored under results/dry-runs/', async () => {
    // T1 in the baseline arm, with the fake replaying the W2 spike's sessions, which report the costs
    // the real agent reported. No credential, no spending.
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
    cpSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    writeDryRunProfile(root, { ...dryRunProfileYaml(), harnesses: {}, currency: { usd_to_eur: 1 } });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script-multi-step.json');

    let output = '';
    const code = await main(
      ['scenario', 'dry-run', 'T1@1.0', '--arm', 'baseline'],
      { stdout: (text) => (output += text), stderr: (text) => (output += text) },
      undefined,
      root,
    );

    expect({ code, output }).toEqual({
      code: 0,
      output: expect.stringMatching(
        /dry run T1@1\.0 in baseline: completed, [0-9.]+ USD .* — results\/dry-runs\/1\n$/,
      ),
    });
    image = /dry run (dry-[0-9a-f]{12}), execution 1/.exec(output)?.[1] ?? '';
    expect(image).toMatch(/^dry-[0-9a-f]{12}$/);
    const record = JSON.parse(
      readFileSync(
        join(root, 'results', 'dry-runs', '1', 'runs', 'T1@1.0', 'baseline', 'fake-model', 'r1', 'run.json'),
        'utf8',
      ),
    ) as { dry_run: boolean; outcome: string; steps: { usage: { costUsd: number } }[] };
    expect(record).toMatchObject({ dry_run: true, outcome: 'completed' });
    const total = record.steps.reduce((sum, step) => sum + step.usage.costUsd, 0);
    expect(total).toBeGreaterThan(0);
    expect(output).toContain(`completed, ${total.toFixed(4)} USD`);
    expect(existsSync(join(root, 'results', 'dry-runs', '1', 'dry-run.yaml'))).toBe(true);

    // No container is left.
    const containers = execFileSync('docker', ['ps', '--all', '--format', '{{.Names}}'], {
      encoding: 'utf8',
    });
    expect(containers).not.toContain(`bench-${image}-`);
  });

  it('task-024: a step past its step_time_s is killed in the container, its work up to then kept', async () => {
    // T3's first step writes a file, then sleeps 30 s against a 2 s cap. The fake reports no cost, so
    // the killed step counts at its bound — the whole run cap — and step 2 is not started.
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script-time-cap.json');
    priceCampaign(join(root, 'campaigns', 'time-cap.yaml'));

    let output = '';
    const started = Date.now();
    const code = await main(['campaign', 'run', join(root, 'campaigns', 'time-cap.yaml')], {
      stdout: (text) => (output += text),
      stderr: (text) => (output += text),
    });

    expect(code).toBe(1);
    expect(output).toContain('step 01: time cap reached (2 s)');
    expect(output).toContain('0 runs completed, 0 failed, 1 cap reached');
    image = /campaign ([0-9a-f]{12})/.exec(output)?.[1] ?? '';
    const name = ['T3@1.0', 'baseline', 'fake-model', 'r1'];
    const workspace = join(root, 'runs', image, '1', ...name, 'workspace');
    expect(readFileSync(join(workspace, 'before.txt'), 'utf8')).toBe('before\n');
    expect(existsSync(join(workspace, 'never.txt'))).toBe(false);
    expect(existsSync(join(workspace, 'after.txt'))).toBe(false);
    const record = JSON.parse(
      readFileSync(join(root, 'results', image, '1', 'runs', ...name, 'run.json'), 'utf8'),
    ) as {
      outcome: string;
      steps: { outcome: string; cost_reported?: boolean; cost_bound_usd?: number }[];
    };
    expect(record.outcome).toBe('cap reached');
    expect(record.steps).toMatchObject([
      { outcome: 'time cap reached', cost_reported: false, cost_bound_usd: 0.01 },
    ]);
    // Killed at the cap, not after the sleep.
    expect(Date.now() - started).toBeLessThan(60_000);

    const containers = execFileSync('docker', ['ps', '--all', '--format', '{{.Names}}'], {
      encoding: 'utf8',
    });
    expect(containers).not.toContain(`bench-${image}-`);
  });

  /** The WingFoil clone the WingFoil under test is built from (REQ-RUN-14): the one next to this repository. */
  const clone = process.env.BENCH_WINGFOIL_REPO ?? repoPath('../WingFoil2');

  /** The hold-out repository, when this machine has one (K2): S1's additions, S2's answer key. */
  const holdoutRepo = process.env.BENCH_HOLDOUT_PATH ?? repoPath('../WingFoil2-Benchmark-HoldOut');
  const hasHoldout = (id: string) => existsSync(join(holdoutRepo, 'scenarios', id, '1.0'));
  /** S2's reference is its answer key, in the hold-out only (W7 decision 5). */
  const s2Reference = join(holdoutRepo, 'reference', 'S2');

  interface ScoreFile {
    steps: { n: number; suites: { id: string; passed: number; total: number }[] }[];
    final: { m_q1: { passed: number; total: number } };
    holdout: { scored: boolean; final?: { m_q1: { passed: number; total: number } } };
  }

  /**
   * W7 (task-032, task-033): `id`@1.0 dry-run in `arm` with the fake replaying its reference, then scored
   * by the real scoring image, with the hold-out when there is one — the wave check's half (W7 decision
   * 4). Returns each step's suites as `passed/total`, and the score. No credential, no spending.
   */
  async function scoredInArm(
    root: string,
    id: string,
    arm: string,
    execution: number,
  ): Promise<{ suites: Record<string, string>[]; score: ScoreFile }> {
    let output = '';
    const code = await main(
      ['scenario', 'dry-run', `${id}@1.0`, '--arm', arm],
      { stdout: (text) => (output += text), stderr: (text) => (output += text) },
      undefined,
      root,
    );
    expect({ code, output }).toEqual({
      code: 0,
      output: expect.stringContaining(`dry run ${id}@1.0 in ${arm}: completed`),
    });
    images.push(/dry run (dry-[0-9a-f]{12}), execution/.exec(output)?.[1] ?? '');

    let scored = '';
    const scoreCode = await main(
      ['score', `dry-runs/${execution}`, ...(hasHoldout(id) ? ['--holdout', holdoutRepo] : [])],
      { stdout: (text) => (scored += text), stderr: (text) => (scored += text) },
      undefined,
      root,
    );
    expect(scoreCode).toBe(0);
    const file = join(
      root,
      'results',
      'dry-runs',
      String(execution),
      'runs',
      `${id}@1.0`,
      arm,
      'fake-model',
      'r1',
    );
    const score = JSON.parse(readFileSync(join(file, 'score.json'), 'utf8')) as ScoreFile;
    if (hasHoldout(id)) {
      // Counts only, all passing; no hold-out name reaches the output.
      expect(score.holdout.scored).toBe(true);
      expect(score.holdout.final?.m_q1.passed).toBe(score.holdout.final?.m_q1.total);
      expect(scored).not.toMatch(/holdout\/|\.holdout/);
    }
    const suites = score.steps.map((step) =>
      Object.fromEntries(step.suites.map((suite) => [suite.id, `${suite.passed}/${suite.total}`])),
    );
    return { suites, score };
  }

  /** A repository with scenario `id` and the benchmark's own arms, the fake replaying `reference`. */
  function scenarioRepository(id: string, reference: string, harnesses: Record<string, unknown>): string {
    const root = tempDir('bench-docker-');
    cpSync(repoPath(`scenarios/${id}`), join(root, 'scenarios', id), { recursive: true });
    cpSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    cpSync(repoPath('arms'), join(root, 'arms'), { recursive: true });
    writeDryRunProfile(root, { ...dryRunProfileYaml(), harnesses, currency: { usd_to_eur: 1 } });
    process.env.BENCH_FAKE_SCRIPT = referenceScript(id, reference);
    return root;
  }

  async function s1InArm(root: string, arm: string, execution: number): Promise<void> {
    const { suites, score } = await scoredInArm(root, 'S1', arm, execution);
    // Pointer after step 1; Patch rising from step 2 to step 3, and kept at step 4; Merge Patch.
    expect(suites[0]).toEqual({ pointer: '12/12' });
    expect(suites[1]?.patch).not.toBe('108/108');
    expect(suites[2]).toEqual({ patch: '108/108' });
    expect(suites[3]).toEqual({ patch: '108/108', 'merge-patch': '15/15' });
    expect(score.final.m_q1).toEqual({ passed: 135, total: 135 });
  }

  async function s2InArm(root: string, arm: string, execution: number): Promise<void> {
    const { suites, score } = await scoredInArm(root, 'S2', arm, execution);
    // Each report's tests green from its step on; the rules and the false report's behaviour kept.
    expect(suites).toEqual([
      { regression: '16/16', 'reports-1': '3/3' },
      { regression: '16/16', 'reports-1': '3/3', 'reports-2': '2/2', 'false-report': '1/1' },
      {
        regression: '16/16',
        'reports-1': '3/3',
        'reports-2': '2/2',
        'false-report': '1/1',
        'reports-3': '2/2',
      },
    ]);
    expect(score.final.m_q1).toEqual({ passed: 24, total: 24 });
  }

  const s1Reference = repoPath('test/fixtures/reference/S1');
  const withClone = () => {
    process.env.BENCH_WINGFOIL_REPO = clone;
    return dryRunProfileYaml().harnesses as Record<string, unknown>;
  };

  it('W7 (task-032): S1 in the baseline arm, scored by its real oracle', async () => {
    await s1InArm(scenarioRepository('S1', s1Reference, {}), 'baseline', 1);
  });

  it.skipIf(!existsSync(join(clone, '.git')))(
    'W7 (task-032): S1 in the baseline-docs and wingfoil arms, scored by its real oracle',
    async () => {
      const root = scenarioRepository('S1', s1Reference, withClone());
      await s1InArm(root, 'baseline-docs', 1);
      await s1InArm(root, 'wingfoil', 2);
    },
  );

  // S2's reference is the answer key: without the hold-out there is nothing to replay (decision 5).
  it.skipIf(!existsSync(s2Reference))(
    'W7 (task-033): S2 in the baseline arm, scored by its real oracle',
    async () => {
      await s2InArm(scenarioRepository('S2', s2Reference, {}), 'baseline', 1);
    },
  );

  it.skipIf(!existsSync(s2Reference) || !existsSync(join(clone, '.git')))(
    'W7 (task-033): S2 in the baseline-docs and wingfoil arms, scored by its real oracle',
    async () => {
      const root = scenarioRepository('S2', s2Reference, withClone());
      await s2InArm(root, 'baseline-docs', 1);
      await s2InArm(root, 'wingfoil', 2);
    },
  );

  it.skipIf(!existsSync(join(clone, '.git')))(
    "W3: the same scenario in the baseline, baseline-docs and wingfoil arms — @F2.6, REQ-RUN-17, @F2.5's generator",
    async () => {
      const root = tempDir('bench-docker-');
      cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
      cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
      cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
      // The benchmark's own wingfoil arm, not a fixture: its setup is what is under test here.
      cpSync(repoPath('arms/wingfoil'), join(root, 'arms', 'wingfoil'), { recursive: true });
      cpSync(repoPath('arms/baseline-docs'), join(root, 'arms', 'baseline-docs'), { recursive: true });
      process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script-arms.json');
      process.env.BENCH_WINGFOIL_REPO = clone;

      let output = '';
      priceCampaign(join(root, 'campaigns', 'arms.yaml'));
      const code = await main(['campaign', 'run', join(root, 'campaigns', 'arms.yaml')], {
        stdout: (text) => (output += text),
        stderr: (text) => (output += text),
      });

      expect({ code, output }).toEqual({
        code: 0,
        output: expect.stringContaining('3 runs completed, 0 failed'),
      });
      image = /campaign ([0-9a-f]{12})/.exec(output)?.[1] ?? '';
      const sha = execFileSync('git', ['-C', clone, 'rev-parse', '3df305e^{commit}'], {
        encoding: 'utf8',
      }).trim();
      const run = (arm: string) =>
        join(root, 'runs', image, '1', 'T2@1.0', arm, 'fake-model', 'r1', 'workspace');
      const out = (arm: string) =>
        join(root, 'results', image, '1', 'runs', 'T2@1.0', arm, 'fake-model', 'r1');
      const git = (arm: string, ...args: string[]) =>
        execFileSync('git', ['-C', run(arm), '-c', 'safe.directory=*', ...args], { encoding: 'utf8' }).trim();

      // Given the campaign pins wingfoil@3df305e, when the runner sets up the wingfoil arm, then the
      // WingFoil installed in the container is built from that commit…
      const record = JSON.parse(readFileSync(join(out('wingfoil'), 'run.json'), 'utf8')) as {
        harness: { commit: string; tarball_sha256: string };
      };
      expect(record.harness.commit).toBe(sha);
      expect(record.harness.tarball_sha256).toMatch(/^[0-9a-f]{64}$/);
      // …and independent of the managing WingFoil: installed from the artefact, found on the PATH the
      // image gives the arm, not in vendor/ nor on the host.
      expect(readFileSync(join(out('wingfoil'), 'setup', 'log.txt'), 'utf8')).toContain(
        `WingFoil under test: commit ${sha}, at /home/node/.local/bin/wingfoil`,
      );

      // The scenario's configuration is in the wingfoil arm (dl-005), with the approver declared…
      expect(existsSync(join(run('wingfoil'), '.wingfoil', 'directives', 'custom', 'no-throw.md'))).toBe(
        true,
      );
      expect(
        existsSync(
          join(
            run('wingfoil'),
            'docs',
            'memory',
            'decision-log',
            'dl-001-errors-are-returned-as-a-result.md',
          ),
        ),
      ).toBe(true);
      expect(readFileSync(join(run('wingfoil'), '.wingfoil', 'dna.yaml'), 'utf8')).toMatch(
        /name: Benchmark Approver\n\s+email: approver@benchmark\.localhost\n\s+roles:\n\s+- approver/,
      );
      // …and absent from the baseline arm, which ran the same scenario.
      expect(existsSync(join(run('baseline'), '.wingfoil'))).toBe(false);
      expect(readFileSync(join(run('baseline'), 'cancel.txt'), 'utf8')).toBe('cancel\n');

      // F2.7: each arm's manual is its CLAUDE.md, and the commands the wingfoil manual prescribes for
      // reading the rules work against the WingFoil under test (the fake runs them in step 2).
      for (const arm of ['baseline', 'wingfoil']) {
        expect(readFileSync(join(run(arm), 'CLAUDE.md'), 'utf8')).toBe(
          readFileSync(join(root, 'arms', arm, 'manual.md'), 'utf8'),
        );
      }
      expect(readFileSync(join(run('wingfoil'), 'rules.json'), 'utf8')).toContain('no-throw');
      expect(readFileSync(join(run('wingfoil'), 'decisions.json'), 'utf8')).toContain(
        'dl-001-errors-are-returned-as-a-result',
      );

      // REQ-RUN-11: baseline-docs received T2's wingfoil configuration as Markdown, the same file the
      // results keep, generated from the snapshot the wingfoil arm's own setup made.
      const generated = join(root, 'results', image, '1', 'generated', 'T2@1.0');
      const rules = readFileSync(join(run('baseline-docs'), 'PROJECT_RULES.md'), 'utf8');
      expect(rules).toBe(readFileSync(join(generated, 'PROJECT_RULES.md'), 'utf8'));
      expect(rules).toContain('### No throw\n\nFunctions of the domain return a `Result` and never throw.\n');
      expect(rules).toContain('### Errors are returned as a Result');
      expect(rules).toContain('**Orders** — A small orders domain.');
      expect(existsSync(join(generated, 'wingfoil', '.wingfoil', 'dna.yaml'))).toBe(true);
      expect(existsSync(join(run('baseline-docs'), '.wingfoil'))).toBe(false);
      expect(existsSync(join(run('baseline'), 'PROJECT_RULES.md'))).toBe(false);
      expect(readFileSync(join(run('baseline-docs'), 'CLAUDE.md'), 'utf8')).toBe(
        readFileSync(join(root, 'arms', 'baseline-docs', 'manual.md'), 'utf8'),
      );

      // REQ-RUN-17: the agent's approval, as the declared member, accepted by WingFoil.
      const approval = git('wingfoil', 'log', '--grep=approve dl-002', '--format=%an <%ae>%n%b');
      expect(approval).toContain('Benchmark Approver <approver@benchmark.localhost>');
      expect(approval).toContain('Approver: Benchmark Approver <approver@benchmark.localhost> (approver)');
      expect(git('wingfoil', 'log', '--format=%s').split('\n')).toEqual([
        'step 02',
        'step 01',
        'wf(decision-log): approve dl-002-orders-are-cancelled-not-deleted [pending → approved]',
        'wf(decision-log): submit dl-002-orders-are-cancelled-not-deleted',
        'wf(decision-log): add dl-002-orders-are-cancelled-not-deleted',
        'setup',
        'chore(wingfoil): declare the Benchmark Approver',
        'chore(wingfoil): apply the scenario configuration',
        'chore(wingfoil): initialize .wingfoil/ with the Kanban template (P5.1.1)',
        'seed',
      ]);

      const containers = execFileSync('docker', ['ps', '--all', '--format', '{{.Names}}'], {
        encoding: 'utf8',
      });
      expect(containers).not.toContain(`bench-${image}-`);
    },
  );

  it('bug-003: a container an interrupted run left behind is reported, never removed', async () => {
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script.json');
    const campaign = join(root, 'campaigns', 'smoke.yaml');
    const run = async () => {
      let output = '';
      priceCampaign(campaign);
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
