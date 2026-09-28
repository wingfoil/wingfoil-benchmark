import { createHash } from 'node:crypto';
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
import { doubles, invocationOf } from '../../support/runner-doubles.js';
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
      campaignYaml({ arms: ['baseline', 'baseline-notes'], repetitions: { S1: 2 } }),
    );
    const { docker, git, agent, recorded } = doubles();

    const summary = await runCampaign(checked, { docker, git, agent });

    expect(recorded.builds).toEqual([checked.campaign.id]);
    expect(summary.runs).toHaveLength(4);
    expect(summary.runs.map((run) => `${run.arm}/r${run.repetition}`)).toEqual([
      'baseline/r1',
      'baseline/r2',
      'baseline-notes/r1',
      'baseline-notes/r2',
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

  it("lays a run's output out under results/<campaign-id>/<n>/runs/ (REQ-FMT-06)", async () => {
    const { root, checked } = checkedCampaign();
    const ports = doubles();

    const summary = await runCampaign(checked, ports);

    // Asserted literally, not derived from the value under test: the layout is the contract F5.1
    // reads in W7, and a path that merely exists somewhere under results/ would satisfy nothing.
    expect(summary.runs[0]?.outputDir).toBe(
      join(root, 'results', checked.campaign.id, '1', 'runs', 'S1@1.0', 'baseline', 'fake-model', 'r1'),
    );
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

    expect(readdirSync(recorded.creates[0]?.workspace ?? '').sort()).toEqual(['CLAUDE.md', 'README.md']);
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
      { container: 'container-1', command: ['bash', '/home/node/arm/setup.sh'] },
      // Before each step, the agent's auto-memory is cleared (bug-006).
      { container: 'container-1', command: ['sh', '-c', 'rm -rf "$HOME"/.claude/projects/*/memory'] },
      // The agent's commands run under the step's time cap: 1800 s at most (task-024, REQ-RUN-08).
      { container: 'container-1', command: ['timeout', '-k', '10', '1800', 'sh', '-c', 'echo hi'] },
      { container: 'container-1', command: ['sh', '-c', 'rm -rf "$HOME"/.claude/projects/*/memory'] },
      { container: 'container-1', command: ['timeout', '-k', '10', '1800', 'sh', '-c', 'echo hi'] },
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

    expect(readdirSync(workspace).sort()).toEqual(['CLAUDE.md', 'README.md']);
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
        throw 'the agent said no';
      },
    });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.error).toBe('the agent said no');
  });
  it('fails the run when a step commit fails, and carries on (REQ-NFR-03)', async () => {
    const { checked } = checkedCampaign(campaignYaml({ repetitions: { S1: 2 } }));
    const ports = doubles({ failing: { call: 'commit', error: 'the index is locked' } });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs.map((run) => run.outcome)).toEqual(['failed', 'failed']);
    expect(summary.runs[0]?.error).toMatch(/the index is locked/);
    expect(ports.recorded.removes).toEqual(['container-1', 'container-2']);
  });

  it('fails the run when a step patch cannot be read, leaving the commit behind', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({ failing: { call: 'patch', error: 'bad object HEAD' } });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/bad object HEAD/);
    // The whole transcript: step 1 is committed in the workspace, its patch is attempted and fails,
    // and step 2 never starts. The run's repository and its record disagree by one commit, and the
    // run is failed precisely so that nothing scores that gap.
    const workspace = summary.runs[0]?.workspace ?? '';
    expect(ports.recorded.gitCalls).toEqual([
      `init ${workspace}`,
      `commit ${workspace} seed`,
      `identity ${workspace} Benchmark Approver <approver@benchmark.localhost>`,
      `commit ${workspace} setup --allow-empty`,
      `head ${workspace}`,
      `tree ${workspace} HEAD`,
      `patch ${workspace} HEAD`,
      `commit ${workspace} step 01 --allow-empty`,
      `patch ${workspace} HEAD`,
    ]);
    expect(existsSync(join(summary.runs[0]?.outputDir ?? '', 'steps', '01', 'diff.patch'))).toBe(false);
  });

  it("scrubs the credential out of a step's patch, not only out of its transcript", async () => {
    const token = 'sk-ant-oat01-SECRET';
    const { checked } = checkedCampaign();
    const ports = doubles({ patchOf: () => `+ANTHROPIC_AUTH_TOKEN=${token}\n` });

    const summary = await runCampaign(checked, {
      ...ports,
      // The environment also carries things that are not secret, and from W3 it carries the arm's
      // own settings: scrubbing every value of it would corrupt the patch instead of protecting it.
      containerEnv: { ANTHROPIC_AUTH_TOKEN: token, LANG: 'C' },
      secrets: [token],
    });

    // The agent runs with bypassPermissions and the token in its environment: one `env > notes.txt`
    // inside the workspace would otherwise commit the secret in a patch, and patches are committed.
    const patch = readFileSync(join(summary.runs[0]?.outputDir ?? '', 'steps', '01', 'diff.patch'), 'utf8');
    expect(patch).not.toContain(token);
    expect(patch).toContain('[redacted]');
    // `C` is a value of the container's environment and must survive untouched.
    expect(patch).toContain('ANTHROPIC_AUTH_TOKEN=');
  });

  it('keeps what a failed step spent, instead of throwing the evidence away', async () => {
    const { checked } = checkedCampaign();
    const usage = {
      inputTokens: 1,
      outputTokens: 2,
      cacheCreationInputTokens: 3,
      cacheReadInputTokens: 4,
      costUsd: 1.5,
      costEur: 1.38,
      turns: 1,
      durationMs: 10,
    };
    const ports = doubles({
      usageOf: () => usage,
      transcriptOf: () => ['{"type":"result","is_error":true}'],
      errorOf: () => 'api_error',
    });

    const summary = await runCampaign(checked, ports);

    // The money was spent whatever the outcome, so the record has to show it (REQ-RUN-09).
    const output = summary.runs[0]?.outputDir ?? '';
    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(JSON.parse(readFileSync(join(output, 'steps', '01', 'usage.json'), 'utf8'))).toEqual(usage);
    // And the transcript, which is the only evidence of why it failed.
    expect(readFileSync(join(output, 'steps', '01', 'transcript.jsonl'), 'utf8')).toContain('is_error');
    const record = JSON.parse(readFileSync(join(output, 'run.json'), 'utf8')) as { steps: unknown[] };
    expect(record.steps).toHaveLength(1);
    // The run stops at the failed step: step 2 never ran.
    expect(ports.recorded.steps).toHaveLength(1);
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

  it('refuses to start a step with nothing left to spend, rather than passing a budget of zero', () =>
    (async () => {
      // The spike measured that --max-budget-usd exists and means what REQ-RUN-04 says. It did not
      // measure what 0 does: refuse at once, or mean "no limit". Either is a wrong answer to give
      // silently, so the step is not started. Enforcing the cap itself is F1.3 (W5).
      const { checked } = checkedCampaign();
      const spent = {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        costUsd: 4,
        costEur: 3.5,
        turns: 1,
        durationMs: 1,
      };
      const ports = doubles({ usageOf: () => spent });

      const summary = await runCampaign(checked, ports);

      // Step 1 ran and used more than the run's 3 EUR cap; step 2 was never started, and the run
      // ended at its cap rather than failing (task-024, REQ-RUN-08).
      expect(ports.recorded.steps).toHaveLength(1);
      expect(summary.runs[0]?.outcome).toBe('cap reached');
      expect(summary.runs[0]?.error).toBeUndefined();
    })());

  it('keeps the evidence of a session that ended before naming itself', async () => {
    // The one failure the spike actually recorded: a stream cut off by the step cap, with no result
    // event and therefore no session id. The session guard used to fire first and blame a mismatch.
    const { checked } = checkedCampaign();
    const ports = doubles({
      sessionOf: () => '',
      errorOf: () => 'the session ended with no result event',
      transcriptOf: () => ['{"type":"system","subtype":"api_retry"}'],
    });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    // The reason is the truncation, not an invented session mismatch.
    expect(summary.runs[0]?.error).toMatch(/no result event/);
    expect(summary.runs[0]?.error).not.toMatch(/not in the one it was given/);
    // And the transcript survives: it is the only evidence of why the session stopped.
    const step = join(summary.runs[0]?.outputDir ?? '', 'steps', '01');
    expect(readFileSync(join(step, 'transcript.jsonl'), 'utf8')).toContain('api_retry');
    expect(existsSync(join(step, 'usage.json'))).toBe(true);
  });

  it('fails the run when the agent answers with a session it was not given', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({ sessionOf: () => 'a-session-of-its-own' });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/a-session-of-its-own/);
  });
});

/** Usage with every figure derived from one number, so that sums are checkable field by field. */
function usage(n: number) {
  return {
    inputTokens: n,
    outputTokens: 10 * n,
    cacheCreationInputTokens: 100 * n,
    cacheReadInputTokens: 1000 * n,
    // Powers of two, so that a sum is exact and a wrong sum cannot hide in a rounding.
    costUsd: n / 32,
    costEur: n / 64,
    turns: n,
    durationMs: 7 * n,
  };
}

const QUESTION_REPLY =
  'No further input is available. Make the most reasonable choice, record it, and proceed.';

describe('the neutral approver in the step loop (F2.4)', () => {
  it("sums a step's invocations and keeps their transcripts in order, in one snapshot", async () => {
    const { checked } = checkedCampaign();
    // Step 1 asks a question, its resume asks for approval, the second resume finishes.
    const messages = ['Which cache?', 'Shall I delete the old one.', 'Done.'];
    const ports = doubles({
      messageOf: (request) => (request.step === 1 ? messages[invocationOf(request)] : undefined),
      usageOf: (request) => usage(request.step * 10 + invocationOf(request) + 1),
      transcriptOf: (request) => [
        `s${request.step}i${invocationOf(request)}a`,
        `s${request.step}i${invocationOf(request)}b`,
      ],
    });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('completed');
    const step = join(summary.runs[0]?.outputDir ?? '', 'steps', '01');
    // 11 + 12 + 13: the step and both its resumes, every field of work. The cost is not summed: an
    // invocation reports the session's running total, so the step's cost is the latest, 13.
    expect(JSON.parse(readFileSync(join(step, 'usage.json'), 'utf8'))).toEqual({
      inputTokens: 36,
      outputTokens: 360,
      cacheCreationInputTokens: 3600,
      cacheReadInputTokens: 36000,
      costUsd: 13 / 32,
      costEur: 13 / 64,
      turns: 36,
      durationMs: 252,
    });
    expect(readFileSync(join(step, 'transcript.jsonl'), 'utf8')).toBe(
      's1i0a\ns1i0b\ns1i1a\ns1i1b\ns1i2a\ns1i2b\n',
    );
    // Resumed in the step's own session, with the policy's reply to what was asked.
    const session = ports.recorded.steps[0]?.sessionId;
    expect(ports.recorded.resumes.map((r) => [r.step, r.intervention, r.sessionId, r.reply])).toEqual([
      [1, 1, session, QUESTION_REPLY],
      [1, 2, session, 'Approved. Proceed.'],
    ]);
    // One snapshot per step, however many interventions it took (REQ-RUN-05).
    const workspace = summary.runs[0]?.workspace ?? '';
    expect(ports.recorded.gitCalls.filter((call) => call.startsWith('commit'))).toEqual([
      `commit ${workspace} seed`,
      `commit ${workspace} setup --allow-empty`,
      `commit ${workspace} step 01 --allow-empty`,
      `commit ${workspace} step 02 --allow-empty`,
    ]);
  });

  it("records every intervention and each step's outcome in run.json (REQ-RUN-07)", async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      messageOf: (request) =>
        request.step === 2 && invocationOf(request) === 0 ? 'Please confirm the target.' : undefined,
    });

    const summary = await runCampaign(checked, ports);

    const record = JSON.parse(readFileSync(join(summary.runs[0]?.outputDir ?? '', 'run.json'), 'utf8')) as {
      approver_policy: string;
      interventions: unknown[];
      steps: { n: number; outcome: string; interventions: number }[];
    };
    expect(record.approver_policy).toBe('v1');
    expect(record.interventions).toEqual([{ step: 2, kind: 'approval', reply: 'Approved. Proceed.' }]);
    expect(record.steps.map(({ n, outcome, interventions }) => ({ n, outcome, interventions }))).toEqual([
      { n: 1, outcome: 'completed', interventions: 0 },
      { n: 2, outcome: 'completed', interventions: 1 },
    ]);
  });

  it('answers a third waiting session, and completes the step when the third resume finishes', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      messageOf: (request) => (request.step === 1 && invocationOf(request) < 3 ? 'Which one?' : 'Done.'),
    });

    const summary = await runCampaign(checked, ports);

    expect(ports.recorded.resumes.map((r) => r.intervention)).toEqual([1, 2, 3]);
    expect(summary.runs[0]?.steps[0]?.outcome).toBe('completed');
    expect(summary.runs[0]?.steps[0]?.interventions).toHaveLength(3);
  });

  it('gives a fourth waiting session no reply, ends the step, and goes on to the next one', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({ messageOf: (request) => (request.step === 1 ? 'Which one?' : 'Done.') });

    const summary = await runCampaign(checked, ports);

    // Three replies, never a fourth.
    expect(ports.recorded.resumes.map((r) => r.intervention)).toEqual([1, 2, 3]);
    const run = summary.runs[0];
    expect(run?.steps.map((step) => step.outcome)).toEqual(['intervention cap reached', 'completed']);
    // Hitting a cap ends the step, not the run: it is scored as it stands (§3.6).
    expect(ports.recorded.steps.map((request) => request.step)).toEqual([1, 2]);
    expect(run?.outcome).toBe('completed');
    expect(run?.error).toBeUndefined();
    const record = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'run.json'), 'utf8')) as {
      steps: { outcome: string }[];
    };
    expect(record.steps[0]?.outcome).toBe('intervention cap reached');
    // The capped step still leaves its snapshot and everything its four sessions said.
    const step = join(run?.outputDir ?? '', 'steps', '01');
    expect(readFileSync(join(step, 'transcript.jsonl'), 'utf8').trim().split('\n')).toHaveLength(4);
    expect(existsSync(join(step, 'diff.patch'))).toBe(true);
  });

  it('tells a resume what is left of the run cap after the step so far', async () => {
    // The run cap is 3 EUR at 0.92 EUR per USD; the step's own session has already spent 1 EUR.
    const { checked } = checkedCampaign();
    const spent = { ...usage(1), costEur: 1 };
    const ports = doubles({
      messageOf: (request) => (request.step === 1 && invocationOf(request) === 0 ? 'Which one?' : undefined),
      usageOf: (request) => (request.step === 1 && invocationOf(request) === 0 ? spent : usage(0)),
    });

    await runCampaign(checked, ports);

    expect(ports.recorded.steps[0]?.remainingCostUsd).toBeCloseTo(3 / 0.92, 10);
    expect(ports.recorded.resumes[0]?.remainingCostUsd).toBeCloseTo(2 / 0.92, 10);
    expect(ports.recorded.steps[1]?.remainingCostUsd).toBeCloseTo(2 / 0.92, 10);
  });

  it("keeps the session's cost when a resume ends with no result and so reports none", async () => {
    // A truncated resume reports zero: the session's total is still what the last result said.
    const { checked } = checkedCampaign();
    const ports = doubles({
      messageOf: (request) => (invocationOf(request) === 0 ? 'Which one?' : undefined),
      usageOf: (request) => (invocationOf(request) === 0 ? usage(8) : usage(0)),
      errorOf: (request) =>
        invocationOf(request) === 1 ? 'the session ended with no result event' : undefined,
    });

    const summary = await runCampaign(checked, ports);

    const step = join(summary.runs[0]?.outputDir ?? '', 'steps', '01');
    expect(JSON.parse(readFileSync(join(step, 'usage.json'), 'utf8'))).toMatchObject({
      costUsd: 8 / 32,
      turns: 8,
    });
  });

  it('ends a step at the intervention cap before it looks at what is left to spend', async () => {
    // Both limits reached at once: the step is over by the policy, so no reply is weighed against the
    // cap, and the step is scored as it stands rather than failing its run.
    const { checked } = checkedCampaign();
    const ports = doubles({
      messageOf: (request) => (request.step === 1 ? 'Which one?' : undefined),
      usageOf: (request) => ({ ...usage(0), costEur: invocationOf(request) === 3 ? 3 : 0 }),
    });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.steps[0]?.outcome).toBe('intervention cap reached');
  });

  it("tells a second resume the cap less the session's latest total, not the sum of its totals", async () => {
    // Running totals of one session: 0.5, then 1 EUR. What the step has cost is 1, not 1.5.
    const { checked } = checkedCampaign();
    const totals = [0.5, 1, 1];
    const ports = doubles({
      messageOf: (request) => (request.step === 1 && invocationOf(request) < 2 ? 'Which one?' : undefined),
      usageOf: (request) => ({
        ...usage(0),
        costEur: request.step === 1 ? (totals[invocationOf(request)] ?? 0) : 0,
      }),
    });

    await runCampaign(checked, ports);

    expect(ports.recorded.resumes.map((r) => r.remainingCostUsd)).toEqual([2.5 / 0.92, 2 / 0.92]);
  });

  it('reports a resume whose session total went down, rather than trusting it silently', async () => {
    const { checked } = checkedCampaign();
    const errors: string[] = [];
    const ports = doubles({
      messageOf: (request) => (request.step === 1 && invocationOf(request) === 0 ? 'Which one?' : undefined),
      usageOf: (request) => ({ ...usage(0), costUsd: invocationOf(request) === 0 ? 0.5 : 0.25 }),
    });

    const summary = await runCampaign(checked, { ...ports, logError: (line) => errors.push(line) });

    expect(errors).toEqual([
      'step 01: resume 1 reported a session cost of 0.25 USD, below the 0.5 USD already reported; kept the larger',
    ]);
    expect(summary.runs[0]?.steps[0]?.usage.costUsd).toBe(0.5);
  });

  it('does not resume a session when nothing is left to spend', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      messageOf: () => 'Which one?',
      usageOf: () => ({ ...usage(1), costEur: 3.5 }),
    });

    const summary = await runCampaign(checked, ports);

    expect(ports.recorded.resumes).toEqual([]);
    // The step and the run end at the cap (task-024): nothing failed.
    expect(summary.runs[0]?.outcome).toBe('cap reached');
    expect(summary.runs[0]?.steps[0]?.outcome).toBe('cap reached');
    // What the step did spend is kept.
    const step = join(summary.runs[0]?.outputDir ?? '', 'steps', '01');
    expect(JSON.parse(readFileSync(join(step, 'usage.json'), 'utf8'))).toMatchObject({ costEur: 3.5 });
  });

  it('does not classify a session that failed: a failure is never an intervention', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({ messageOf: () => 'Are you sure?', errorOf: () => 'api_error' });

    const summary = await runCampaign(checked, ports);

    expect(ports.recorded.resumes).toEqual([]);
    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.steps[0]?.interventions).toEqual([]);
    expect(summary.runs[0]?.steps[0]?.outcome).toBe('failed');
  });

  it('fails the run when a resume fails, keeping what every invocation spent and said', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      messageOf: (request) => (invocationOf(request) === 0 ? 'Which one?' : undefined),
      errorOf: (request) =>
        invocationOf(request) === 1 ? 'the session ended with no result event' : undefined,
      usageOf: () => usage(1),
      transcriptOf: (request) => [`invocation ${invocationOf(request)}`],
    });

    const summary = await runCampaign(checked, ports);

    const run = summary.runs[0];
    expect(run?.outcome).toBe('failed');
    expect(run?.error).toMatch(/step 01 of S1 failed: the session ended with no result event/);
    const step = join(run?.outputDir ?? '', 'steps', '01');
    expect(readFileSync(join(step, 'transcript.jsonl'), 'utf8')).toBe('invocation 0\ninvocation 1\n');
    expect(JSON.parse(readFileSync(join(step, 'usage.json'), 'utf8'))).toMatchObject({ turns: 2 });
    // The reply was sent, so it was an intervention, whatever came of it.
    expect(run?.steps[0]?.interventions).toEqual([{ step: 1, kind: 'question', reply: QUESTION_REPLY }]);
    expect(ports.recorded.steps).toHaveLength(1);
  });

  it('keeps the evidence of the step when the agent cannot resume at all', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      messageOf: () => 'Which one?',
      transcriptOf: (request) => [`invocation ${invocationOf(request)}`],
      onStep: (request) => {
        if (invocationOf(request) === 1) throw new Error('no scripted resume 1 for S1 step 1');
      },
    });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/no scripted resume 1 for S1 step 1/);
    const step = join(summary.runs[0]?.outputDir ?? '', 'steps', '01');
    expect(readFileSync(join(step, 'transcript.jsonl'), 'utf8')).toBe('invocation 0\n');
  });

  it('fails the run when a resume answers from a session other than the one resumed', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      messageOf: (request) => (invocationOf(request) === 0 ? 'Which one?' : undefined),
      sessionOf: (request) => (invocationOf(request) === 1 ? 'a-session-of-its-own' : request.sessionId),
    });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/resume 1 of step 01 ran in session a-session-of-its-own/);
  });

  it('refuses to run under a policy it does not implement, even when handed one past validation', async () => {
    // Validation refuses it first (campaign load test); this is the guard for any other way in.
    const { checked } = checkedCampaign();
    const unvalidated = {
      ...checked,
      campaign: { ...checked.campaign, spec: { ...checked.campaign.spec, approver_policy: 'v2' } },
    };
    const ports = doubles();

    const summary = await runCampaign(unvalidated, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/approver policy v2 is not implemented/);
    expect(ports.recorded.steps).toEqual([]);
  });

  it('logs every intervention', async () => {
    const { checked } = checkedCampaign();
    const lines: string[] = [];
    const ports = doubles({ messageOf: (request) => (invocationOf(request) === 0 ? 'Shall I?' : undefined) });

    await runCampaign(checked, { ...ports, log: (line) => lines.push(line) });

    expect(lines).toContain('step 01: approval request, intervention 1 of 3: Approved. Proceed.');
  });
});

describe('a container an interrupted run left behind (bug-003)', () => {
  /** The name the runner gives a run's container (task-003): campaign, execution, run. */
  function containerName(campaignId: string, execution: number, repetition: number): string {
    return `bench-${campaignId}-${execution}-S1-1.0-baseline-fake-model-r${repetition}`;
  }

  it('fails the run whose container name is taken, naming the cause and the remedy, and goes on', async () => {
    const { checked } = checkedCampaign(campaignYaml({ repetitions: { S1: 2 } }));
    const taken = containerName(checked.campaign.id, 1, 1);
    const errors: string[] = [];
    const ports = doubles({ leftovers: [taken] });

    const summary = await runCampaign(checked, { ...ports, logError: (line) => errors.push(line) });

    expect(summary.runs.map((run) => run.outcome)).toEqual(['failed', 'completed']);
    expect(summary.runs[0]?.error).toBe(
      `container ${taken} already exists: an interrupted run of execution 1 of this campaign left it ` +
        `behind (bug-003). Remove it with: docker rm --force ${taken}`,
    );
    // Nothing is created in its place, and nothing that the run did not create is removed.
    expect(ports.recorded.creates.map((create) => create.name)).toEqual([
      containerName(checked.campaign.id, 1, 2),
    ]);
    expect(ports.recorded.removes).toEqual(['container-1']);
    expect(ports.recorded.steps.map((request) => request.step)).toEqual([1, 2]);
    // The failed run built no workspace: it was refused before anything was prepared for it.
    expect(ports.recorded.gitCalls.filter((call) => call.startsWith('init'))).toHaveLength(1);
    // Said once, by the run that needed the name: not also as a leak of an earlier execution.
    expect(errors).toEqual([
      expect.stringMatching(/^run S1@1\.0\/baseline\/fake-model\/r1 failed: container /),
    ]);
  });

  it('warns once about each container of an earlier execution, and runs as usual', async () => {
    const { checked } = checkedCampaign();
    const earlier = [containerName(checked.campaign.id, 3, 1), containerName(checked.campaign.id, 7, 2)];
    const errors: string[] = [];
    const ports = doubles({ leftovers: earlier });

    const summary = await runCampaign(checked, { ...ports, logError: (line) => errors.push(line) });

    expect(summary.runs[0]?.outcome).toBe('completed');
    expect(errors).toEqual([
      `container ${earlier[0] ?? ''} was left behind by an interrupted run of execution 3 of this campaign ` +
        `(bug-003). Remove it with: docker rm --force ${earlier[0] ?? ''}`,
      `container ${earlier[1] ?? ''} was left behind by an interrupted run of execution 7 of this campaign ` +
        `(bug-003). Remove it with: docker rm --force ${earlier[1] ?? ''}`,
    ]);
  });

  it("asks only for this campaign's containers, and ignores another campaign's", async () => {
    const { checked } = checkedCampaign();
    const errors: string[] = [];
    const ports = doubles({ leftovers: ['bench-0123456789ab-1-S1-1.0-baseline-fake-model-r1'] });

    const summary = await runCampaign(checked, { ...ports, logError: (line) => errors.push(line) });

    expect(ports.recorded.listed).toEqual([`bench-${checked.campaign.id}-`]);
    expect(errors).toEqual([]);
    expect(summary.runs[0]?.outcome).toBe('completed');
  });

  it('warns about a leftover of an earlier execution than the current one, the ordinary rerun', async () => {
    const { checked, root } = checkedCampaign();
    // Executions 1 and 2 already ran, so this is execution 3.
    for (const n of ['1', '2']) mkdirSync(join(root, 'results', checked.campaign.id, n), { recursive: true });
    const earlier = containerName(checked.campaign.id, 1, 1);
    const errors: string[] = [];
    const ports = doubles({ leftovers: [earlier] });

    const summary = await runCampaign(checked, { ...ports, logError: (line) => errors.push(line) });

    expect(summary.execution).toBe(3);
    expect(errors).toEqual([
      expect.stringContaining(`container ${earlier} was left behind by an interrupted run of execution 1`),
    ]);
  });

  it('does not call a running container interrupted: another invocation of the campaign may own it', async () => {
    // The campaign id is a digest of the file, so the same campaign run from another checkout, or two
    // test suites at once, share the prefix. The runner cannot tell, so it says so instead of advising
    // a forced removal of someone else's run.
    const { checked } = checkedCampaign(campaignYaml({ repetitions: { S1: 2 } }));
    const mine = containerName(checked.campaign.id, 1, 1);
    const theirs = containerName(checked.campaign.id, 4, 1);
    const errors: string[] = [];
    const ports = doubles({ leftovers: [mine, theirs], running: [mine, theirs] });

    const summary = await runCampaign(checked, { ...ports, logError: (line) => errors.push(line) });

    expect(summary.runs[0]?.error).toBe(
      `container ${mine} already exists and is running: another invocation of this campaign may be ` +
        `using it. If none is, remove it with: docker rm --force ${mine}`,
    );
    expect(errors).toContain(
      `container ${theirs} of execution 4 is running: another invocation of this campaign may be using ` +
        `it. If none is, remove it with: docker rm --force ${theirs}`,
    );
    expect(errors.join('\n')).not.toMatch(/interrupted/);
  });

  it('reads the execution only from where the name puts it', async () => {
    const { checked } = checkedCampaign();
    const errors: string[] = [];
    const ports = doubles({ leftovers: [`bench-${checked.campaign.id}-manual2-debugging`] });

    await runCampaign(checked, { ...ports, logError: (line) => errors.push(line) });

    expect(errors).toEqual([]);
  });

  it('ignores a container that only shares the prefix, with no execution in its name', async () => {
    const { checked } = checkedCampaign();
    const errors: string[] = [];
    const ports = doubles({ leftovers: [`bench-${checked.campaign.id}-manual-debugging`] });

    const summary = await runCampaign(checked, { ...ports, logError: (line) => errors.push(line) });

    expect(errors).toEqual([]);
    expect(summary.runs[0]?.outcome).toBe('completed');
  });

  it('looks before building the image, and not before every run', async () => {
    const { checked } = checkedCampaign(campaignYaml({ repetitions: { S1: 3 } }));
    const order: string[] = [];
    const ports = doubles();
    const docker = {
      ...ports.docker,
      build: (request: Parameters<typeof ports.docker.build>[0]) => {
        order.push('build');
        return ports.docker.build(request);
      },
      containersNamed: (prefix: string) => {
        order.push('list');
        return ports.docker.containersNamed(prefix);
      },
    };

    await runCampaign(checked, { ...ports, docker });

    expect(order).toEqual(['list', 'build']);
  });

  it('does not start the campaign when Docker cannot say what is left behind', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({ failing: { call: 'list', error: 'docker ps did not answer within 30 s' } });

    await expect(runCampaign(checked, ports)).rejects.toThrow('docker ps did not answer within 30 s');
    expect(ports.recorded.builds).toEqual([]);
  });
});

describe('the setup phase (REQ-RUN-03, adr-003)', () => {
  const wingfoilCampaign = () =>
    campaignYaml({
      arms: ['baseline', 'wingfoil'],
      harnesses: { wingfoil: { tool: 'wingfoil', version: '3df305e' } },
    });

  it('writes the identity, copies the arm, runs its setup and commits it, all before step 1', async () => {
    const { root, checked } = checkedCampaign(campaignYaml());
    const ports = doubles({
      onStep: () =>
        expect(ports.recorded.execs.map((exec) => exec.command)).toContainEqual([
          'bash',
          '/home/node/arm/setup.sh',
        ]),
    });

    const summary = await runCampaign(checked, ports);

    const workspace = summary.runs[0]?.workspace ?? '';
    expect(ports.recorded.gitCalls.filter((call) => !/^(patch|tree) /.test(call))).toEqual([
      `init ${workspace}`,
      `commit ${workspace} seed`,
      `identity ${workspace} Benchmark Approver <approver@benchmark.localhost>`,
      `commit ${workspace} setup --allow-empty`,
      `head ${workspace}`,
      `commit ${workspace} step 01 --allow-empty`,
      `commit ${workspace} step 02 --allow-empty`,
    ]);
    expect(ports.recorded.copies).toEqual([
      `${join(root, 'arms', 'baseline')} -> container-1:/home/node/arm`,
    ]);
    expect(ports.recorded.steps.map((step) => step.mcpConfig)).toEqual([undefined, undefined]);
  });

  it("copies the arm's environment into the workspace, after the seed commit", async () => {
    const { checked } = checkedCampaign(wingfoilCampaign());
    const ports = doubles();

    const summary = await runCampaign(checked, {
      ...ports,
      harnessSources: { wingfoil: '/clones/wingfoil' },
    });

    const wingfoil = summary.runs.find((run) => run.arm === 'wingfoil');
    expect(readFileSync(join(wingfoil?.workspace ?? '', 'NOTES.md'), 'utf8')).toBe('environment/NOTES.md\n');
    const baseline = summary.runs.find((run) => run.arm === 'baseline');
    expect(existsSync(join(baseline?.workspace ?? '', 'NOTES.md'))).toBe(false);
  });

  it('gives an arm with MCP its configuration outside the workspace, on every step and resume', async () => {
    const { root, checked } = checkedCampaign(wingfoilCampaign());
    const ports = doubles({
      messageOf: (request) => (request.step === 1 && 'prompt' in request ? 'Shall I proceed?' : undefined),
    });

    await runCampaign(checked, { ...ports, harnessSources: { wingfoil: '/clones/wingfoil' } });

    expect(ports.recorded.copies.slice(1)).toEqual([
      `${join(root, 'arms', 'wingfoil')} -> container-2:/home/node/arm`,
      `${join(root, 'arms', 'wingfoil', 'mcp.json')} -> container-2:/home/node/mcp.json`,
      `${join(root, '.cache', 'harness', 'wingfoil', '3df305e'.padEnd(40, '0'), 'installed.tgz')} -> container-2:/home/node/harness.tgz`,
    ]);
    const wingfoilSteps = ports.recorded.steps.slice(2);
    expect(wingfoilSteps.map((step) => step.mcpConfig)).toEqual([
      '/home/node/mcp.json',
      '/home/node/mcp.json',
    ]);
    expect(ports.recorded.resumes.map((resume) => resume.mcpConfig)).toEqual([
      undefined,
      '/home/node/mcp.json',
    ]);
  });

  it('records the setup in run.json, apart from the steps', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles();

    const summary = await runCampaign(checked, ports);

    const record = JSON.parse(readFileSync(join(summary.runs[0]?.outputDir ?? '', 'run.json'), 'utf8')) as {
      setup: { duration_ms: number; usage: Record<string, number>; commit: string };
      steps: unknown[];
    };
    expect(record.setup.commit).toBe('5e7a9c0ffee5e7a9c0ffee5e7a9c0ffee5e7a9c0');
    expect(record.setup.duration_ms).toBeGreaterThanOrEqual(0);
    expect(Object.values(record.setup.usage).every((value) => value === 0)).toBe(true);
    expect(record.steps).toHaveLength(2);
  });

  it("stores the setup commit's patch, scrubbed, and every commit's tree, so a snapshot can be rebuilt (task-027)", async () => {
    const token = 'tok-SECRET';
    const { checked } = checkedCampaign();
    const ports = doubles({ patchOf: (_, ref) => `+${ref} with ${token}\n` });

    const summary = await runCampaign(checked, { ...ports, secrets: [token] });

    const outputDir = summary.runs[0]?.outputDir ?? '';
    expect(readFileSync(join(outputDir, 'setup', 'diff.patch'), 'utf8')).toBe('+HEAD with [redacted]\n');
    const record = JSON.parse(readFileSync(join(outputDir, 'run.json'), 'utf8')) as {
      setup: { tree: string };
      steps: { tree: string }[];
    };
    // The double answers each tree differently, in call order: setup first, then each step's.
    expect(record.setup.tree).toBe('tree-1'.padEnd(40, '0'));
    expect(record.steps.map((step) => step.tree)).toEqual([
      'tree-2'.padEnd(40, '0'),
      'tree-3'.padEnd(40, '0'),
    ]);
    // Each read after its own commit, so a tree is never the previous snapshot's.
    const workspace = summary.runs[0]?.workspace ?? '';
    expect(ports.recorded.gitCalls.slice(3)).toEqual([
      `commit ${workspace} setup --allow-empty`,
      `head ${workspace}`,
      `tree ${workspace} HEAD`,
      `patch ${workspace} HEAD`,
      `commit ${workspace} step 01 --allow-empty`,
      `patch ${workspace} HEAD`,
      `tree ${workspace} HEAD`,
      `commit ${workspace} step 02 --allow-empty`,
      `patch ${workspace} HEAD`,
      `tree ${workspace} HEAD`,
    ]);
  });

  it('keeps the setup output, scrubbed, as setup/log.txt', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      execResultOf: (command) =>
        command[0] === 'bash'
          ? { code: 0, stdout: 'installed with tok-SECRET\n', stderr: 'a warning\n' }
          : undefined,
    });

    const summary = await runCampaign(checked, { ...ports, secrets: ['tok-SECRET'] });

    const log = readFileSync(join(summary.runs[0]?.outputDir ?? '', 'setup', 'log.txt'), 'utf8');
    expect(log).toBe('installed with [redacted]\na warning\n');
  });

  it('names only the exit code of a setup that failed without a word', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      execResultOf: (command) => (command[0] === 'bash' ? { code: 1, stdout: '', stderr: '' } : undefined),
    });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.error).toBe('the setup of arm baseline failed with code 1');
  });

  it('fails the run on a failing setup, runs no step, and goes on with the campaign (REQ-NFR-03)', async () => {
    const { checked } = checkedCampaign(campaignYaml({ arms: ['baseline', 'baseline-notes'] }));
    const failed: string[] = [];
    const ports = doubles({
      execResultOf: (command) =>
        command[0] === 'bash' && ports.recorded.copies.length === 1
          ? { code: 3, stdout: '', stderr: 'npm ERR! network\nlast line of the failure\n' }
          : undefined,
    });

    const summary = await runCampaign(checked, { ...ports, logError: (line) => failed.push(line) });

    expect(summary.runs.map((run) => run.outcome)).toEqual(['failed', 'completed']);
    expect(summary.runs[0]?.error).toBe(
      'the setup of arm baseline failed with code 3: npm ERR! network\nlast line of the failure',
    );
    expect(summary.runs[0]?.steps).toEqual([]);
    expect(ports.recorded.steps.map((step) => step.step)).toEqual([1, 2]);
    expect(failed).toHaveLength(1);
    const record = JSON.parse(readFileSync(join(summary.runs[0]?.outputDir ?? '', 'run.json'), 'utf8')) as {
      setup: { code: number; commit?: string };
    };
    expect(record.setup.code).toBe(3);
    expect(record.setup.commit).toBeUndefined();
  });
});

describe('the operating manual (REQ-RUN-12, F2.7)', () => {
  it("puts the arm's manual in the workspace as CLAUDE.md before the setup runs, so no step's patch holds it", async () => {
    const { root, checked } = checkedCampaign();
    let present = false;
    const ports = doubles({
      execResultOf: (command) => {
        if (command[0] === 'bash')
          present = existsSync(join(ports.recorded.creates[0]?.workspace ?? '', 'CLAUDE.md'));
        return undefined;
      },
    });

    const summary = await runCampaign(checked, ports);

    expect(present).toBe(true);
    const workspace = summary.runs[0]?.workspace ?? '';
    expect(readFileSync(join(workspace, 'CLAUDE.md'), 'utf8')).toBe(
      readFileSync(join(root, 'arms', 'baseline', 'manual.md'), 'utf8'),
    );
  });

  it("records the manual's size with the run: bytes, the approximation, its method and the text's digest", async () => {
    const { root, checked } = checkedCampaign();
    writeFileSync(join(root, 'arms', 'baseline', 'manual.md'), 'Read README.md first.\n');
    const ports = doubles();

    const summary = await runCampaign(checked, ports);

    const record = JSON.parse(readFileSync(join(summary.runs[0]?.outputDir ?? '', 'run.json'), 'utf8')) as {
      manual: Record<string, unknown>;
    };
    expect(record.manual).toEqual({
      file: 'CLAUDE.md',
      sha256: createHash('sha256').update('Read README.md first.\n').digest('hex'),
      bytes: 22,
      tokens: 6,
      method: 'bytes-div-4',
      method_version: 1,
    });
  });

  it('refuses to replace a CLAUDE.md the seed already holds', async () => {
    const { root, checked } = checkedCampaign();
    writeFileSync(join(root, 'scenarios', 'S1', '1.0', 'seed', 'CLAUDE.md'), 'from the seed\n');
    const ports = doubles();

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toBe(
      "the workspace already holds a CLAUDE.md, from the seed or the arm's environment: the manual of arm baseline would replace it",
    );
    expect(ports.recorded.steps).toEqual([]);
  });
});

describe("the agent's auto-memory is kept out of the next step (bug-006, REQ-RUN-04)", () => {
  const CLEAR = ['sh', '-c', 'rm -rf "$HOME"/.claude/projects/*/memory'];

  it('clears it before every step, and never before a resume', async () => {
    const { checked } = checkedCampaign();
    const lastExecBefore: string[] = [];
    const ports = doubles({
      onStep: (request) => {
        lastExecBefore.push(
          `${'intervention' in request ? 'resume' : 'step'} ${request.step}: ${ports.recorded.execs.at(-1)?.command.join(' ') ?? ''}`,
        );
      },
      messageOf: (request) =>
        request.step === 1 && !('intervention' in request) ? 'Shall I proceed?' : undefined,
    });

    await runCampaign(checked, ports);

    expect(lastExecBefore).toEqual([
      `step 1: ${CLEAR.join(' ')}`,
      `resume 1: ${CLEAR.join(' ')}`,
      `step 2: ${CLEAR.join(' ')}`,
    ]);
    expect(ports.recorded.execs.filter((exec) => exec.command.join(' ') === CLEAR.join(' '))).toHaveLength(2);
  });

  it('fails the run when it cannot clear it: a step that might read the last one is not scored', async () => {
    const { checked } = checkedCampaign();
    const ports = doubles({
      execResultOf: (command) =>
        command[0] === 'sh' && command[2]?.startsWith('rm -rf')
          ? { code: 1, stdout: '', stderr: 'Permission denied\n' }
          : undefined,
    });

    const summary = await runCampaign(checked, ports);

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toBe(
      "could not clear the agent's auto-memory before step 01: Permission denied",
    );
    expect(ports.recorded.steps).toEqual([]);
  });

  it('turns it off in every container, which the pinned agent honours, and keeps it out of the secrets', async () => {
    const { checked } = checkedCampaign(campaignYaml({ arms: ['baseline', 'baseline-notes'] }));
    const ports = doubles();

    await runCampaign(checked, { ...ports, containerEnv: { ANTHROPIC_AUTH_TOKEN: 'tok' }, secrets: ['tok'] });

    expect(ports.recorded.creates.map((create) => create.env)).toEqual([
      { CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1', ANTHROPIC_AUTH_TOKEN: 'tok' },
      { CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1', ANTHROPIC_AUTH_TOKEN: 'tok' },
    ]);
  });
});
