// The review loop's records, spending and command line (task-149, REQ-FMT-06, REQ-RUN-08, REQ-RUN-02, REQ-CLI-05 as
// amended in 1.58): what the acceptance scenarios of `runner.feature` do not show.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';

import { main } from '../../../src/cli/index.js';
import { executionSpendingEur } from '../../../src/results/index.js';
import { runCampaign } from '../../../src/runner/index.js';
import { writeArmsNamed } from '../../support/arm-fixture.js';
import { dryRunProfileYaml, priceCampaign, writeDryRunProfile } from '../../support/dry-run-fixture.js';
import { repoPath } from '../../support/paths.js';
import type { AgentPort } from '../../../src/agents/index.js';
import {
  finding,
  FIXER_PROMPT,
  findingsMessage,
  loopCampaign,
  REVIEW_PROMPT,
  reviewerDouble,
  reviewLoopYaml,
} from '../../support/review-fixture.js';
import { doubles, NO_USAGE } from '../../support/runner-doubles.js';
import { tempDir } from '../../support/scenario-fixture.js';

const io = () => {
  const out = { stdout: '', stderr: '' };
  return {
    out,
    io: {
      stdout: (text: string) => (out.stdout += text),
      stderr: (text: string) => (out.stderr += text),
    },
  };
};

describe("the loop's records (REQ-FMT-06 as amended in 1.58)", () => {
  it("keeps both sessions' transcripts out of git, as a step's", () => {
    const ignore = readFileSync(repoPath('.gitignore'), 'utf8').split('\n');
    expect(ignore).toContain('results/**/review/*/reviewer.jsonl');
    expect(ignore).toContain('results/**/review/*/fixer.jsonl');
  });

  it("counts a loop's cost in the campaign's spending, across executions (REQ-RUN-08)", () => {
    const execution = tempDir('bench-spent-');
    const run = join(execution, 'runs', 'S1@1.0', 'baseline', 'm', 'r1');
    mkdirSync(join(run, 'review'), { recursive: true });
    writeFileSync(join(run, 'run.json'), JSON.stringify({ steps: [{ usage: { costEur: 0.5 } }] }));
    writeFileSync(
      join(run, 'review', 'loop.json'),
      JSON.stringify({ outcome: 'clean', cost_eur: 0.25, rounds: [] }),
    );
    expect(executionSpendingEur(execution, 0.9)).toBeCloseTo(0.75, 9);
  });
});

describe("the loop's reviewer container (REQ-RUN-02 as amended in 1.58)", () => {
  it('refuses a reviewer container this execution left behind, as a run refuses its own', async () => {
    const { checked } = loopCampaign();
    const name = `bench-${checked.campaign.id}-1-S1-1.0-baseline-fake-model-r1-review-1`;
    const reviewer = reviewerDouble(() => findingsMessage());
    const ports = doubles({ leftovers: [name] });
    const summary = await runCampaign(checked, { ...ports, reviewer: { agent: reviewer } });
    const run = summary.runs[0];
    expect(run?.outcome).toBe('completed');
    const loop = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'review', 'loop.json'), 'utf8')) as {
      outcome: string;
      reason: string;
    };
    expect(loop).toMatchObject({ outcome: 'failed', reason: expect.stringContaining(name) });
    expect(reviewer.requests).toEqual([]);
    expect(ports.recorded.removes).not.toContain(name);
  });

  it('removes the reviewer container when its round ends', async () => {
    const reviewer = reviewerDouble(() => findingsMessage());
    const { checked } = loopCampaign();
    const ports = doubles();
    await runCampaign(checked, { ...ports, reviewer: { agent: reviewer } });
    // The run's container is container-1, the round's reviewer container-2.
    expect(ports.recorded.removes).toEqual(['container-2', 'container-1']);
    expect(ports.recorded.creates[1]).toMatchObject({ name: expect.stringMatching(/-review-1$/) });
  });
});

describe('the command line gives the runner its reviewer (REQ-RUN-15 for the reviewer agent)', () => {
  it('runs a campaign with the injected reviewer', async () => {
    const { checked } = loopCampaign();
    priceCampaign(checked.campaign.file);
    const reviewer = reviewerDouble(() => findingsMessage());
    const { out, io: streams } = io();
    expect(
      await main(['campaign', 'run', checked.campaign.file], streams, {
        ...doubles(),
        reviewerAgent: reviewer,
      }),
      out.stderr,
    ).toBe(0);
    expect(reviewer.requests).toHaveLength(1);
    // What the loops cost, apart from the steps' (REQ-RUN-09 as amended in 1.58).
    expect(out.stdout).toContain('review loops: 1 loop, 0.0000 EUR');
  });

  it('refuses a reviewer that spends without the spending flag, naming it', async () => {
    const loop = { ...reviewLoopYaml(), agent: { name: 'claude-code', version: '2.1.300' } };
    const { checked } = loopCampaign({ loop });
    priceCampaign(checked.campaign.file);
    const { out, io: streams } = io();
    // Refused as every refusal of `campaign run` is, before anything is built.
    expect(await main(['campaign', 'run', checked.campaign.file], streams, doubles())).toBe(1);
    expect(out.stderr).toMatch(/review_loop/);
    expect(out.stderr).toMatch(/--allow-spending/);
  });

  it("runs and records a dry run's loop (REQ-CLI-05)", async () => {
    const root = tempDir('bench-dry-loop-');
    cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    writeArmsNamed(root, ['baseline', 'baseline-docs', 'wingfoil']);
    mkdirSync(join(root, 'review'));
    writeFileSync(join(root, 'review', 'prompt.md'), REVIEW_PROMPT);
    writeFileSync(join(root, 'review', 'fixer-prompt.md'), FIXER_PROMPT);
    writeDryRunProfile(root, stringify({ ...dryRunProfileYaml(), review_loop: reviewLoopYaml() }));
    const reviewer = reviewerDouble(() => findingsMessage());
    const { out, io: streams } = io();
    const code = await main(
      ['scenario', 'dry-run', 'T3@1.0', '--arm', 'baseline'],
      streams,
      { ...doubles(), reviewerAgent: reviewer },
      root,
    );
    expect(code, out.stderr).toBe(0);
    const loopFile = join(root, 'results', 'dry-runs', '1', 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r1');
    expect(existsSync(join(loopFile, 'review', 'loop.json'))).toBe(true);
    expect(reviewer.requests).toHaveLength(1);
  });
});

describe("the loop's caps, stops and record (review round 1 of task-149)", () => {
  type Loop = {
    outcome: string;
    reason?: string;
    cost_eur: number;
    rounds: { n: number; findings: unknown }[];
  };
  const loopAt = (outputDir: string | undefined): Loop =>
    JSON.parse(readFileSync(join(outputDir ?? '', 'review', 'loop.json'), 'utf8')) as Loop;
  const eur = (costEur: number) => ({ ...NO_USAGE, costEur, costUsd: costEur });

  it("ends a loop at the campaign's ceiling between rounds, and stops the campaign (REQ-RUN-08)", async () => {
    const { checked } = loopCampaign({
      repetitions: 2,
      yaml: (yaml) => {
        yaml.budget = { warn_eur: 1, ceiling_eur: 1.5 };
      },
    });
    const reviewer = reviewerDouble(() => ({
      finalMessage: findingsMessage(finding('should-fix')),
      usage: eur(0.6),
    }));
    const ports = doubles({ usageOf: (request) => (request.step <= 2 ? eur(0.5) : NO_USAGE) });
    const summary = await runCampaign(checked, { ...ports, reviewer: { agent: reviewer } });
    expect(summary.runs).toHaveLength(1);
    expect(summary.outcome).toBe('budget exhausted');
    expect(summary.runs[0]?.outcome).toBe('completed');
    const loop = loopAt(summary.runs[0]?.outputDir);
    expect(loop).toMatchObject({
      outcome: 'interrupted',
      reason: expect.stringMatching(/ceiling.*before round 2/),
    });
    expect(loop.rounds.map((round) => round.n)).toEqual([1]);
    expect(loop.cost_eur).toBeCloseTo(0.6, 9);
  });

  it("ends the loop at the reviewer's token cap, cost cap and time cap", async () => {
    const run = async (
      reviewer: ReturnType<typeof reviewerDouble>,
      ports: Parameters<typeof doubles>[0] = {},
      loop = reviewLoopYaml(),
    ) => {
      const { checked } = loopCampaign({ loop });
      const summary = await runCampaign(checked, { ...doubles(ports), reviewer: { agent: reviewer } });
      return loopAt(summary.runs[0]?.outputDir);
    };
    const tokens = await run(
      reviewerDouble(() => ({ finalMessage: findingsMessage(), usage: { ...NO_USAGE, inputTokens: 20 } })),
      {},
      reviewLoopYaml({ caps: { session_tokens: 10 } }),
    );
    expect(tokens).toMatchObject({ outcome: 'failed', reason: expect.stringMatching(/token cap \(10\)/) });
    expect(tokens.rounds).toEqual([{ n: 1, findings: null, fixed: false }]);
    const cost = await run(reviewerDouble(() => ({ finalMessage: findingsMessage(), stop: 'cap reached' })));
    expect(cost).toMatchObject({ outcome: 'failed', reason: expect.stringMatching(/cost cap \(2 EUR\)/) });
    const time = await run(
      reviewerDouble(
        () => ({ error: 'no result event' }),
        () => ['sleep', '1000'],
      ),
      {
        execResultOf: (command) =>
          command[4] === 'sleep' ? { code: 124, stdout: '', stderr: '' } : undefined,
      },
    );
    expect(time).toMatchObject({ outcome: 'failed', reason: expect.stringMatching(/time cap \(600 s\)/) });
    // Killed before it reported: counted at its bound.
    expect(time.cost_eur).toBe(2);
  });

  it("waits a reviewer's rate limit out and resumes it, as a step's; after the last wait, the quota", async () => {
    const slept: number[] = [];
    const resumed: string[] = [];
    const limited = (always: boolean): AgentPort => ({
      runStep: (request) =>
        Promise.resolve({
          sessionId: request.sessionId,
          usage: NO_USAGE,
          transcript: [],
          stop: 'rate limited',
        }),
      resume: (request) => {
        resumed.push(request.reply);
        return Promise.resolve(
          always
            ? { sessionId: request.sessionId, usage: NO_USAGE, transcript: [], stop: 'rate limited' }
            : {
                sessionId: request.sessionId,
                usage: NO_USAGE,
                transcript: [],
                finalMessage: findingsMessage(),
              },
        );
      },
    });
    const sleep = (ms: number) => {
      slept.push(ms);
      return Promise.resolve();
    };
    const once = loopCampaign();
    const first = await runCampaign(once.checked, {
      ...doubles(),
      sleep,
      reviewer: { agent: limited(false) },
    });
    expect(loopAt(first.runs[0]?.outputDir).outcome).toBe('clean');
    expect(slept).toEqual([120_000]);
    expect(resumed).toEqual(['Continue.']);
    const always = loopCampaign();
    const second = await runCampaign(always.checked, {
      ...doubles(),
      sleep,
      reviewer: { agent: limited(true) },
    });
    expect(loopAt(second.runs[0]?.outputDir)).toMatchObject({
      outcome: 'quota exhausted',
      reason: expect.stringMatching(/after 4 rate-limit waits/),
    });
    expect(second.outcome).toBe('quota exhausted');
  });

  it('keeps an unfinished loop recorded, with its cost so far, while it runs (REQ-RUN-19)', async () => {
    const { checked } = loopCampaign();
    const seen: Loop[] = [];
    let outputDir = '';
    const reviewer = reviewerDouble((n) => {
      seen.push(loopAt(outputDir));
      return n === 1
        ? { finalMessage: findingsMessage(finding('blocker')), usage: eur(0.25) }
        : findingsMessage();
    });
    const ports = doubles({
      onStep: (request) => {
        // The run's output directory, known once its first step runs.
        if (request.step === 1) {
          outputDir = join(
            checked.campaign.resultsRoot,
            checked.campaign.id,
            '1',
            'runs',
            'S1@1.0',
            'baseline',
          );
          outputDir = join(outputDir, 'fake-model', 'r1');
        }
      },
    });
    await runCampaign(checked, { ...ports, reviewer: { agent: reviewer } });
    // Each session counted at its bound, session_cost_eur (2), while it runs: a session never finished costs that.
    expect(seen[0]).toMatchObject({
      outcome: 'interrupted',
      reason: 'the runner stopped during the loop',
      cost_eur: 2,
    });
    expect(seen[1]).toMatchObject({
      outcome: 'interrupted',
      cost_eur: 2.25,
      rounds: [{ n: 1, fixed: true }],
    });
  });

  it('refuses a prompt changed since the campaign was checked', async () => {
    const { checked, root } = loopCampaign();
    writeFileSync(join(root, 'review', 'prompt.md'), `${REVIEW_PROMPT}Changed.\n`);
    const reviewer = reviewerDouble(() => findingsMessage());
    const summary = await runCampaign(checked, { ...doubles(), reviewer: { agent: reviewer } });
    expect(loopAt(summary.runs[0]?.outputDir)).toMatchObject({
      outcome: 'failed',
      reason: expect.stringMatching(/review\/prompt\.md: its SHA-256 is/),
    });
    expect(reviewer.requests).toEqual([]);
  });

  it('does not resume a rate-limited reviewer over its token or cost cap, nor after the interrupt', async () => {
    const outcomeOf = async (usage: typeof NO_USAGE, signal?: AbortController) => {
      const resumes: string[] = [];
      const agent: AgentPort = {
        runStep: (request) =>
          Promise.resolve({ sessionId: request.sessionId, usage, transcript: [], stop: 'rate limited' }),
        resume: (request) => {
          resumes.push(request.reply);
          return Promise.resolve({
            sessionId: request.sessionId,
            usage,
            transcript: [],
            finalMessage: findingsMessage(),
          });
        },
      };
      const { checked } = loopCampaign({ loop: reviewLoopYaml({ caps: { session_tokens: 10 } }) });
      const summary = await runCampaign(checked, {
        ...doubles(),
        // The interrupt arrives during the wait, whose injected sleep never ends on its own.
        sleep: () => {
          signal?.abort();
          return signal === undefined ? Promise.resolve() : new Promise<void>(() => undefined);
        },
        ...(signal === undefined ? {} : { signal: signal.signal }),
        reviewer: { agent },
      });
      return { loop: loopAt(summary.runs[0]?.outputDir), resumes };
    };
    const tokens = await outcomeOf({ ...NO_USAGE, inputTokens: 11 });
    expect(tokens.loop).toMatchObject({
      outcome: 'failed',
      reason: expect.stringMatching(/token cap \(10\) at a rate limit/),
    });
    expect(tokens.resumes).toEqual([]);
    // Over the cap in USD at any rate the campaign pins (2 EUR).
    const cost = await outcomeOf({ ...NO_USAGE, costUsd: 10, costEur: 9 });
    expect(cost.loop).toMatchObject({
      outcome: 'failed',
      reason: expect.stringMatching(/cost cap \(2 EUR\) at a rate limit/),
    });
    expect(cost.resumes).toEqual([]);
    const interrupted = await outcomeOf(NO_USAGE, new AbortController());
    expect(interrupted.loop).toMatchObject({ outcome: 'interrupted', rounds: [{ n: 1, findings: null }] });
    expect(interrupted.resumes).toEqual([]);
  });

  it("moves the reviewer's time cap by a rate limit's wait, as a step's", async () => {
    const agent: AgentPort = {
      runStep: async (request) => {
        await request.run(['probe']);
        return { sessionId: request.sessionId, usage: NO_USAGE, transcript: [], stop: 'rate limited' };
      },
      resume: async (request) => {
        await request.run(['probe']);
        return {
          sessionId: request.sessionId,
          usage: NO_USAGE,
          transcript: [],
          finalMessage: findingsMessage(),
        };
      },
    };
    const ports = doubles();
    const { checked } = loopCampaign();
    // The clock stands still: only the wait moves the deadline.
    await runCampaign(checked, {
      ...ports,
      now: () => 0,
      sleep: () => Promise.resolve(),
      reviewer: { agent },
    });
    const seconds = ports.recorded.execs
      .filter((exec) => exec.command[4] === 'probe')
      .map((exec) => exec.command[3]);
    expect(seconds).toEqual(['600', '720']);
  });

  it('refuses a reviewer resume answered from another session', async () => {
    const agent: AgentPort = {
      runStep: (request) =>
        Promise.resolve({
          sessionId: request.sessionId,
          usage: NO_USAGE,
          transcript: [],
          stop: 'rate limited',
        }),
      resume: () =>
        Promise.resolve({
          sessionId: 'another',
          usage: NO_USAGE,
          transcript: [],
          finalMessage: findingsMessage(),
        }),
    };
    const { checked } = loopCampaign();
    const summary = await runCampaign(checked, {
      ...doubles(),
      sleep: () => Promise.resolve(),
      reviewer: { agent },
    });
    expect(loopAt(summary.runs[0]?.outputDir)).toMatchObject({
      outcome: 'failed',
      reason: expect.stringMatching(/ran in session another/),
    });
  });
});
