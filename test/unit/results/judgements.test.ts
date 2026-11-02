import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readJudgements } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** The maintainer's judgements read against an execution's runs (REQ-SCO-06 as amended in 1.49, task-128). */

const RUN = 'runs/S3@1.1/baseline/m/r1';

/** An execution of one run whose `score.json` holds `checks` (or is unreadable), with `judgements` beside it. */
function execution(checks: unknown[] | 'unreadable', judgements: unknown): string {
  const dir = tempDir('bench-judgements-');
  mkdirSync(join(dir, RUN), { recursive: true });
  writeFileSync(join(dir, RUN, 'run.json'), '{}');
  writeFileSync(join(dir, RUN, 'score.json'), checks === 'unreadable' ? '{' : JSON.stringify({ checks }));
  if (judgements !== undefined) writeFileSync(join(dir, 'judgements.json'), JSON.stringify(judgements));
  return dir;
}

const V2 = {
  id: 'd3',
  kind: 'content',
  match: 'words',
  steps: [{ n: 4, passed: false }, { n: 5, not_reached: true }],
};
const V1 = { id: 'd3', kind: 'content', steps: [{ n: 4, passed: true }] };

describe('readJudgements', () => {
  it('reads none when the execution has no judgements.json', () => {
    expect(readJudgements(execution([V2], undefined))).toEqual({ ok: true, value: undefined });
  });

  it('reads each judgement with the automatic verdict of its step', () => {
    const dir = execution([V2], { judgements: [{ run: RUN, check: 'd3', step: 4, verdict: 'pass', note: 'n' }] });
    expect(readJudgements(dir)).toEqual({
      ok: true,
      value: [{ run: RUN, check: 'd3', step: 4, verdict: 'pass', note: 'n', automatic: 'fail' }],
    });
  });

  it('refuses a file beside an execution with no v2 check (every 1.0 one), and an empty file', () => {
    expect(readJudgements(execution([V1], { judgements: [] }))).toEqual({
      ok: false,
      issues: [
        { path: 'judgements.json', message: 'lies beside an execution with no v2 content check, which is not judged' },
      ],
    });
    expect(readJudgements(execution([V2], { judgements: [] }))).toEqual({
      ok: false,
      issues: [{ path: 'judgements.json', message: 'holds no judgement' }],
    });
  });

  it('refuses a step the check did not reach, and a run whose score.json cannot be read', () => {
    expect(readJudgements(execution([V2], { judgements: [{ run: RUN, check: 'd3', step: 5, verdict: 'fail' }] })))
      .toEqual({
        ok: false,
        issues: [{ path: 'judgements.json.judgements[0].step', message: 'the check scored no step 5 of the run' }],
      });
    const other = 'runs/S3@1.1/baseline/m/r2';
    const dir = execution([V2], { judgements: [{ run: other, check: 'd3', step: 4, verdict: 'fail' }] });
    mkdirSync(join(dir, other), { recursive: true });
    writeFileSync(join(dir, other, 'run.json'), '{}');
    writeFileSync(join(dir, other, 'score.json'), '{');
    expect(readJudgements(dir)).toEqual({
      ok: false,
      issues: [{ path: 'judgements.json.judgements[0].run', message: `'${other}' has no readable score.json` }],
    });
  });

  it('refuses a judgement with a field the schema does not have', () => {
    const dir = execution([V2], { judgements: [{ run: RUN, check: 'd3', step: 4, verdict: 'pass', by: 'me' }] });
    expect(readJudgements(dir).ok).toBe(false);
  });
});
