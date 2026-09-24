import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { fakeAgent, loadFakeScript, readSession } from '../../src/agents/index.js';
import type { StepRequest } from '../../src/agents/index.js';
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
    const streams = ['completed.jsonl', 'question.jsonl'];
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
});
