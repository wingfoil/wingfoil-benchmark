import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AgentPort } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import { CANCEL, EXECUTION, scoringDocker, storedRun } from '../support/score-fixture.js';

const NO_AGENT: AgentPort = {
  runStep: () => Promise.reject(new Error('scoring runs no agent')),
  resume: () => Promise.reject(new Error('scoring runs no agent')),
};

/** `bench score` on the fixture's execution, with Docker replaced by the scoring double. */
async function benchScore(root: string) {
  const { docker, recorded } = scoringDocker();
  let stdout = '';
  const code = await main(
    ['score', EXECUTION],
    { stdout: (text) => (stdout += text), stderr: () => undefined },
    { docker, git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, recorded };
}

// T3 stands in for S1 until W7: two steps, one suite scored after both. Its one hidden test fails on
// the seed and after step 1 (which changed nothing), and passes after step 2 (which cancels orders).
describe('scoring.feature', () => {
  it('@F4.1 Hidden tests run outside the container on each snapshot', async () => {
    // Given a completed run with one committed snapshot per step
    const fixture = await storedRun({ steps: [{}, CANCEL] });

    // When the run is scored
    const { code, recorded } = await benchScore(fixture.root);

    // Then the scenario's hidden tests are executed in a scoring environment separate from the run
    // container: every container is a scoring one — no network, the suite mounted read-only, the
    // snapshot copied in — from the scoring image; the double refuses any run-container call.
    expect(code).toBe(0);
    expect(recorded.creates.length).toBeGreaterThan(0);
    for (const create of recorded.creates) {
      expect(create.image).toMatch(/^bench-score:/);
      expect(create.readOnly).toEqual([
        { source: join(fixture.scenario.dir, 'oracle', 'public'), target: '/score/oracle/public' },
      ]);
    }
    expect(recorded.copies.every((copy) => copy.endsWith(':/score/seed'))).toBe(true);
    expect(recorded.removes).toHaveLength(recorded.creates.length);

    // And M-Q1 is recorded for the final snapshot and for every step that defines tests
    const score = JSON.parse(readFileSync(join(fixture.runDir, 'score.json'), 'utf8')) as {
      steps: { n: number; m_q1: { passed: number; total: number } }[];
      final: { step: number; m_q1: { passed: number; total: number } };
    };
    expect(score.steps.map((step) => [step.n, step.m_q1])).toEqual([
      [1, { passed: 0, total: 1 }],
      [2, { passed: 1, total: 1 }],
    ]);
    expect(score.final).toMatchObject({ step: 2, m_q1: { passed: 1, total: 1 } });
  });

  it('@F4.1 Scoring the same snapshot twice gives the same result', async () => {
    // Given a run that was already scored
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    await benchScore(fixture.root);
    const first = readFileSync(join(fixture.runDir, 'score.json'));

    // When it is scored again with the same oracle version
    const again = await benchScore(fixture.root);

    // Then every recorded metric is identical
    expect(again.code).toBe(0);
    expect(readFileSync(join(fixture.runDir, 'score.json'))).toEqual(first);
  });
});
