import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readRunDetail, resolveRun } from '../../../src/results/index.js';
import { CANCEL, storedRun } from '../../support/score-fixture.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** Add `interventions` and a harness to a stored run's `run.json`, as the runner writes them. */
function withRecord(runDir: string, extra: Record<string, unknown>): void {
  const file = join(runDir, 'run.json');
  const run = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  writeFileSync(file, JSON.stringify({ ...run, ...extra }));
}

describe('readRunDetail (F5.3, task-043)', () => {
  it("reads a run's record, each step's stored files, and no score before scoring", async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    withRecord(fixture.runDir, {
      approver_policy: 'v1',
      harness: { tool: 'wingfoil', commit: 'abc123' },
      interventions: [{ step: 2, kind: 'question', reply: 'Proceed.' }],
    });
    writeFileSync(join(fixture.runDir, 'steps', '01', 'transcript.jsonl'), '{"type":"system"}\n{"type":"result"}\n');

    const detail = readRunDetail(fixture.runDir);

    if (!detail.ok) throw new Error(JSON.stringify(detail.issues));
    const run = detail.value;
    expect(run).toMatchObject({
      name: 'abcdef012345/1/runs/T3@1.0/baseline/fake-model/r1',
      origin: { campaign: 'abcdef012345', execution: '1' },
      scenario: 'T3',
      version: '1.0',
      arm: 'baseline',
      model: 'fake-model',
      repetition: 1,
      outcome: 'completed',
      approverPolicy: 'v1',
      harness: { tool: 'wingfoil', commit: 'abc123' },
      manualTokens: 3,
      interventions: [{ step: 2, kind: 'question', reply: 'Proceed.' }],
    });
    expect(run.score).toBeUndefined();
    expect(run.steps.map((step) => step.n)).toEqual([1, 2]);
    const [first, second] = run.steps;
    expect(first).toMatchObject({ session: 'session-1', outcome: 'completed', usage: { costUsd: 0.1 } });
    expect(first?.transcript).toEqual(['{"type":"system"}', '{"type":"result"}']);
    // Transcripts are git-ignored (REQ-RES-06): one not on disk is absent, never an error.
    expect(second?.transcript).toBeUndefined();
    expect(second?.patch).toContain('src/orders.ts');
    expect(second?.messages).toEqual([]);
  });

  it('reads the score when there is one, and a dry run as one', async () => {
    const fixture = await storedRun({ steps: [CANCEL, CANCEL], into: { root: tempDir('bench-detail-'), execution: 'dry-runs/2' } });
    writeFileSync(join(fixture.runDir, 'score.json'), JSON.stringify({ score_version: 1, steps: [], final: { not_reached: true } }));
    const detail = readRunDetail(fixture.runDir);
    expect(detail.ok && detail.value.origin).toEqual({ dryRun: true, execution: '2' });
    expect(detail.ok && detail.value.score).toMatchObject({ final: { not_reached: true } });
  });

  it('refuses a directory with no run in it, and a run.json that is not JSON', () => {
    const empty = tempDir('bench-detail-empty-');
    expect(readRunDetail(empty)).toEqual({ ok: false, issues: [{ path: 'run.json', message: expect.stringContaining('cannot be read') }] });
    writeFileSync(join(empty, 'run.json'), '{');
    expect(readRunDetail(empty).ok).toBe(false);
  });
});

describe('resolveRun (task-043)', () => {
  it("takes a run's directory, or its name under results/ as aggregate.json writes it", async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    const name = relative(join(fixture.root, 'results'), fixture.runDir);
    expect(resolveRun(fixture.root, fixture.runDir)).toEqual({ ok: true, value: fixture.runDir });
    expect(resolveRun(fixture.root, name)).toEqual({ ok: true, value: fixture.runDir });
  });

  it('refuses anything that holds no run.json, naming it', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    mkdirSync(join(fixture.root, 'elsewhere'));
    expect(resolveRun(fixture.root, 'abcdef012345/9/runs/nothing')).toEqual({
      ok: false,
      issues: [{ path: 'abcdef012345/9/runs/nothing', message: 'is not a stored run' }],
    });
    expect(resolveRun(fixture.root, join(fixture.root, 'elsewhere')).ok).toBe(false);
  });

  it('keeps the agent\'s version and the expected-failure mark, pins the record holds', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    withRecord(fixture.runDir, {
      agent: { name: 'claude-code', version: '2.1.0' },
      expected_failure: { missing: ['directive-delivery'] },
    });
    const detail = readRunDetail(fixture.runDir);
    expect(detail.ok && detail.value).toMatchObject({
      agent: 'claude-code 2.1.0',
      expectedFailure: ['directive-delivery'],
    });
  });

  it('names a run by its layout only when it ends in r<k> under <n>/runs', () => {
    const dir = join(tempDir('bench-detail-shape-'), 'x', 'notanumber', 'runs', 'a', 'b', 'c', 'd');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'run.json'),
      JSON.stringify({ scenario: 'T3', version: '1.0', scenario_hash: 'h', arm: 'a', model: 'm', repetition: 1, outcome: 'completed', steps: [] }),
    );
    expect(readRunDetail(dir).ok && (readRunDetail(dir) as { value: { name: string } }).value.name).toBe(dir);
  });
});

