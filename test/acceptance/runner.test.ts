import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { fakeAgent, loadFakeScript, readSession } from '../../src/agents/index.js';
import type { AgentPort, ResumeRequest, StepRequest } from '../../src/agents/index.js';
import { checkCampaign, runCampaign } from '../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';
import { doubles } from '../support/runner-doubles.js';
import { repoPath } from '../support/paths.js';
import { promptFile, stepNumbers, tempDir } from '../support/scenario-fixture.js';

/** A campaign of one scenario in the baseline arm, with the fake agent. */
function smokeCampaign(): Record<string, unknown> {
  const yaml = completeCampaignYaml();
  yaml.harnesses = {};
  yaml.arms = ['baseline'];
  yaml.scenarios = [{ id: 'S1', version: '1.0' }];
  yaml.repetitions = { S1: 1 };
  yaml.agent = { name: 'fake', version: '1.0.0' };
  yaml.models = { default: 'fake-model' };
  return yaml;
}

/** The replies of policy v1, as the feature file writes them: never the constants under test. */
const APPROVED = 'Approved. Proceed.';
const NO_INPUT = 'No further input is available. Make the most reasonable choice, record it, and proceed.';

/** A step of the fake's script: the recorded session it replays, then one recording per resume. */
interface ReplayedStep {
  readonly events: string;
  readonly resumes?: readonly string[];
}

/**
 * The fake agent replaying streams the real agent produced during the W2 spike (adr-002 decision
 * 13), with every resume the runner asks of it recorded. What the approver reads is what the agent
 * wrote; nothing in these scenarios is a message the test made up.
 */
function replayingAgent(steps: Record<string, ReplayedStep>, usdToEur: number) {
  const dir = tempDir('bench-approver-');
  for (const name of ['approval.jsonl', 'question.jsonl', 'completed.jsonl', 'resumed.jsonl']) {
    copyFileSync(repoPath(join('test/fixtures/sessions', name)), join(dir, name));
  }
  const script = join(dir, 'script.json');
  writeFileSync(
    script,
    JSON.stringify({
      S1: Object.fromEntries(
        Object.entries(steps).map(([n, step]) => [
          n,
          {
            commands: ['true'],
            events: step.events,
            resumes: (step.resumes ?? []).map((events) => ({ events })),
          },
        ]),
      ),
    }),
  );
  const loaded = loadFakeScript(script);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  const replaying = fakeAgent(loaded.value, { dir, usdToEur });
  const resumes: ResumeRequest[] = [];
  const agent: AgentPort = {
    runStep: (request) => replaying.runStep(request),
    resume: (request) => {
      resumes.push(request);
      return replaying.resume(request);
    },
  };
  return { agent, resumes };
}

/** The lines of a recorded session. */
function recording(name: string): string[] {
  return readFileSync(repoPath(join('test/fixtures/sessions', name)), 'utf8')
    .split('\n')
    .filter(Boolean);
}

/** What a run's own record says about its interventions (REQ-RUN-07). */
interface RunRecord {
  arm: string;
  approver_policy: string;
  interventions: { step: number; kind: string; reply: string }[];
  steps: { n: number; outcome: string; interventions: number }[];
}

function runRecord(outputDir: string | undefined): RunRecord {
  return JSON.parse(readFileSync(join(outputDir ?? '', 'run.json'), 'utf8')) as RunRecord;
}

describe('runner.feature', () => {
  it("@F2.1 Each run gets its own container with only the seed and the arm's environment", async () => {
    const { file } = writeRepo(smokeCampaign(), ['S1@1.0']);
    const checked = checkCampaign(file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const { docker, git, agent, recorded } = doubles();

    const summary = await runCampaign(checked.value, { docker, git, agent });

    expect(recorded.creates).toHaveLength(1);
    const created = recorded.creates[0];
    expect(created?.image).toBe(checked.value.campaign.id);
    const workspace = created?.workspace ?? '';
    expect(summary.runs[0]?.workspace).toBe(workspace);
    // The workspace holds the seed, and nothing else: no oracle, no prompts, no runner code.
    expect(readdirSync(workspace).sort()).toEqual(['README.md']);
    expect(existsSync(join(workspace, 'oracle'))).toBe(false);
    // The run's repository starts from the seed and nothing else; the per-step commits are F2.2's.
    expect(recorded.gitCalls.slice(0, 2)).toEqual([`init ${workspace}`, `commit ${workspace} seed`]);
    expect(recorded.removes).toEqual(['container-1']);
  });

  it('@F2.1 A run cannot see the hold-out even if the path is configured', async () => {
    const holdout = tempDir('bench-holdout-');
    writeFileSync(join(holdout, 'hidden-test.ts'), 'secret');
    process.env.BENCH_HOLDOUT_PATH = holdout;
    try {
      const { file } = writeRepo(smokeCampaign(), ['S1@1.0']);
      const checked = checkCampaign(file);
      expect(checked.ok).toBe(true);
      if (!checked.ok) return;
      const { docker, git, agent, recorded } = doubles();

      await runCampaign(checked.value, { docker, git, agent });

      const created = recorded.creates[0];
      expect(created?.workspace.startsWith(holdout)).toBe(false);
      expect(readdirSync(created?.workspace ?? '')).not.toContain('hidden-test.ts');
      // The container has one mount, the run's own workspace: nothing else can reach the hold-out.
      expect(await docker.mountsOf('container-1')).toEqual([`${created?.workspace ?? ''}:/workspace`]);
    } finally {
      delete process.env.BENCH_HOLDOUT_PATH;
    }
  });
  it('@F2.2 Each step starts a new agent session', async () => {
    const steps = 5;
    const { root, file } = writeRepo(smokeCampaign(), ['S1@1.0'], steps);
    // Each step's prompt is distinct, so "the runner passed the right one" is checkable.
    const promptOf = (n: number) => `do step ${n} of S1`;
    for (const n of stepNumbers(steps)) {
      writeFileSync(join(root, 'scenarios', 'S1', '1.0', promptFile(n)), promptOf(n));
    }
    const checked = checkCampaign(file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const { docker, git, agent, recorded } = doubles();

    const summary = await runCampaign(checked.value, { docker, git, agent });
    expect(summary.runs[0]?.outcome).toBe('completed');

    // Five separate sessions, one per step, each with its own id and its own prompt.
    expect(recorded.steps.map((request) => request.step)).toEqual(stepNumbers(steps));
    expect(recorded.steps.map((request) => request.prompt)).toEqual(stepNumbers(steps).map(promptOf));
    const sessions = recorded.steps.map((request) => request.sessionId);
    expect(new Set(sessions).size).toBe(steps);
    // No conversation state is passed from one session to the next: the request has nowhere to put
    // it. Asserting the exact shape is what keeps a later change from quietly adding a history.
    for (const request of recorded.steps) {
      expect(Object.keys(request).sort()).toEqual([
        'model',
        'prompt',
        'remainingCostUsd',
        'run',
        'scenarioId',
        'sessionId',
        'step',
      ]);
    }

    // After each step the working tree is committed with a message naming only the step number, with
    // --allow-empty so a step that changed nothing is still a snapshot, and the patch is read after
    // that commit: reading it before would store the previous step's diff under this step's number.
    const workspace = summary.runs[0]?.workspace ?? '';
    expect(recorded.gitCalls).toEqual([
      `init ${workspace}`,
      `commit ${workspace} seed`,
      ...stepNumbers(steps).flatMap((n) => [
        `commit ${workspace} step ${String(n).padStart(2, '0')} --allow-empty`,
        `patch ${workspace} HEAD`,
      ]),
    ]);

    // Every step leaves a snapshot to score, in the place REQ-FMT-06 gives it (REQ-RUN-05). The
    // double answers each call differently, so this also pins that step N's patch is filed under
    // steps/0N and not under some other step's number.
    for (const n of stepNumbers(steps)) {
      const patch = join(summary.runs[0]?.outputDir ?? '', 'steps', String(n).padStart(2, '0'), 'diff.patch');
      expect(readFileSync(patch, 'utf8')).toBe(`patch of ${workspace} at HEAD #${n}\n`);
    }
  });
  it('@F2.3 The Claude Code adapter records usage and the transcript of every session', async () => {
    // Driven by the fake replaying streams the real agent produced during the W2 spike (adr-002
    // decision 13), read by the same parser the real adapter uses. Nothing here is invented by the
    // test: what is asserted on disk is what readSession computes from those streams.
    const dir = tempDir('bench-replay-');
    // Two sessions that finished: a stream that ends waiting would now be answered by the approver
    // (F2.4), and this scenario is about what a session records, not about who answers it.
    const streams = ['completed.jsonl', 'completed-sonnet.jsonl'];
    for (const name of streams) copyFileSync(repoPath(join('test/fixtures/sessions', name)), join(dir, name));
    const script = join(dir, 'script.json');
    writeFileSync(
      script,
      JSON.stringify({
        S1: {
          '1': { commands: ['true'], events: streams[0] },
          '2': { commands: ['true'], events: streams[1] },
        },
      }),
    );
    const loaded = loadFakeScript(script);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const { file } = writeRepo(smokeCampaign(), ['S1@1.0'], 2);
    const checked = checkCampaign(file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const rate = checked.value.campaign.spec.currency.usd_to_eur;
    const { docker, git } = doubles();
    const replaying = fakeAgent(loaded.value, { dir, usdToEur: rate });
    const caps: number[] = [];
    const agent = {
      runStep: (request: StepRequest) => {
        caps.push(request.remainingCostUsd);
        return replaying.runStep(request);
      },
      resume: (request: ResumeRequest) => replaying.resume(request),
    };

    const summary = await runCampaign(checked.value, { docker, git, agent });

    const run = summary.runs[0];
    expect(run?.outcome).toBe('completed');
    for (const [index, name] of streams.entries()) {
      const events = readFileSync(repoPath(join('test/fixtures/sessions', name)), 'utf8')
        .split('\n')
        .filter(Boolean);
      const expected = readSession(events, rate);
      const stepDir = join(run?.outputDir ?? '', 'steps', String(index + 1).padStart(2, '0'));
      // Tokens by kind, the API-equivalent cost in both currencies, turns and wall time.
      expect(JSON.parse(readFileSync(join(stepDir, 'usage.json'), 'utf8'))).toEqual(expected.usage);
      // The full transcript is stored with the run, and each step's is its own.
      expect(readFileSync(join(stepDir, 'transcript.jsonl'), 'utf8')).toBe(
        events.map((e) => `${e}\n`).join(''),
      );
    }
    const first = readFileSync(join(run?.outputDir ?? '', 'steps', '01', 'transcript.jsonl'), 'utf8');
    const second = readFileSync(join(run?.outputDir ?? '', 'steps', '02', 'transcript.jsonl'), 'utf8');
    expect(first).not.toBe(second);

    // What the agent is told it may still spend shrinks by what the previous step cost (REQ-RUN-04).
    const spentEur = readSession(
      readFileSync(repoPath(join('test/fixtures/sessions', streams[0] as string)), 'utf8')
        .split('\n')
        .filter(Boolean),
      rate,
    ).usage.costEur;
    const cap = checked.value.campaign.spec.caps.run_cost_eur;
    expect(caps[0]).toBeCloseTo(cap / rate, 10);
    expect(caps[1]).toBeCloseTo((cap - spentEur) / rate, 10);

    // And the run's own record names what it was, with the per-step outcomes (adr-002 decision 11).
    const record = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'run.json'), 'utf8')) as {
      steps: { n: number; session: string; usage: { costUsd: number } }[];
      campaign: string;
    };
    expect(record.campaign).toBe(checked.value.campaign.id);
    expect(record.steps.map((step) => step.n)).toEqual([1, 2]);
    expect(record.steps[0]?.usage.costUsd).toBeCloseTo(
      readSession(
        readFileSync(repoPath(join('test/fixtures/sessions', streams[0] as string)), 'utf8')
          .split('\n')
          .filter(Boolean),
        rate,
      ).usage.costUsd,
      10,
    );
  });

  it('@F2.4 The neutral approver answers an approval request', async () => {
    const { file } = writeRepo(smokeCampaign(), ['S1@1.0'], 1);
    const checked = checkCampaign(file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const rate = checked.value.campaign.spec.currency.usd_to_eur;
    // The real approval request of the spike: its question mark is mid-message, it ends on a statement.
    const { agent, resumes } = replayingAgent(
      { '1': { events: 'approval.jsonl', resumes: ['completed.jsonl'] } },
      rate,
    );
    const { docker, git } = doubles();

    const summary = await runCampaign(checked.value, { docker, git, agent });

    const run = summary.runs[0];
    expect(run?.outcome).toBe('completed');
    // The runner resumes the same session with the policy's reply.
    expect(resumes.map((r) => [r.step, r.reply])).toEqual([[1, APPROVED]]);
    expect(resumes[0]?.sessionId).toBe(run?.steps[0]?.sessionId);
    // One intervention is recorded for that step: step, kind and reply.
    const record = runRecord(run?.outputDir);
    expect(record.interventions).toEqual([{ step: 1, kind: 'approval', reply: APPROVED }]);
    expect(record.steps).toMatchObject([{ n: 1, outcome: 'completed', interventions: 1 }]);
    // The step's usage is the session and its resume together, as the parser reads the two streams.
    const both = readSession([...recording('approval.jsonl'), ...recording('completed.jsonl')], rate);
    const stepDir = join(run?.outputDir ?? '', 'steps', '01');
    expect(JSON.parse(readFileSync(join(stepDir, 'usage.json'), 'utf8'))).toEqual(both.usage);
    expect(readFileSync(join(stepDir, 'transcript.jsonl'), 'utf8')).toBe(
      both.transcript.map((line) => `${line}\n`).join(''),
    );
  });

  it('@F2.4 The neutral approver answers a question', async () => {
    const { file } = writeRepo(smokeCampaign(), ['S1@1.0'], 1);
    const checked = checkCampaign(file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const rate = checked.value.campaign.spec.currency.usd_to_eur;
    // The spike's own sequence: a question, then the resumed session that answered it (P4, P6).
    const { agent, resumes } = replayingAgent(
      { '1': { events: 'question.jsonl', resumes: ['resumed.jsonl'] } },
      rate,
    );
    const { docker, git } = doubles();

    const summary = await runCampaign(checked.value, { docker, git, agent });

    const run = summary.runs[0];
    expect(run?.outcome).toBe('completed');
    expect(resumes.map((r) => [r.step, r.reply])).toEqual([[1, NO_INPUT]]);
    const record = runRecord(run?.outputDir);
    expect(record.interventions).toEqual([{ step: 1, kind: 'question', reply: NO_INPUT }]);
    expect(record.steps).toMatchObject([{ n: 1, outcome: 'completed', interventions: 1 }]);
  });

  it('@F2.4 A step ends after the maximum number of interventions', async () => {
    const { file } = writeRepo(smokeCampaign(), ['S1@1.0'], 2);
    const checked = checkCampaign(file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const rate = checked.value.campaign.spec.currency.usd_to_eur;
    // Four waiting sessions in step 1: the session, then three resumes that ask again. A fourth resume
    // is scripted too, so that a runner replying a fourth time would be heard, not refused by the fake.
    const { agent, resumes } = replayingAgent(
      {
        '1': {
          events: 'question.jsonl',
          resumes: ['question.jsonl', 'question.jsonl', 'question.jsonl', 'completed.jsonl'],
        },
        '2': { events: 'completed.jsonl' },
      },
      rate,
    );
    const { docker, git } = doubles();

    const summary = await runCampaign(checked.value, { docker, git, agent });

    const run = summary.runs[0];
    // The fourth waiting session gets no reply.
    expect(resumes.map((r) => r.intervention)).toEqual([1, 2, 3]);
    // The step's outcome is "intervention cap reached"; the run goes on and scores it as it stands.
    const record = runRecord(run?.outputDir);
    expect(record.steps).toMatchObject([
      { n: 1, outcome: 'intervention cap reached', interventions: 3 },
      { n: 2, outcome: 'completed', interventions: 0 },
    ]);
    expect(record.interventions).toEqual(
      [1, 2, 3].map(() => ({ step: 1, kind: 'question', reply: NO_INPUT })),
    );
    expect(run?.outcome).toBe('completed');
  });

  it('@F2.4 The policy is the same in every arm', async () => {
    const yaml = smokeCampaign();
    yaml.arms = ['baseline', 'baseline-docs', 'wingfoil'];
    yaml.harnesses = { wingfoil: { tool: 'wingfoil', version: '3df305e' } };
    const { file } = writeRepo(yaml, ['S1@1.0'], 1);
    const checked = checkCampaign(file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const rate = checked.value.campaign.spec.currency.usd_to_eur;
    // The same fake session in each arm: a question, then an approval request, then done.
    const { agent, resumes } = replayingAgent(
      { '1': { events: 'question.jsonl', resumes: ['approval.jsonl', 'completed.jsonl'] } },
      rate,
    );
    const { docker, git, recorded } = doubles();

    const summary = await runCampaign(checked.value, { docker, git, agent });

    // Three runs, in three different arms, each in a container of its own: the arm did vary.
    expect(summary.runs.map((run) => run.arm)).toEqual(['baseline', 'baseline-docs', 'wingfoil']);
    expect(new Set(recorded.creates.map((create) => create.workspace)).size).toBe(3);
    // Each arm receives the same replies, in the same order...
    expect(resumes.map((r) => r.reply)).toEqual([NO_INPUT, APPROVED, NO_INPUT, APPROVED, NO_INPUT, APPROVED]);
    for (const run of summary.runs) {
      const record = runRecord(run.outputDir);
      expect(record.arm).toBe(run.arm);
      expect(record.interventions).toEqual([
        { step: 1, kind: 'question', reply: NO_INPUT },
        { step: 1, kind: 'approval', reply: APPROVED },
      ]);
      // ...and the run log of each arm names the approver policy version.
      expect(record.approver_policy).toBe('v1');
    }
  });
});
