import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkCampaign, estimateCampaign, runCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { priceCampaign } from '../../support/dry-run-fixture.js';
import { doubles, invocationOf } from '../../support/runner-doubles.js';

/** S1 and S2 in baseline and wingfoil-free arms, with a slice as given. */
function campaign(slices?: unknown[]) {
  const { file } = writeRepo(
    {
      ...completeCampaignYaml(),
      harnesses: {},
      arms: ['baseline', 'baseline-notes'],
      scenarios: [
        { id: 'S1', version: '1.0' },
        { id: 'S2', version: '1.0' },
      ],
      repetitions: { S1: 2, S2: 1 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model', ...(slices === undefined ? {} : { slices }) },
    },
    ['S1@1.0', 'S2@1.0'],
  );
  const checked = checkCampaign(file);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { file, checked: checked.value };
}

const SLICE = { model: 'other-model', scenarios: ['S1'], arms: ['baseline'], repetitions: 2 };

describe('model slices run in a campaign (task-025)', () => {
  it("runs a slice's scenarios × arms × repetitions with its model, after every default-model run", async () => {
    const { checked } = campaign([SLICE]);
    const ports = doubles();
    const summary = await runCampaign(checked, ports);

    expect(summary.runs.map((run) => `${run.scenario}/${run.arm}/${run.model}/r${run.repetition}`)).toEqual([
      'S1/baseline/fake-model/r1',
      'S1/baseline/fake-model/r2',
      'S1/baseline-notes/fake-model/r1',
      'S1/baseline-notes/fake-model/r2',
      'S2/baseline/fake-model/r1',
      'S2/baseline-notes/fake-model/r1',
      'S1/baseline/other-model/r1',
      'S1/baseline/other-model/r2',
    ]);
    expect(summary.completed).toBe(true);
  });

  it('gives the agent the slice model, and stores the run under it', async () => {
    const { checked } = campaign([{ ...SLICE, repetitions: 1 }]);
    const ports = doubles({
      // Step 1 of the slice run asks a question: its resume continues the slice's session.
      messageOf: (request) =>
        request.step === 1 &&
        invocationOf(request) === 0 &&
        ports.recorded.steps.at(-1)?.model === 'other-model'
          ? 'Which one?'
          : undefined,
    });
    const summary = await runCampaign(checked, ports);
    const slice = summary.runs.at(-1);

    const sliceSteps = ports.recorded.steps.filter((request) => request.model === 'other-model');
    expect(sliceSteps.map((request) => request.step)).toEqual([1, 2]);
    expect(ports.recorded.resumes).toHaveLength(1);
    expect(ports.recorded.resumes[0]?.sessionId).toBe(sliceSteps[0]?.sessionId);
    expect(slice?.outputDir).toMatch(/runs\/S1@1\.0\/baseline\/other-model\/r1$/);
    expect(slice?.workspace).toMatch(/S1@1\.0\/baseline\/other-model\/r1\/workspace$/);
    expect(JSON.parse(readFileSync(join(slice?.outputDir ?? '', 'run.json'), 'utf8'))).toMatchObject({
      model: 'other-model',
      repetition: 1,
    });
    expect(ports.recorded.creates.at(-1)?.name).toMatch(/-S1-1\.0-baseline-other-model-r1$/);
  });

  it('runs exactly the keys the estimate prices, each as many times as it counts', async () => {
    const { file, checked } = campaign([
      SLICE,
      { model: 'third-model', scenarios: ['S2'], arms: ['baseline-notes'], repetitions: 1 },
    ]);
    priceCampaign(file, 0.01);
    const estimate = estimateCampaign(checked);
    if (!estimate.ok) throw new Error(JSON.stringify(estimate.issues));
    const summary = await runCampaign(checked, doubles());

    const ran = new Map<string, number>();
    for (const run of summary.runs) {
      const key = `${run.scenario}@${run.version}/${run.arm}/${run.model}`;
      ran.set(key, (ran.get(key) ?? 0) + 1);
    }
    expect([...ran]).toEqual(
      estimate.value.lines.map((line) => [
        `${line.scenario}@${line.version}/${line.arm}/${line.model}`,
        line.repetitions,
      ]),
    );
  });
});
