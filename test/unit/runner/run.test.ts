import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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

  it("lets the agent run commands in the run's own container", async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      onStep: (request) => {
        void request.run(['sh', '-c', 'echo hi']);
      },
    });

    await runCampaign(checked, ports);

    expect(ports.recorded.execs).toEqual([
      { container: 'container-1', command: ['sh', '-c', 'echo hi'] },
      { container: 'container-1', command: ['sh', '-c', 'echo hi'] },
    ]);
  });

  it.each(['create', 'init'] as const)(
    'reports a run that fails in %s as failed, and carries on',
    async (call) => {
      const { checked } = checkedCampaign(campaignYaml({ repetitions: { S1: 2 } }));
      const ports = doubles({ failing: { call, error: 'boom' } });

      const summary = await runCampaign(checked, ports);

      expect(summary.runs.map((run) => run.outcome)).toEqual(['failed', 'failed']);
      expect(summary.runs[0]?.error).toMatch(/boom/);
      // Neither call leaves a container behind: create failed, and init runs before it.
      expect(ports.recorded.removes).toEqual([]);
    },
  );

  it('removes the container when the run fails after it was created', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({ failing: { call: 'start', error: 'boom' } });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(ports.recorded.removes).toEqual(['container-1']);
  });

  it('keeps the campaign going when removing a container fails', async () => {
    const { checked } = checkedCampaign(campaignYaml({ repetitions: { S1: 2 } }));
    const ports = doubles({ failing: { call: 'remove', error: 'daemon gone' } });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs.map((run) => run.outcome)).toEqual(['completed', 'completed']);
    expect(ports.recorded.creates).toHaveLength(2);
  });

  it('starts every run from a fresh workspace', async () => {
    const { checked } = checkedCampaign();
    const first = doubles();
    await runCampaign(checked, first);
    const workspace = first.recorded.creates[0]?.workspace ?? '';
    writeFileSync(join(workspace, 'leftover.txt'), 'from the previous run');
    rmSync(join(checked.campaign.resultsRoot, checked.campaign.id), { recursive: true });

    await runCampaign(checked, doubles());

    expect(readdirSync(workspace).sort()).toEqual(['README.md']);
    expect(existsSync(join(workspace, 'leftover.txt'))).toBe(false);
  });

  it('refuses to run a scenario whose seed is a symbolic link', async () => {
    const { root, checked } = checkedCampaign();
    const seed = join(root, 'scenarios/S1/1.0/seed');
    rmSync(seed, { recursive: true });
    symlinkSync(tempDir('bench-elsewhere-'), seed);
    const ports = doubles();

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/seed .* is a symbolic link/);
  });

  it('checks that the container it created has no mount but the workspace', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles();
    const docker = { ...ports.docker, mountsOf: () => Promise.resolve(['/etc:/etc', '/w:/workspace']) };

    const summary = await runCampaign(checked, { ...ports, docker });

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/mounts/);
    expect(ports.recorded.removes).toEqual(['container-1']);
  });

  it('finds its own Dockerfile', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles();
    await runCampaign(checked, ports);
    expect(existsSync(ports.recorded.buildRequests[0]?.dockerfile ?? '')).toBe(true);
  });

  it('reports a container with no mount at all', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles();
    const docker = { ...ports.docker, mountsOf: () => Promise.resolve([]) };

    const summary = await runCampaign(checked, { ...ports, docker });

    expect(summary.runs[0]?.error).toMatch(/other than its workspace: none/);
  });

  it('reports a failure that is not an Error', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      onStep: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'the agent said no';
      },
    });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.error).toBe('the agent said no');
  });
  it('fails the run when a step prompt cannot be read', async () => {
    const { checked, root } = checkedCampaign();
    rmSync(join(root, 'scenarios', 'S1', '1.0', 'prompts', '01.md'));
    const ports = doubles();

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/prompts\/01\.md/);
    expect(ports.recorded.steps).toEqual([]);
  });

  it('fails the run when the agent answers with a session it was not given', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({ sessionOf: () => 'a-session-of-its-own' });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/a-session-of-its-own/);
  });
});
