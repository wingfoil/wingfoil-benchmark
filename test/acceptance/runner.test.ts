import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { fakeAgent, loadFakeScript, readSession } from '../../src/agents/index.js';
import { renderProjectRules } from '../../src/arms/index.js';
import type { AgentPort, ResumeRequest, StepRequest } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { checkCampaign, runCampaign } from '../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';
import { doubles } from '../support/runner-doubles.js';
import { priceCampaign } from '../support/dry-run-fixture.js';
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

/** Every file below `directory`, at any depth. */
function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

/** A setup's usage: a v0.1 setup runs no agent, so every field is zero (adr-003 decision 11). */
const ZERO_USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  costUsd: 0,
  costEur: 0,
  turns: 0,
  durationMs: 0,
};

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
    // The workspace holds the seed and the arm's environment — here, its manual as CLAUDE.md (F2.7) —
    // and nothing else: no oracle, no prompts, no runner code.
    expect(readdirSync(workspace).sort()).toEqual(['CLAUDE.md', 'README.md']);
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

    // task-016 (REQ-CLI-10): the command line does not read the variable for a run. Set to a path
    // that does not exist, it would stop a command that resolved it; `campaign run` runs anyway, and
    // takes no --holdout at all.
    process.env.BENCH_HOLDOUT_PATH = join(tempDir('bench-holdout-'), 'nowhere');
    try {
      process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script.json');
      const { file } = writeRepo(smokeCampaign(), ['S1@1.0']);
      // The command's budget guard needs the campaign's dry runs (task-023).
      priceCampaign(file);
      let stderr = '';
      const io = { stdout: () => undefined, stderr: (text: string) => (stderr += text) };
      expect(await main(['campaign', 'run', file], io, doubles())).toBe(0);
      expect(stderr).not.toMatch(/BENCH_HOLDOUT_PATH|hold-out/);
      expect(await main(['campaign', 'run', file, '--holdout', '/x'], io, doubles())).toBe(2);
    } finally {
      delete process.env.BENCH_HOLDOUT_PATH;
    }
  });
  it("@F2.5 Each arm's setup is scripted and measured apart from the steps", async () => {
    const yaml = smokeCampaign();
    yaml.arms = ['baseline', 'wingfoil'];
    yaml.harnesses = { wingfoil: { tool: 'wingfoil', version: '3df305e' } };
    const checked = checkCampaign(writeRepo(yaml, ['S1@1.0']).file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const setupRanBeforeStep: boolean[] = [];
    const ports = doubles({
      // Setups report time and output, never tokens: a v0.1 setup runs no agent (adr-003 decision 11).
      onStep: (request) => {
        if (request.step === 1 && 'prompt' in request) {
          setupRanBeforeStep.push(
            ports.recorded.execs.some((exec) => exec.command.join(' ') === 'bash /home/node/arm/setup.sh'),
          );
        }
      },
      usageOf: () => ({ ...ZERO_USAGE, inputTokens: 100, costUsd: 0.5, costEur: 0.5, turns: 1 }),
    });

    // When the runner starts a run in the wingfoil arm
    const summary = await runCampaign(checked.value, {
      ...ports,
      harnessSources: { wingfoil: '/clones/wingfoil' },
    });

    // Then the arm's setup script runs before the first step
    const wingfoil = summary.runs.find((run) => run.arm === 'wingfoil');
    expect(wingfoil?.outcome).toBe('completed');
    expect(setupRanBeforeStep).toEqual([true, true]);
    // And its tokens, time and cost are recorded as setup, not as a step
    const record = JSON.parse(readFileSync(join(wingfoil?.outputDir ?? '', 'run.json'), 'utf8')) as {
      setup: { duration_ms: number; usage: typeof ZERO_USAGE };
      steps: { n: number; usage: typeof ZERO_USAGE }[];
    };
    expect(record.setup.usage).toEqual(ZERO_USAGE);
    expect(record.setup.duration_ms).toBeGreaterThanOrEqual(0);
    expect(record.steps.map((step) => step.n)).toEqual([1, 2]);
    expect(record.steps.every((step) => step.usage.inputTokens === 100)).toBe(true);
    expect(readdirSync(join(wingfoil?.outputDir ?? '', 'steps'))).toEqual(['01', '02']);
  });

  it("@F2.5 The baseline-docs environment is generated from the wingfoil arm's configuration", () => {
    // Given the wingfoil arm's configuration for S8 — T2 stands in for S8 until W8: a snapshot WingFoil
    // 3df305e wrote in a real run, with T2's rules (test/fixtures/wingfoil-config/README.md).
    const root = repoPath('test/fixtures/wingfoil-config/T2');
    const files = new Map(
      filesUnder(root).map((file) => [relative(root, file), readFileSync(file, 'utf8')] as const),
    );

    // When the baseline-docs environment for S8 is generated
    const rules = renderProjectRules(files);

    // Then it contains the same directives, decisions and project description as Markdown
    expect(rules).toContain('**Orders** — A small orders domain.');
    expect(rules).toContain('### No throw\n\nFunctions of the domain return a `Result` and never throw.\n');
    expect(rules).toContain('### Errors are returned as a Result\n\n##### Context\n');
    expect(rules).not.toContain('Benchmark Approver');
    expect(rules).toBe(readFileSync(repoPath('test/fixtures/wingfoil-config/T2.PROJECT_RULES.md'), 'utf8'));
    // And generating it twice yields byte-identical output, whatever order the files are read in
    expect(renderProjectRules(files)).toBe(rules);
    expect(renderProjectRules(new Map([...files].reverse()))).toBe(rules);
  });

  it('@F2.6 The WingFoil under test is the version pinned by the campaign', async () => {
    const sha = '3df305ea198d7e2ca0da73bfb12b14af865e9922';
    // Given the campaign pins wingfoil@3df305e
    const yaml = smokeCampaign();
    yaml.arms = ['baseline', 'wingfoil'];
    yaml.harnesses = { wingfoil: { tool: 'wingfoil', version: '3df305e' } };
    const { root, file } = writeRepo(yaml, ['S1@1.0']);
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const ports = doubles({
      commits: { '3df305e': sha },
      onRunOnce: (request) => {
        mkdirSync(join(request.mount.source, 'out'), { recursive: true });
        writeFileSync(join(request.mount.source, 'out', 'wingfoil-0.1.0.tgz'), 'tarball');
        writeFileSync(join(request.mount.source, 'out', 'installed.tgz'), 'installed');
      },
    });

    // When the runner sets up the wingfoil arm
    const summary = await runCampaign(checked.value, {
      ...ports,
      harnessSources: { wingfoil: '/clones/wingfoil' },
    });

    // Then the WingFoil installed in the container is built from commit 3df305e
    expect(ports.recorded.gitCalls).toContain(`archive /clones/wingfoil ${sha}`);
    expect(ports.recorded.runOnce[0]?.command.join(' ')).toContain(sha);
    const wingfoil = summary.runs.find((run) => run.arm === 'wingfoil');
    const record = JSON.parse(readFileSync(join(wingfoil?.outputDir ?? '', 'run.json'), 'utf8')) as {
      harness: { commit: string };
    };
    expect(record.harness.commit).toBe(sha);
    // And it is independent of the WingFoil that manages the benchmark repository: what reaches the
    // container is the artefact built from the clone, never anything under vendor/.
    const harnessCopies = ports.recorded.copies.filter((copy) => copy.endsWith(':/home/node/harness.tgz'));
    expect(harnessCopies).toEqual([
      `${join(root, '.cache', 'harness', 'wingfoil', sha, 'installed.tgz')} -> container-2:/home/node/harness.tgz`,
    ]);
    expect(ports.recorded.copies.some((copy) => copy.includes('vendor'))).toBe(false);
  });

  it('@F2.7 Each arm is activated by its operating manual, and prompts stay identical', async () => {
    const yaml = smokeCampaign();
    yaml.arms = ['baseline', 'baseline-docs', 'wingfoil'];
    yaml.harnesses = { wingfoil: { tool: 'wingfoil', version: '3df305e' } };
    const { root, file } = writeRepo(yaml, ['S1@1.0']);
    for (const arm of ['baseline', 'baseline-docs', 'wingfoil']) {
      writeFileSync(
        join(root, 'arms', arm, 'manual.md'),
        `# The ${arm} manual\n\n${'x'.repeat(arm.length * 10)}\n`,
      );
    }
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const ports = doubles();

    // When the runner prepares step 1 of S1 in every arm
    const summary = await runCampaign(checked.value, {
      ...ports,
      harnessSources: { wingfoil: '/clones/wingfoil' },
    });

    // Then the step prompt is byte-identical in every arm
    const firstSteps = ports.recorded.steps.filter((step) => step.step === 1);
    expect(firstSteps).toHaveLength(3);
    expect(new Set(firstSteps.map((step) => step.prompt)).size).toBe(1);
    expect(firstSteps[0]?.prompt).toBe(
      readFileSync(join(root, 'scenarios', 'S1', '1.0', 'prompts', '01.md'), 'utf8'),
    );
    for (const run of summary.runs) {
      const manual = readFileSync(join(root, 'arms', run.arm, 'manual.md'), 'utf8');
      // And each arm's environment contains that arm's operating manual
      expect(readFileSync(join(run.workspace, 'CLAUDE.md'), 'utf8')).toBe(manual);
      // And the size of each operating manual in tokens is recorded with the run
      const record = JSON.parse(readFileSync(join(run.outputDir, 'run.json'), 'utf8')) as {
        manual: { tokens: number; method: string };
      };
      expect(record.manual).toMatchObject({
        tokens: Math.ceil(Buffer.byteLength(manual) / 4),
        method: 'bytes-div-4',
      });
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
    // that commit: reading it before would store the previous step's diff under this step's number. The
    // setup's commit comes first: step 1 starts from it (adr-003 decision 10).
    const workspace = summary.runs[0]?.workspace ?? '';
    // Every patch runs from the snapshot before it to this one, by their trees (task-027, bug-007).
    const tree = (n: number) => `tree-${n}`.padEnd(40, '0');
    expect(recorded.gitCalls).toEqual([
      `init ${workspace}`,
      `commit ${workspace} seed`,
      `tree ${workspace} HEAD`,
      `identity ${workspace} Benchmark Approver <approver@benchmark.localhost>`,
      `commit ${workspace} setup --allow-empty`,
      `head ${workspace}`,
      `tree ${workspace} HEAD`,
      `patch ${workspace} ${tree(1)} ${tree(2)}`,
      ...stepNumbers(steps).flatMap((n) => [
        `commit ${workspace} step ${String(n).padStart(2, '0')} --allow-empty`,
        `tree ${workspace} HEAD`,
        `patch ${workspace} ${tree(n + 1)} ${tree(n + 2)}`,
      ]),
    ]);

    // Every step leaves a snapshot to score, in the place REQ-FMT-06 gives it (REQ-RUN-05). The
    // double answers each call differently, so this also pins that step N's patch is filed under
    // steps/0N and not under some other step's number.
    for (const n of stepNumbers(steps)) {
      const patch = join(summary.runs[0]?.outputDir ?? '', 'steps', String(n).padStart(2, '0'), 'diff.patch');
      // The setup's patch is #1 (task-027), so step N's is #N+1.
      expect(readFileSync(patch, 'utf8')).toBe(
        `patch of ${workspace} from ${tree(n + 1)} to ${tree(n + 2)} #${n + 1}\n`,
      );
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
    // One session, two invocations: its work is summed, and its cost is the session's total as the
    // resume reported it (0.0681071 USD), not that total plus the question's own cost again.
    const usage = JSON.parse(
      readFileSync(join(run?.outputDir ?? '', 'steps', '01', 'usage.json'), 'utf8'),
    ) as {
      inputTokens: number;
      turns: number;
      costUsd: number;
      costEur: number;
    };
    expect(usage.inputTokens).toBe(10 + 98);
    expect(usage.turns).toBe(1 + 12);
    expect(usage.costUsd).toBeCloseTo(0.0681071, 12);
    expect(usage.costEur).toBeCloseTo(0.0681071 * rate, 12);
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

    const summary = await runCampaign(checked.value, {
      docker,
      git,
      agent,
      harnessSources: { wingfoil: '/clones/wingfoil' },
    });

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
