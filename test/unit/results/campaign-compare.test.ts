import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { compareExecutions, writeComparison } from '../../../src/results/index.js';
import { benchSite, STAND_INS } from '../../support/site-fixture.js';
import { CANCEL, storedRun } from '../../support/score-fixture.js';
import { tempDir } from '../../support/scenario-fixture.js';
import { loadScenario } from '../../../src/scenario/index.js';

/** The primary category of a scenario version of `root`, as the command line reads it. */
function primaryOf(root: string) {
  return (id: string, version: string) => {
    const scenario = loadScenario(join(root, 'scenarios'), id, version);
    return scenario.ok ? scenario.value.categories.primary : undefined;
  };
}

const EARLIER = '0123456789ab/1';
const NEWER = 'abcdef012345/1';

function pins(scenarios: string[], model = 'fake-model', slices: unknown[] = []): string {
  return stringify({
    harnesses: {},
    scenarios: scenarios.map((id) => ({ id, version: '1.0' })),
    arms: ['baseline', 'wingfoil'],
    agent: { name: 'claude-code', version: '2.1.291' },
    models: { default: model, ...(slices.length === 0 ? {} : { slices }) },
    repetitions: Object.fromEntries(scenarios.map((id) => [id, 1])),
    currency: { usd_to_eur: 0.5 },
  });
}

/**
 * The earlier execution: TC in baseline and wingfoil on fake-model, and a wingfoil slice on other-model. The newer: TC
 * and TD in both arms on fake-model, no slice. Both scored.
 */
async function executions(): Promise<string> {
  const [tc, td] = [STAND_INS[0], STAND_INS[1]];
  const { root } = await storedRun({ variant: tc, steps: [{}, {}], into: { root: tempDir('bench-cmp-'), execution: EARLIER } });
  await storedRun({ variant: tc, steps: [{}, CANCEL], into: { root, execution: EARLIER, arm: 'wingfoil' } });
  await storedRun({ variant: tc, steps: [{}, CANCEL], into: { root, execution: EARLIER, model: 'other-model' } });
  await storedRun({
    variant: tc,
    steps: [{}, CANCEL],
    into: { root, execution: EARLIER, arm: 'wingfoil', model: 'other-model' },
  });
  for (const variant of [tc, td]) {
    for (const arm of ['baseline', 'wingfoil']) {
      await storedRun({ variant, steps: [{}, CANCEL], into: { root, execution: NEWER, arm } });
    }
  }
  const slice = { model: 'other-model', scenarios: ['TC'], arms: ['baseline', 'wingfoil'], repetitions: 1 };
  writeFileSync(join(root, 'results', EARLIER, 'campaign.yaml'), pins(['TC'], 'fake-model', [slice]));
  writeFileSync(join(root, 'results', NEWER, 'campaign.yaml'), pins(['TC', 'TD']));
  for (const target of [EARLIER, NEWER]) {
    const scored = await benchSite(root, 'score', target);
    if (scored.code !== 0) throw new Error(scored.stdout + scored.stderr);
  }
  return root;
}

describe('compareExecutions (REQ-SCO-13, task-083)', () => {
  it('refuses a target that names no execution of a campaign, and one that does not exist', () => {
    const root = tempDir('bench-cmp-');
    const issues = (earlier: string, newer: string) => {
      const result = compareExecutions(root, earlier, newer, primaryOf(root));
      return result.ok ? [] : result.issues.map((issue) => `${issue.path}: ${issue.message}`);
    };
    expect(issues('abc', NEWER)).toContain('abc: is not an execution of a campaign: <campaign-id>/<n>');
    expect(issues(EARLIER, NEWER)).toEqual([
      `results/${EARLIER}: does not exist`,
      `results/${NEWER}: does not exist`,
    ]);
  });

  it('says what it does not compare: a slice with no counterpart, and what is on one side only', async () => {
    const root = await executions();
    const result = compareExecutions(root, EARLIER, NEWER, primaryOf(root));
    if (!result.ok) throw new Error(JSON.stringify(result.issues));

    expect(result.value.not_compared).toEqual([
      {
        scenario: 'TC',
        version: '1.0',
        arm: 'baseline',
        model: 'other-model',
        reason: `not compared: no slice of model other-model in ${NEWER}`,
      },
      {
        scenario: 'TC',
        version: '1.0',
        arm: 'wingfoil',
        model: 'other-model',
        reason: `not compared: no slice of model other-model in ${NEWER}`,
      },
    ]);
    expect(result.value.only_in).toEqual([{ execution: NEWER, scenario: 'TD', version: '1.0', arm: 'baseline' }, { execution: NEWER, scenario: 'TD', version: '1.0', arm: 'wingfoil' }]);
    // The baseline has no delta of its own: only the other arms' rows, one per metric of C's map
    expect(result.value.rows.map((row) => `${row.arm} ${row.metric}`)).toEqual(['wingfoil M-Q1', 'wingfoil M-K1']);
    expect(result.value.rows.every((row) => row.cross_model === false)).toBe(true);
  }, 240_000);

  it('gives the same bytes for the same two executions', async () => {
    const root = await executions();
    const result = compareExecutions(root, EARLIER, NEWER, primaryOf(root));
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const file = writeComparison(root, result.value);
    const first = readFileSync(file, 'utf8');
    writeComparison(root, result.value);
    expect(readFileSync(file, 'utf8')).toBe(first);
    expect(file).toBe(join(root, 'results', 'comparisons', 'abcdef012345-1', '0123456789ab-1.json'));
  }, 240_000);
});
