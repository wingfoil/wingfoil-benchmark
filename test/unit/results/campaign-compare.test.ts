import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

/** A group of hand-built figures: M-Q1 passed of 1 per run, M-K1 cost per run, and optionally M-E1's check. */
interface Spec {
  readonly scenario?: string;
  readonly arm: string;
  readonly model?: string;
  readonly q1: readonly number[];
  readonly cost?: readonly number[];
  readonly hash?: string | readonly string[];
  /** M-E1 per run, and the runs that did not reach the check's step. */
  readonly e1?: { readonly violations: readonly number[]; readonly unreached?: readonly number[] };
}

/** An aggregated execution `target` built by hand: its groups, slices and pins, and each run's recorded hash. */
function handBuilt(
  root: string,
  target: string,
  model: string,
  specs: readonly Spec[],
  campaign: Record<string, unknown> = { models: { default: model } },
): void {
  const groups = specs.map((spec) => {
    const scenario = spec.scenario ?? 'TC';
    const runs = spec.q1.map(
      (_, index) => `${target}/runs/${scenario}@1.0/${spec.arm}/${spec.model ?? model}/r${index + 1}`,
    );
    runs.forEach((run, index) => {
      const hashes = spec.hash ?? 'sha256:same';
      const hash = typeof hashes === 'string' ? hashes : hashes[index];
      mkdirSync(join(root, 'results', run), { recursive: true });
      writeFileSync(join(root, 'results', run, 'run.json'), JSON.stringify({ scenario_hash: hash }));
    });
    const value = <T>(values: readonly T[]) => ({ n: values.length, runs, values });
    const reached = runs.filter((_, index) => !(spec.e1?.unreached ?? []).includes(index + 1));
    return {
      scenario,
      version: '1.0',
      arm: spec.arm,
      model: spec.model ?? model,
      runs,
      n: runs.length,
      metrics: {
        m_q1: { final: { m_q1: value(spec.q1.map((passed) => ({ passed, total: 1 }))) } },
        cost: { cost_eur: value(spec.cost ?? spec.q1.map(() => 1)) },
        checks:
          spec.e1 === undefined
            ? []
            : [
                {
                  id: 'rules',
                  kind: 'ast',
                  steps: [
                    {
                      step: 3,
                      violations: { n: reached.length, runs: reached, values: spec.e1.violations },
                      not_reached: runs.filter((run) => !reached.includes(run)),
                    },
                  ],
                },
              ],
      },
    };
  });
  const [campaignId, n] = target.split('/') as [string, string];
  const dir = join(root, 'results', target);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'aggregate.json'),
    JSON.stringify({
      campaign: campaignId,
      execution: Number(n),
      model,
      groups: groups.filter((group) => group.model === model),
      slices: groups.filter((group) => group.model !== model),
    }),
  );
  writeFileSync(join(dir, 'campaign.yaml'), stringify(campaign));
}

/** Every scenario's primary category: TC is C, TE is E, TX has none mapped, TU cannot be read. */
const categories = (id: string) => ({ TC: 'C', TE: 'E', TX: 'B' })[id];

function compared(root: string) {
  const result = compareExecutions(root, EARLIER, NEWER, categories);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.value;
}

describe('compareExecutions over hand-built aggregates (task-083 review)', () => {
  it('takes each side delta against its own baseline, and the change, by REQ-RES-03 certainty', () => {
    const root = tempDir('bench-cmp-');
    handBuilt(root, EARLIER, 'm', [
      { arm: 'baseline', q1: [0, 0, 1] },
      { arm: 'wingfoil', q1: [1, 1, 1] },
    ]);
    handBuilt(root, NEWER, 'm', [
      { arm: 'baseline', q1: [1] },
      { arm: 'wingfoil', q1: [1] },
    ]);
    const [q1] = compared(root).rows;
    expect(q1).toMatchObject({
      earlier: { delta: expect.closeTo(2 / 3, 9) as number, certainty: 'within variance', arm: { n: 3 }, baseline: { n: 3, min: 0, max: 1 } },
      newer: { delta: 0, certainty: 'preliminary' },
      change: expect.closeTo(-2 / 3, 9) as number,
    });
  });

  it('reads M-E1 as not comparable where a run did not reach a directive step, as the site does', () => {
    const root = tempDir('bench-cmp-');
    handBuilt(root, EARLIER, 'm', [
      { scenario: 'TE', arm: 'baseline', q1: [1], e1: { violations: [2] } },
      { scenario: 'TE', arm: 'wingfoil', q1: [1, 1], e1: { violations: [0], unreached: [2] } },
    ]);
    handBuilt(root, NEWER, 'm', [
      { scenario: 'TE', arm: 'baseline', q1: [1], e1: { violations: [], unreached: [1] } },
      { scenario: 'TE', arm: 'wingfoil', q1: [1], e1: { violations: [1] } },
    ]);
    const [e1] = compared(root).rows.filter((row) => row.metric === 'M-E1');
    expect(e1).toMatchObject({
      note: expect.stringMatching(/^not comparable: .*r2 did not reach step 3; no comparison: the baseline is not comparable in abcdef012345\/1$/),
    });
  });

  it('compares a scenario only when every run of it recorded one hash on each side, the same', () => {
    const root = tempDir('bench-cmp-');
    handBuilt(root, EARLIER, 'm', [
      { arm: 'baseline', q1: [1] },
      { arm: 'wingfoil', q1: [1], hash: 'sha256:other' },
    ]);
    handBuilt(root, NEWER, 'm', [
      { arm: 'baseline', q1: [1], hash: [] },
      { arm: 'wingfoil', q1: [1] },
    ]);
    const result = compared(root);
    expect(result.rows).toEqual([]);
    expect(result.not_compared.map((entry) => entry.reason)).toEqual([
      `not compared: scenario hash sha256:other, sha256:same in ${EARLIER}, sha256:same, unknown in ${NEWER}`,
      `not compared: scenario hash sha256:other, sha256:same in ${EARLIER}, sha256:same, unknown in ${NEWER}`,
    ]);
  });

  it('lists a slice group on one side only, and a group whose scenario has no category map or cannot be read', () => {
    const root = tempDir('bench-cmp-');
    handBuilt(root, EARLIER, 'm', [
      { arm: 'baseline', q1: [1] },
      { arm: 'baseline', model: 'opus', q1: [1] },
      { scenario: 'TX', arm: 'baseline', q1: [1] },
      { scenario: 'TU', arm: 'baseline', q1: [1] },
    ]);
    handBuilt(root, NEWER, 'm', [
      { arm: 'baseline', q1: [1] },
      { arm: 'wingfoil', model: 'opus', q1: [1] },
      { scenario: 'TX', arm: 'baseline', q1: [1] },
      { scenario: 'TU', arm: 'baseline', q1: [1] },
    ]);
    const result = compared(root);
    expect(result.only_in).toEqual([
      { execution: EARLIER, scenario: 'TC', version: '1.0', arm: 'baseline', model: 'opus' },
      { execution: NEWER, scenario: 'TC', version: '1.0', arm: 'wingfoil', model: 'opus' },
    ]);
    expect(result.not_compared.map((entry) => `${entry.scenario} ${entry.reason}`)).toEqual([
      'TX not compared: category B has no map of metrics',
      'TU not compared: scenario TU@1.0 cannot be read from scenarios/',
    ]);
  });

  it('says there is no baseline to take a delta against, rather than not measured', () => {
    const root = tempDir('bench-cmp-');
    handBuilt(root, EARLIER, 'm', [{ arm: 'baseline', q1: [1] }, { arm: 'wingfoil', q1: [1] }]);
    handBuilt(root, NEWER, 'm', [{ arm: 'wingfoil', q1: [1] }]);
    expect(compared(root).rows.map((row) => ('note' in row ? row.note : ''))).toEqual([
      `no baseline in ${NEWER}`,
      `no baseline in ${NEWER}`,
    ]);
  });

  it('lists the groups it compared, the baseline included, and every pin that differs', () => {
    const root = tempDir('bench-cmp-');
    const campaign = (model: string, digest: string) => ({
      models: { default: model, slices: [{ model: 'opus' }] },
      agent: { name: 'claude-code', version: '2.1.291', effort: { [model]: 'high' } },
      harnesses: { wingfoil: { tool: 'wingfoil', version: 'v0.2.2' } },
      arm_digests: { baseline: digest },
    });
    handBuilt(root, EARLIER, 'm', [{ arm: 'baseline', q1: [1] }], campaign('m', 'aaaaaaaaaaaa'));
    handBuilt(root, NEWER, 'n', [{ arm: 'baseline', q1: [1] }], campaign('n', 'bbbbbbbbbbbb'));
    const result = compared(root);
    expect(result.compared).toEqual([{ scenario: 'TC', version: '1.0', arm: 'baseline', model: 'm → n' }]);
    expect(result.pins_differ.map((pin) => pin.pin)).toEqual([
      'models.default',
      'agent.effort.m',
      'agent.effort.n',
      'arm_digests.baseline',
    ]);
  });

  it('refuses an execution whose campaign file, execution record or aggregate cannot be read', () => {
    const root = tempDir('bench-cmp-');
    handBuilt(root, EARLIER, 'm', [{ arm: 'baseline', q1: [1] }]);
    handBuilt(root, NEWER, 'm', [{ arm: 'baseline', q1: [1] }]);
    writeFileSync(join(root, 'results', EARLIER, 'campaign.yaml'), 'models: [');
    writeFileSync(join(root, 'results', NEWER, 'aggregate.json'), '{"groups": 1}');
    const result = compareExecutions(root, EARLIER, NEWER, categories);
    expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual([
      `results/${EARLIER}/campaign.yaml`,
      `results/${NEWER}/aggregate.json`,
    ]);
  });

  it('gives the same bytes when it compares the same two executions again', () => {
    const root = tempDir('bench-cmp-');
    handBuilt(root, EARLIER, 'm', [{ arm: 'baseline', q1: [0, 1] }, { arm: 'wingfoil', q1: [1, 1] }]);
    handBuilt(root, NEWER, 'm', [{ arm: 'baseline', q1: [1] }, { arm: 'wingfoil', q1: [0] }]);
    const file = writeComparison(root, compared(root));
    const first = readFileSync(file, 'utf8');
    writeComparison(root, compared(root));
    expect(readFileSync(file, 'utf8')).toBe(first);
  });
});
