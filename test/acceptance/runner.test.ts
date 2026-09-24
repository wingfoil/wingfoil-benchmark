import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkCampaign, runCampaign } from '../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';
import { doubles } from '../support/runner-doubles.js';
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
    const { file } = writeRepo(smokeCampaign(), ['S1@1.0']);
    const checked = checkCampaign(file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const usage = {
      inputTokens: 10,
      outputTokens: 40,
      cacheCreationInputTokens: 6628,
      cacheReadInputTokens: 13790,
      costUsd: 0.009874,
      costEur: 0.009874 * 0.92,
      turns: 1,
      durationMs: 4236,
    };
    const { docker, git, agent } = doubles({
      usageOf: () => usage,
      transcriptOf: (request) => [`{"type":"result","step":${request.step}}`],
    });

    const summary = await runCampaign(checked.value, { docker, git, agent });

    const run = summary.runs[0];
    const step = join(run?.outputDir ?? '', 'steps', '01');
    // Tokens by kind, the API-equivalent cost in both currencies, turns and wall time (REQ-RUN-09).
    expect(JSON.parse(readFileSync(join(step, 'usage.json'), 'utf8'))).toEqual(usage);
    // The full transcript is stored with the run.
    expect(readFileSync(join(step, 'transcript.jsonl'), 'utf8')).toBe('{"type":"result","step":1}\n');
    // And the run's own record names what it was: the pins a reading of the usage needs.
    const record = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'run.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(record).toMatchObject({
      scenario: 'S1',
      version: '1.0',
      arm: 'baseline',
      model: 'fake-model',
      repetition: 1,
      agent: { name: 'fake', version: '1.0.0' },
      approver_policy: 'v1',
      outcome: 'completed',
    });
  });
});
