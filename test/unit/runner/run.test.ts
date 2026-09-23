import { mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { doubles } from '../../support/runner-doubles.js';
import { tempDir } from '../../support/scenario-fixture.js';

function campaignYaml(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...completeCampaignYaml(),
    harnesses: {},
    arms: ['baseline'],
    scenarios: [{ id: 'S1', version: '1.0' }],
    repetitions: { S1: 1 },
    agent: { name: 'fake', version: '1.0.0' },
    models: { default: 'fake-model' },
    ...overrides,
  };
}

function checkedCampaign(yaml: Record<string, unknown> = campaignYaml(), scenarios = ['S1@1.0']) {
  const { root, file } = writeRepo(yaml, scenarios);
  const checked = checkCampaign(file);
  if (!checked.ok)
    throw new Error(checked.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '));
  return { root, checked: checked.value };
}

describe('runCampaign', () => {
  it('builds the campaign image once and reuses it for every run', async () => {
    const { checked } = checkedCampaign(
      campaignYaml({ arms: ['baseline', 'baseline-docs'], repetitions: { S1: 2 } }),
    );
    const { docker, git, agent, recorded } = doubles();

    const summary = await runCampaign(checked, { docker, git, agent });

    expect(recorded.builds).toEqual([checked.campaign.id]);
    expect(summary.runs).toHaveLength(4);
    expect(summary.runs.map((run) => `${run.arm}/r${run.repetition}`)).toEqual([
      'baseline/r1',
      'baseline/r2',
      'baseline-docs/r1',
      'baseline-docs/r2',
    ]);
    expect(recorded.creates).toHaveLength(4);
    expect(new Set(recorded.creates.map((create) => create.workspace)).size).toBe(4);
  });

  it('lays the workspaces out under runs/<campaign-id>/<n>/', async () => {
    const { root, checked } = checkedCampaign();
    const { docker, git, agent, recorded } = doubles();

    const summary = await runCampaign(checked, { docker, git, agent });

    expect(recorded.creates[0]?.workspace).toBe(
      join(root, 'runs', checked.campaign.id, '1', 'S1@1.0', 'baseline', 'fake-model', 'r1', 'workspace'),
    );
    expect(summary.execution).toBe(1);
  });

  it('records the execution under results/<campaign-id>/<n>/ with a copy of the campaign file', async () => {
    const { root, checked } = checkedCampaign();
    const { docker, git, agent } = doubles();

    const summary = await runCampaign(checked, { docker, git, agent });

    const results = join(root, 'results', checked.campaign.id, '1');
    expect(summary.resultsDir).toBe(results);
    expect(readFileSync(join(results, 'campaign.yaml'), 'utf8')).toBe(
      readFileSync(checked.campaign.file, 'utf8'),
    );
  });

  it('counts the next execution from the ones already stored', async () => {
    const { root, checked } = checkedCampaign();
    mkdirSync(join(root, 'results', checked.campaign.id, '4'), { recursive: true });
    const { docker, git, agent } = doubles();

    const summary = await runCampaign(checked, { docker, git, agent });

    expect(summary.execution).toBe(5);
  });

  it('runs every step of the scenario in the container, in order', async () => {
    const { checked } = checkedCampaign();
    const { docker, git, agent, recorded } = doubles();

    const summary = await runCampaign(checked, { docker, git, agent });

    expect(recorded.steps.map((step) => step.step)).toEqual([1, 2]);
    expect(recorded.steps[0]?.scenarioId).toBe('S1');
    expect(recorded.starts).toEqual(['container-1']);
    expect(summary.runs[0]?.outcome).toBe('completed');
    expect(summary.runs[0]?.steps).toHaveLength(2);
  });

  it('removes the container and keeps going when a step fails', async () => {
    const { checked } = checkedCampaign(campaignYaml({ repetitions: { S1: 2 } }));
    const failing = doubles({
      onStep: (request) => {
        if (request.step === 1) throw new Error('the agent gave up');
      },
    });

    const summary = await runCampaign(checked, failing);

    expect(summary.runs.map((run) => run.outcome)).toEqual(['failed', 'failed']);
    expect(summary.runs[0]?.error).toMatch(/the agent gave up/);
    expect(failing.recorded.removes).toEqual(['container-1', 'container-2']);
    expect(summary.completed).toBe(false);
  });

  it('copies the seed without following symbolic links out of it', async () => {
    const outside = tempDir('bench-outside-');
    writeFileSync(join(outside, 'secret.txt'), 'secret');
    const { root, checked } = checkedCampaign();
    symlinkSync(join(outside, 'secret.txt'), join(root, 'scenarios/S1/1.0/seed/link.txt'));
    const { docker, git, agent, recorded } = doubles();

    await runCampaign(checked, { docker, git, agent });

    expect(readdirSync(recorded.creates[0]?.workspace ?? '').sort()).toEqual(['README.md']);
  });

  it('copies the seed directory tree, subdirectories included', async () => {
    const { root, checked } = checkedCampaign();
    mkdirSync(join(root, 'scenarios/S1/1.0/seed/src'), { recursive: true });
    writeFileSync(join(root, 'scenarios/S1/1.0/seed/src/index.ts'), 'export const x = 1;\n');
    const { docker, git, agent, recorded } = doubles();

    await runCampaign(checked, { docker, git, agent });

    const workspace = recorded.creates[0]?.workspace ?? '';
    expect(readFileSync(join(workspace, 'src/index.ts'), 'utf8')).toBe('export const x = 1;\n');
  });

  it('names each container after the campaign, the execution and the run', async () => {
    const { checked } = checkedCampaign();
    const { docker, git, agent, recorded } = doubles();

    await runCampaign(checked, { docker, git, agent });

    expect(recorded.creates[0]?.name).toBe(`bench-${checked.campaign.id}-1-S1-1.0-baseline-fake-model-r1`);
    expect(recorded.creates[0]?.user).toBe('node');
  });
});
