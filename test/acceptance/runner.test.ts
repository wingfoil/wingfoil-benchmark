import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { claudeCodeAgent, fakeAgent, loadFakeScript, readSession } from '../../src/agents/index.js';
import { renderProjectRules } from '../../src/arms/index.js';
import type { AgentPort, ResumeRequest, StepRequest } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import { buildReviewCopy, checkCampaign, runCampaign, setupAddedPaths } from '../../src/runner/index.js';
import { writeArmsNamed } from '../support/arm-fixture.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';
import { doubles, NO_USAGE } from '../support/runner-doubles.js';
import {
  finding,
  findingsMessage,
  FIXER_PROMPT,
  loopCampaign,
  REVIEW_PROMPT,
  reviewerDouble,
  reviewLoopYaml,
} from '../support/review-fixture.js';
import { dryRunProfileYaml, priceCampaign, writeDryRunProfile } from '../support/dry-run-fixture.js';
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
    // Given the wingfoil arm's configuration for S8: a snapshot WingFoil v0.2.2 wrote in a real run, with
    // S8's rules (test/fixtures/wingfoil-config/README.md; task-038, T2 stood in for S8 until W8)
    const root = repoPath('test/fixtures/wingfoil-config/S8');
    const files = new Map(
      filesUnder(root).map((file) => [relative(root, file), readFileSync(file, 'utf8')] as const),
    );

    // When the baseline-docs environment for S8 is generated
    const rules = renderProjectRules(files);

    // Then it contains the same directives, decisions and project description as Markdown
    expect(rules).toContain(
      '**Tidy Tasks** — The task list behind a small to-do app for households and small teams.',
    );
    for (const title of [
      'No new runtime dependency',
      'TSDoc on every exported function',
      'No wall clock or randomness in the domain',
      'Errors are returned as a Result in the domain',
    ]) {
      expect(rules).toContain(`### ${title}\n`);
    }
    expect(rules).not.toContain('Benchmark Approver');
    expect(rules).toBe(readFileSync(repoPath('test/fixtures/wingfoil-config/S8.PROJECT_RULES.md'), 'utf8'));
    // And generating it twice yields byte-identical output, whatever order the files are read in
    expect(renderProjectRules(files)).toBe(rules);
    expect(renderProjectRules(new Map([...files].reverse()))).toBe(rules);
  });

  it("@F2.5 A docs control that declares every role gets every role's rules, labelled", () => {
    // Given the wingfoil arm's configuration binds directives to several roles: S8's snapshot, whose scaffold binds
    // testing to the developer and qa, traceability to the architect, the product owner and the reviewer
    const root = repoPath('test/fixtures/wingfoil-config/S8');
    const files = new Map(
      filesUnder(root).map((file) => [relative(root, file), readFileSync(file, 'utf8')] as const),
    );
    // And the baseline-docs arm declares that it renders every role's directives
    expect(readFileSync(repoPath('arms/baseline-docs/arm.yaml'), 'utf8')).toMatch(
      /^docs_directives: every-role$/m,
    );

    // When the baseline-docs environment is generated
    const rules = renderProjectRules(files, { everyRole: true });

    // Then every directive a role loads appears once, labelled with the roles it is bound to
    const section = rules.slice(
      rules.indexOf('## Rules'),
      rules.indexOf('\n## ', rules.indexOf('## Rules') + 1),
    );
    const titles = [...section.matchAll(/^### (.+)$/gm)].map((match) => match[1]);
    expect(new Set(titles).size).toBe(titles.length);
    expect(section.match(/^For: /gm)).toHaveLength(titles.length);
    expect(section).toMatch(/\nFor: architect, product-owner, reviewer\.\n/);
    expect(section).toMatch(/\nFor: developer, qa\.\n/);
    expect(section).toMatch(/\nFor: every role\.\n/);
    // And a docs control without that declaration gets the developer's and the global directives only
    const plain = renderProjectRules(files);
    expect(plain).not.toMatch(/^For: /m);
    expect(plain).toBe(readFileSync(repoPath('test/fixtures/wingfoil-config/S8.PROJECT_RULES.md'), 'utf8'));
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
      `${join(root, '.cache', 'harnesses', 'wingfoil', sha, 'installed.tgz')} -> container-2:/home/node/harness.tgz`,
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
        // The step's own commit messages (task-035), from the snapshot before it, read before the
        // step commit so that the runner's own is never among them.
        `messages ${workspace} ${`commit-${n}`.padEnd(40, '0')}`,
        `authors ${workspace} ${`commit-${n}`.padEnd(40, '0')}`,
        `commit ${workspace} step ${String(n).padStart(2, '0')} --allow-empty`,
        `head ${workspace}`,
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
    // The step's usage is the session and its resume together, as the parser reads the two streams; its tokens are
    // every model's, at the latest reading per model (bug-012, task-069). These two recordings are two sessions under
    // one model key, so the figure is the rule's, not a real session's: the real pair is the question's test above.
    const both = readSession([...recording('approval.jsonl'), ...recording('completed.jsonl')], rate);
    const models = Object.values(both.models);
    const sum = (pick: (m: (typeof models)[number]) => number) =>
      models.reduce((total, m) => total + pick(m), 0);
    const stepDir = join(run?.outputDir ?? '', 'steps', '01');
    expect(JSON.parse(readFileSync(join(stepDir, 'usage.json'), 'utf8'))).toEqual({
      ...both.usage,
      inputTokens: sum((m) => m.inputTokens),
      outputTokens: sum((m) => m.outputTokens),
      cacheCreationInputTokens: sum((m) => m.cacheCreationInputTokens),
      cacheReadInputTokens: sum((m) => m.cacheReadInputTokens),
    });
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
      outputTokens: number;
      cacheCreationInputTokens: number;
      cacheReadInputTokens: number;
      turns: number;
      costUsd: number;
      costEur: number;
    };
    expect(usage.inputTokens).toBe(10 + 98);
    // bug-012 (task-069): one real session, so the tokens summed over its models, at their latest total, are its
    // two invocations' work: 20 858 under the alias the question reported, 289 720 under the dated id of the resume.
    expect(
      usage.inputTokens + usage.outputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens,
    ).toBe(20_858 + 289_720);
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

describe('a step that ends with no result event (REQ-RUN-09 as amended in 1.49, task-130)', () => {
  /** S1 (two steps) in the baseline arm, once, at 1 EUR/USD, a run cost cap of 3 EUR. */
  function campaign() {
    const { file } = writeRepo(
      {
        ...completeCampaignYaml(),
        harnesses: {},
        arms: ['baseline'],
        scenarios: [{ id: 'S1', version: '1.0' }],
        repetitions: { S1: 1 },
        agent: { name: 'claude-code', version: '2.1.300' },
        models: { default: 'claude-sonnet-5-5' },
        caps: { step_time_s: 60, step_tokens: 1000, run_cost_eur: 3 },
        budget: { warn_eur: 100, ceiling_eur: 100 },
        currency: { usd_to_eur: 1 },
      },
      ['S1@1.0'],
    );
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    return checked.value;
  }
  /** A Claude Code session's stream, cut before its result event. */
  const CUT = `${JSON.stringify({ type: 'system', subtype: 'init', session_id: 's' })}\n`;
  const agentCommand = (command: readonly string[]) => command.includes('claude');

  it('@F2.3 A step that ends with no result event is counted at its bound', async () => {
    // Given a Claude Code step whose session ends before its result event
    const ports = doubles({
      execResultOf: (command) => (agentCommand(command) ? { code: 1, stdout: CUT, stderr: '' } : undefined),
    });
    const agent = claudeCodeAgent({ token: 'not-a-token', usdToEur: 1 });
    const cut = await runCampaign(campaign(), { ...ports, agent });
    // Then its cost is its bound, recorded with "cost_reported: false", never zero
    expect(cut.runs[0]?.steps[0]).toMatchObject({ n: 1, costBoundUsd: 3 });
    const record = JSON.parse(
      readFileSync(
        join(cut.resultsDir, 'runs', 'S1@1.0', 'baseline', 'claude-sonnet-5-5', 'r1', 'run.json'),
        'utf8',
      ),
    ) as {
      steps: { cost_reported?: boolean; cost_bound_usd?: number }[];
    };
    expect(record.steps[0]).toMatchObject({ cost_reported: false, cost_bound_usd: 3 });

    // Given the runner interrupted during a step
    const interrupt = new AbortController();
    const options: unknown[] = [];
    const base = doubles();
    let ended: ((result: { code: number; stdout: string; stderr: string }) => void) | undefined;
    const interrupted = await runCampaign(campaign(), {
      ...base,
      agent,
      signal: interrupt.signal,
      docker: {
        ...base.docker,
        exec: (container, command, execOptions) => {
          if (!agentCommand(command)) return base.docker.exec(container, command, execOptions);
          options.push(execOptions);
          setTimeout(() => interrupt.abort(), 0);
          // The agent runs until the runner removes its container; its process never sees the terminal's SIGINT.
          return new Promise((resolve) => {
            ended = resolve;
          });
        },
        remove: async (container) => {
          ended?.({ code: 137, stdout: CUT, stderr: '' });
          return base.docker.remove(container);
        },
      },
    });
    // Then the step is recorded "interrupted" at its bound, the agent's process kept out of the terminal's interrupt
    expect(interrupted.runs[0]?.steps[0]).toMatchObject({ outcome: 'interrupted', costBoundUsd: 3 });
    expect(options).toEqual([{ ownProcessGroup: true }]);

    // ... and a resume cut the same way counts at its bound, the session's reported cost kept within it
    const idAfter = (command: readonly string[], flag: string) => command[command.indexOf(flag) + 1] ?? '';
    const asked = (id: string) =>
      [
        JSON.stringify({ type: 'system', subtype: 'init', session_id: id }),
        JSON.stringify({
          type: 'result',
          is_error: false,
          terminal_reason: 'completed',
          session_id: id,
          total_cost_usd: 1,
          result: 'Shall I proceed?',
        }),
      ].join('\n');
    const resumed = await runCampaign(campaign(), {
      ...doubles({
        execResultOf: (command) => {
          if (!agentCommand(command)) return undefined;
          if (command.includes('--resume')) return { code: 1, stdout: CUT, stderr: '' };
          return { code: 0, stdout: asked(idAfter(command, '--session-id')), stderr: '' };
        },
      }),
      agent,
    });
    const [first] = resumed.runs[0]?.steps ?? [];
    expect(first?.interventions).toHaveLength(1);
    expect(first?.usage.costUsd).toBe(1);
    expect(first?.costBoundUsd).toBe(3);

    // Given a dry run interrupted during a step
    const root = tempDir('bench-dry-repo-');
    cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    writeArmsNamed(root, ['baseline', 'baseline-docs', 'wingfoil']);
    writeDryRunProfile(root, dryRunProfileYaml());
    let stdout = '';
    await main(
      ['scenario', 'dry-run', 'T3@1.0', '--arm', 'baseline'],
      { stdout: (text) => (stdout += text), stderr: () => undefined },
      doubles({
        onStep: () => {
          process.emit('SIGINT');
          throw new Error('the agent exited with code 130');
        },
      }),
      root,
    );
    // Then its record keeps the cost its steps spent, and its summary counts it
    const dry = JSON.parse(
      readFileSync(
        join(root, 'results', 'dry-runs', '1', 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r1', 'run.json'),
        'utf8',
      ),
    ) as { outcome: string; steps: { cost_reported?: boolean; cost_bound_usd?: number }[] };
    expect(dry.outcome).toBe('interrupted');
    expect(dry.steps[0]).toMatchObject({ cost_reported: false });
    expect(stdout).toContain(`step 01 ${(dry.steps[0]?.cost_bound_usd ?? 0).toFixed(4)} USD (at its bound)`);
  });
});

describe('runner.feature, the review loop (task-149, F4.9)', () => {
  /** The run's `review/` record. */
  interface LoopRecord {
    reviewer: { agent: { name: string; version: string }; model: string; effort: string };
    prompt_sha256: string;
    fixer_prompt_sha256: string;
    max_rounds: number;
    outcome: string;
    reason?: string;
    cost_eur: number;
    rounds: { n: number; findings: Record<string, number> | null; fixed: boolean }[];
  }
  const loopOf = (outputDir: string): LoopRecord =>
    JSON.parse(readFileSync(join(outputDir, 'review', 'loop.json'), 'utf8')) as LoopRecord;
  /** S1 has two steps: a fixer session is the step after the last, one per round. */
  const isFixer = (request: { step: number }) => request.step > 2;

  /** A campaign of S1 with a review loop, run with the doubles and `reviewer`. */
  async function loopRun(
    reviewer: ReturnType<typeof reviewerDouble>,
    options: {
      ports?: Parameters<typeof doubles>[0];
      loop?: Record<string, unknown>;
      arms?: readonly string[];
      repetitions?: number;
      runner?: Partial<Parameters<typeof runCampaign>[1]>;
      yaml?: (yaml: Record<string, unknown>) => void;
      /** Filled with the doubles before the run starts: what a hook reads during it. */
      seen?: { ports?: ReturnType<typeof doubles> };
    } = {},
  ) {
    const { checked, root } = loopCampaign({
      ...(options.arms === undefined ? {} : { arms: options.arms }),
      ...(options.repetitions === undefined ? {} : { repetitions: options.repetitions }),
      ...(options.loop === undefined ? {} : { loop: options.loop }),
      ...(options.yaml === undefined ? {} : { yaml: options.yaml }),
    });
    const ports = doubles(options.ports);
    if (options.seen !== undefined) options.seen.ports = ports;
    const summary = await runCampaign(checked, {
      ...ports,
      reviewer: { agent: reviewer },
      ...options.runner,
    });
    const run = summary.runs[0];
    if (run === undefined) throw new Error('no run');
    return { summary, ports, run, checked, root };
  }

  /** Every file below `dir` but `review/`, its content with `replace`'s pairs replaced. */
  function recordsOf(dir: string, replace: readonly [string, string][]): Record<string, string> {
    return Object.fromEntries(
      filesUnder(dir)
        .filter((file) => !relative(dir, file).startsWith('review'))
        .map((file) => [
          relative(dir, file),
          replace
            .reduce((text, [from, to]) => text.replaceAll(from, to), readFileSync(file, 'utf8'))
            // Each session's id is random, and a setup's duration is measured: what two identical runs differ by.
            .replaceAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<session>')
            .replaceAll(/"duration_ms": \d+/g, '"duration_ms": <ms>'),
        ]),
    );
  }

  it('@F4.9 The review loop runs after the last step, never changing what is scored', async () => {
    // Given a completed run of a campaign that pins a review loop
    const reviewer = reviewerDouble((n) =>
      n === 1 ? findingsMessage(finding('should-fix', 'README.md', 1)) : findingsMessage(),
    );
    let containerAtFix: { removed: boolean; reviewers: number } | undefined;
    const seen: { ports?: ReturnType<typeof doubles> } = {};
    const ports: Parameters<typeof doubles>[0] = {
      onStep: (request) => {
        if (isFixer(request)) {
          containerAtFix = {
            removed: seen.ports?.recorded.removes.includes('container-1') ?? true,
            reviewers: (seen.ports?.recorded.creates.length ?? 0) - 1,
          };
        }
      },
    };
    const looped = await loopRun(reviewer, { ports, seen });
    const plain = await (async () => {
      const { checked, root } = loopCampaign({ loop: null });
      const d = doubles();
      const summary = await runCampaign(checked, d);
      return { run: summary.runs[0], checked, root, ports: d };
    })();

    // When its last step's commit and patch are stored, the loop starts
    const calls = looped.ports.recorded.gitCalls;
    const workspace = looped.run.workspace;
    const lastStep = calls.indexOf(`commit ${workspace} step 02 --allow-empty`);
    const firstExport = calls.findIndex((call) => call.startsWith('export '));
    expect(lastStep).toBeGreaterThan(-1);
    expect(firstExport).toBeGreaterThan(lastStep);
    // Then the reviewer reads a stripped copy, in a container of its own whose only mount is the copy
    const reviewerCreate = looped.ports.recorded.creates[1];
    expect(reviewerCreate?.image).toBe(`${looped.checked.campaign.id}-review`);
    expect(reviewerCreate?.workspace).not.toBe(workspace);
    expect(reviewerCreate?.workspace).toBe(join(dirname(workspace), 'review', '1'));
    expect(reviewer.requests).toHaveLength(2);
    // And the fixer works in the run's workspace, its container still there
    expect(containerAtFix).toEqual({ removed: false, reviewers: 1 });
    expect(calls).toContain(`commit ${workspace} review fix 1 --allow-empty`);
    expect(looped.ports.recorded.removes.at(-1)).toBe('container-1');
    expect(loopOf(looped.run.outputDir).outcome).toBe('clean');
    // And the run's patches, and its scores, are those it would have without the loop
    expect(looped.run.outcome).toBe('completed');
    const replace = (root: string, id: string): [string, string][] => [
      [root, '<root>'],
      [id, '<id>'],
    ];
    expect(recordsOf(looped.run.outputDir, replace(looped.root, looped.checked.campaign.id))).toEqual(
      recordsOf(plain.run?.outputDir ?? '', replace(plain.root, plain.checked.campaign.id)),
    );
    expect(existsSync(join(plain.run?.outputDir ?? '', 'review'))).toBe(false);
  });

  it('@F4.9 A run that did not complete has no loop', async () => {
    // Given a run of a campaign that pins a review loop, killed at its step cap
    const reviewer = reviewerDouble(() => findingsMessage());
    const { run, ports } = await loopRun(reviewer, {
      ports: { stopOf: (request) => (request.step === 1 ? 'cap reached' : undefined) },
    });
    // When the run ends
    expect(run.outcome).toBe('cap reached');
    // Then its "review/loop.json" records "no loop" with the run's outcome, and no review session runs
    expect(loopOf(run.outputDir)).toMatchObject({ outcome: 'no loop', reason: 'cap reached', rounds: [] });
    expect(reviewer.requests).toEqual([]);
    expect(ports.recorded.creates).toHaveLength(1);
  });

  it('@F4.9 The reviewer sees the code without what the setup installed', async () => {
    // Given a run of "speckit" whose setup added ".specify/scripts/bash/common.sh", "CLAUDE.md" and ".mcp.json"
    const workspace = tempDir('bench-review-ws-');
    const sh = (...args: string[]) =>
      execFileSync('git', ['-C', workspace, ...args], {
        encoding: 'utf8',
        env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
      }).trim();
    const write = (path: string, text: string) => {
      mkdirSync(dirname(join(workspace, path)), { recursive: true });
      writeFileSync(join(workspace, path), text);
    };
    const commit = (message: string) => {
      sh('add', '--all');
      sh('-c', 'user.name=Runner', '-c', 'user.email=runner@bench', 'commit', '-q', '-m', message);
      return sh('rev-parse', 'HEAD^{tree}');
    };
    sh('init', '-q', '--initial-branch=main');
    write('README.md', '# Shop\n');
    write('src/index.ts', 'export {};\n');
    const seed = commit('seed');
    write('.specify/scripts/bash/common.sh', '#!/bin/sh\n');
    write('.specify/memory/constitution.md', '# Constitution template\n');
    write('CLAUDE.md', '# Manual\n');
    write('.mcp.json', '{}\n');
    write('.claude/commands/plan.md', 'Plan.\n');
    write('README.md', '# Shop\n\nSet up.\n');
    const setup = commit('setup');
    // And whose agent wrote "src/cart.ts" and "specs/001-cart/spec.md"
    write('src/cart.ts', 'export const cart = [];\n');
    write('specs/001-cart/spec.md', '# Cart\n');
    write('.specify/memory/constitution.md', '# Constitution of the shop\n');
    write('src/CLAUDE.md', '# Nested manual\n');
    write('README.md', '# Shop\n\nSet up, then the cart.\n');
    const final = commit('step 01: a message of the run');
    // What the run's workspace holds beside its commits never reaches the copy: only trees are read.
    write('prompts/01.md', 'Step one.\n');
    write('oracle/expected.ts', 'export {};\n');

    // When the reviewer session starts
    const git = gitCli(systemProcess);
    const stripped = await setupAddedPaths(workspace, seed, setup, git);
    const copyDir = join(tempDir('bench-review-copy-'), '1');
    const commits = await buildReviewCopy({ workspace, copyDir, before: seed, after: final, stripped }, git);

    // Then its copy holds "src/cart.ts" and "specs/001-cart/spec.md" and none of the setup's paths
    const held = filesUnder(copyDir)
      .map((file) => relative(copyDir, file))
      .filter((path) => !path.startsWith('.git/'))
      .sort();
    expect(held).toEqual(['README.md', 'specs/001-cart/spec.md', 'src/cart.ts', 'src/index.ts']);
    // And a setup-added file a step changed, such as the constitution, is not in it either
    expect(existsSync(join(copyDir, '.specify'))).toBe(false);
    // A seed path the setup changed keeps its final content, as project code
    expect(readFileSync(join(copyDir, 'README.md'), 'utf8')).toBe('# Shop\n\nSet up, then the cart.\n');
    // And its git history is two commits, the stripped seed and the stripped final tree, with no step commit message
    const log = execFileSync('git', ['-C', copyDir, 'log', '--format=%H %an %s'], { encoding: 'utf8' })
      .trim()
      .split('\n');
    expect(log).toHaveLength(2);
    expect(log.map((line) => line.split(' ')[0])).toEqual([commits.after, commits.before]);
    expect(log.join('\n')).not.toMatch(/step|seed|setup|Runner|WingFoil|Benchmark/i);
    // And it holds no step prompt, oracle file or hold-out file, even one lying untracked in the workspace
    expect(held.some((path) => /prompts|oracle|hidden/.test(path))).toBe(false);
    expect(existsSync(join(workspace, 'prompts', '01.md'))).toBe(true);
  });

  it('@F4.9 A later round reviews the whole copy, pointed at the fix', async () => {
    // Given round 1's fix changed "src/cart.ts"
    const reviewer = reviewerDouble((n) =>
      n === 1 ? findingsMessage(finding('should-fix', 'src/cart.ts', 3)) : findingsMessage(),
    );
    const { run, ports } = await loopRun(reviewer);
    const workspace = run.workspace;
    // When round 2's reviewer starts
    const exports = ports.recorded.gitCalls
      .filter((call) => call.startsWith('export '))
      .map((call) => call.split(' '));
    const round2 = join(dirname(workspace), 'review', '2');
    // Then its copy is the whole stripped tree with the fix applied: a fresh copy of the tree before the fix and after
    const intoRound2 = exports.filter((call) => call[3] === round2);
    expect(intoRound2).toHaveLength(2);
    expect(intoRound2.every((call) => call[1] === workspace)).toBe(true);
    expect(intoRound2[0]?.[2]).toBe(run.steps[1]?.tree);
    expect(intoRound2[1]?.[2]).not.toBe(run.steps[1]?.tree);
    expect(ports.recorded.creates[2]?.workspace).toBe(round2);
    // And it is pointed at the fix's diff
    const [first, second] = reviewer.requests;
    expect(first?.prompt).toMatch(/whole change/);
    expect(second?.prompt).toMatch(/latest fix/);
    expect(second?.prompt).toMatch(/git diff [0-9a-z-]+ [0-9a-z-]+/);
    expect(second?.prompt.endsWith(REVIEW_PROMPT)).toBe(true);
    expect(second?.model).toBe('fake-reviewer');
    expect(second?.effort).toBe('medium');
  });

  it('@F4.9 A reviewer whose findings do not parse ends the loop as failed', async () => {
    // Given a reviewer whose final result is not the findings' JSON
    const reviewer = reviewerDouble(() => 'The code looks fine to me.');
    const { run, ports } = await loopRun(reviewer);
    // When the round ends
    // Then the loop ends as "failed", and the run's results are kept
    expect(loopOf(run.outputDir)).toMatchObject({
      outcome: 'failed',
      reason: expect.stringMatching(/findings/),
    });
    expect(run.outcome).toBe('completed');
    expect(run.steps.map((step) => step.outcome)).toEqual(['completed', 'completed']);
    expect(ports.recorded.steps.filter(isFixer)).toEqual([]);
  });

  it('@F4.9 A fixer that changes nothing ends the loop', async () => {
    // Given round 1 reports a blocker, and the fixer's patch changes only paths the reviewer's copy strips
    const reviewer = reviewerDouble(() => findingsMessage(finding('blocker')));
    const { run, ports } = await loopRun(reviewer, {
      ports: {
        treeOf: (directory) => (directory.endsWith(join('review', '2')) ? 'same'.padEnd(40, '0') : undefined),
      },
    });
    // When the round ends
    // Then the loop ends as "no fix"
    expect(loopOf(run.outputDir)).toMatchObject({ outcome: 'no fix' });
    expect(reviewer.requests).toHaveLength(1);
    expect(ports.recorded.steps.filter(isFixer)).toHaveLength(1);
    expect(run.outcome).toBe('completed');
  });

  it("@F4.9 The fixer works with the arm's harness as in a step", async () => {
    // Given a completed run of "wingfoil" whose loop's round 1 reports a blocker (each run's round 2 is clean)
    const reviewer = reviewerDouble((n) =>
      n % 2 === 1 ? findingsMessage(finding('blocker')) : findingsMessage(),
    );
    const removedAtFix: string[][] = [];
    const seen: { ports?: ReturnType<typeof doubles> } = {};
    const looped = await loopRun(reviewer, {
      seen,
      arms: ['baseline', 'wingfoil'],
      yaml: (yaml) => {
        yaml.harnesses = { wingfoil: { tool: 'wingfoil', version: '3df305e' } };
      },
      ports: {
        onStep: (request) => {
          if (isFixer(request)) removedAtFix.push([...(seen.ports?.recorded.removes ?? [])]);
        },
      },
      runner: { harnessSources: { wingfoil: '/clones/wingfoil' } },
    });
    const { summary, ports, checked } = looped;
    const run = summary.runs.find((candidate) => candidate.arm === 'wingfoil');
    if (run === undefined) throw new Error('no wingfoil run');
    const container = `container-${ports.recorded.creates.findIndex((create) => create.workspace === run.workspace) + 1}`;
    // When the fixer session starts
    const requests = ports.recorded.steps;
    const fixer = requests.filter(isFixer).at(-1);
    const lastStep = requests.filter((request) => !isFixer(request)).at(-1);
    // Then it runs in the run's own container, with the wingfoil MCP server of the last step
    expect(run.outcome).toBe('completed');
    expect(fixer?.step).toBe(3);
    expect(removedAtFix.at(-1)).not.toContain(container);
    expect(fixer?.mcpConfig).toBeDefined();
    expect(fixer?.mcpConfig).toBe(lastStep?.mcpConfig);
    expect(fixer?.model).toBe('fake-model');
    expect(fixer?.prompt).toContain(FIXER_PROMPT);
    // And the run's stored patches and "commits.json" are unchanged, and no image is made
    expect(ports.recorded.builds).toEqual([checked.campaign.id, `${checked.campaign.id}-review`]);
    for (const step of ['01', '02']) {
      expect(readFileSync(join(run.outputDir, 'steps', step, 'diff.patch'), 'utf8')).not.toMatch(/review/);
    }
    expect(existsSync(join(run.outputDir, 'review', '1', 'commits.json'))).toBe(false);
    expect(existsSync(join(run.outputDir, 'review', '1', 'fix.patch'))).toBe(true);
  });

  it('@F4.9 A quota rejection in a loop stops the campaign', async () => {
    // Given a fixer session rejected for the subscription's quota
    const reviewer = reviewerDouble(() => findingsMessage(finding('blocker')));
    const { run, summary } = await loopRun(reviewer, {
      repetitions: 2,
      ports: { stopOf: (request) => (isFixer(request) ? 'quota exhausted' : undefined) },
    });
    // When the round ends
    // Then the loop ends as "quota exhausted", the run stays "completed", and the campaign stops
    expect(loopOf(run.outputDir).outcome).toBe('quota exhausted');
    expect(run.outcome).toBe('completed');
    expect(summary.runs).toHaveLength(1);
    expect(summary.outcome).toBe('quota exhausted');
  });

  it('@F4.9 A fixer that reaches its intervention cap ends the loop', async () => {
    // Given a fixer whose interventions reach "review_loop.caps.fixer_interventions"
    const reviewer = reviewerDouble(() => findingsMessage(finding('blocker')));
    const { run, ports } = await loopRun(reviewer, {
      loop: reviewLoopYaml({ caps: { fixer_interventions: 1 } }),
      ports: { messageOf: (request) => (isFixer(request) ? 'Which one?' : undefined) },
    });
    // When the cap is reached
    // Then its session ends and the loop is "failed"
    expect(ports.recorded.resumes.filter(isFixer)).toHaveLength(1);
    expect(loopOf(run.outputDir)).toMatchObject({
      outcome: 'failed',
      reason: expect.stringMatching(/intervention cap/),
    });
    expect(run.outcome).toBe('completed');
  });

  it('@F4.9 An interrupted loop is not resumed', async () => {
    // Given a campaign interrupted during a run's review loop
    const controller = new AbortController();
    const reviewer = reviewerDouble((n) => {
      if (n === 2) controller.abort();
      return findingsMessage(finding('should-fix'));
    });
    const { run, summary, checked } = await loopRun(reviewer, { runner: { signal: controller.signal } });
    expect(summary.outcome).toBe('interrupted');
    expect(run.outcome).toBe('completed');
    const before = loopOf(run.outputDir);
    expect(before.outcome).toBe('interrupted');
    // Round 1 fixed; round 2's session ran and was interrupted, a round without findings.
    expect(before.rounds).toMatchObject([
      { n: 1, fixed: true },
      { n: 2, findings: null, fixed: false },
    ]);
    // When it is resumed
    const again = reviewerDouble(() => findingsMessage());
    const ports = doubles();
    const resumed = await runCampaign(
      checked,
      { ...ports, reviewer: { agent: again } },
      { resume: summary.execution },
    );
    // Then that run's loop stays recorded as "interrupted" with its rounds so far, the run "completed"
    expect(loopOf(run.outputDir)).toEqual(before);
    expect(JSON.parse(readFileSync(join(run.outputDir, 'run.json'), 'utf8'))).toMatchObject({
      outcome: 'completed',
    });
    // And no loop session and none of the run's steps run again
    expect(again.requests).toEqual([]);
    expect(ports.recorded.steps).toEqual([]);
    expect(resumed.runs).toEqual([]);
  });

  it('@F4.9 A round with a blocker or a should-fix is fixed and its fix re-reviewed', async () => {
    // Given the reviewer's round 1 reports a should-fix
    const reviewer = reviewerDouble((n) =>
      n === 1
        ? {
            finalMessage: findingsMessage(
              finding('should-fix', 'src/cart.ts', 3),
              finding('nit', 'README.md', 2),
            ),
            transcript: ['{"type":"result","said":"s3cr3t-token"}'],
            usage: { ...NO_USAGE, inputTokens: 10, costUsd: 0.1, costEur: 0.09 },
          }
        : findingsMessage(),
    );
    const { run, ports } = await loopRun(reviewer, {
      runner: { secrets: ['s3cr3t-token'] },
      ports: {
        usageOf: (request) => (isFixer(request) ? { ...NO_USAGE, costUsd: 0.2, costEur: 0.18 } : NO_USAGE),
      },
    });
    // When the loop goes on
    // Then the arm's own agent fixes it in the run's workspace, its diff recorded as round 1's "fix.patch"
    const fixers = ports.recorded.steps.filter(isFixer);
    expect(fixers).toHaveLength(1);
    expect(fixers[0]?.prompt).toContain('A should-fix');
    expect(fixers[0]?.prompt).not.toContain('A nit');
    expect(fixers[0]?.prompt).toContain(FIXER_PROMPT);
    const round1 = join(run.outputDir, 'review', '1');
    expect(readFileSync(join(round1, 'fix.patch'), 'utf8')).toContain(run.workspace);
    // And round 2 reviews that diff
    expect(reviewer.requests).toHaveLength(2);
    expect(reviewer.requests[1]?.prompt).toMatch(/latest fix/);
    // The records (REQ-FMT-06)
    const loop = loopOf(run.outputDir);
    expect(loop).toMatchObject({
      reviewer: { agent: { name: 'fake', version: '1.0.0' }, model: 'fake-reviewer', effort: 'medium' },
      max_rounds: 5,
      outcome: 'clean',
      rounds: [
        { n: 1, findings: { blocker: 0, 'should-fix': 1, nit: 1 }, fixed: true },
        { n: 2, findings: { blocker: 0, 'should-fix': 0, nit: 0 }, fixed: false },
      ],
    });
    expect(loop.reason).toBeUndefined();
    expect(loop.prompt_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(loop.cost_eur).toBeCloseTo(0.27, 6);
    expect(
      (JSON.parse(readFileSync(join(round1, 'findings.json'), 'utf8')) as { findings: unknown[] }).findings,
    ).toHaveLength(2);
    expect(JSON.parse(readFileSync(join(round1, 'reviewer-usage.json'), 'utf8'))).toMatchObject({
      inputTokens: 10,
    });
    expect(JSON.parse(readFileSync(join(round1, 'fixer-usage.json'), 'utf8'))).toMatchObject({
      usage: { costEur: 0.18 },
      interventions: [],
      outcome: 'completed',
    });
    expect(readFileSync(join(round1, 'reviewer.jsonl'), 'utf8')).not.toContain('s3cr3t-token');
    expect(existsSync(join(round1, 'fixer.jsonl'))).toBe(true);
    expect(existsSync(join(run.outputDir, 'review', '2', 'fix.patch'))).toBe(false);
    // The loop's usage is never the run's (REQ-RUN-09)
    const record = JSON.parse(readFileSync(join(run.outputDir, 'run.json'), 'utf8')) as {
      steps: { usage: { costEur: number } }[];
    };
    expect(record.steps.map((step) => step.usage.costEur)).toEqual([0, 0]);
  });

  it('@F4.9 A round with nits only closes the loop', async () => {
    // Given the reviewer's round 2 reports two nits and nothing else
    const reviewer = reviewerDouble((n) =>
      n === 1
        ? findingsMessage(finding('should-fix'))
        : findingsMessage(finding('nit'), finding('nit', 'src/a.ts', 4)),
    );
    const { run, ports } = await loopRun(reviewer);
    // When the loop goes on
    // Then it closes as "clean" at round 2, and no fixer session runs for the nits
    const loop = loopOf(run.outputDir);
    expect(loop.outcome).toBe('clean');
    expect(loop.rounds).toHaveLength(2);
    expect(ports.recorded.steps.filter(isFixer).map((request) => request.step)).toEqual([3]);
  });

  it('@F4.9 A loop that does not close by the cap is not clean', async () => {
    // Given a reviewer that reports a blocker in every round
    const reviewer = reviewerDouble(() => findingsMessage(finding('blocker')));
    const { run, ports } = await loopRun(reviewer);
    // When five rounds have run
    // Then the loop ends as "not clean at 5", and no sixth round runs
    const loop = loopOf(run.outputDir);
    expect(loop).toMatchObject({ outcome: 'not clean at 5', reason: expect.any(String) });
    expect(reviewer.requests).toHaveLength(5);
    // The last round's findings are never fixed: no review would read the fix.
    expect(ports.recorded.steps.filter(isFixer).map((request) => request.step)).toEqual([3, 4, 5, 6]);
  });

  it('@F4.9 A reviewer that changes the copy ends the loop as failed', async () => {
    // Given a reviewer session that edits a file of its copy
    const reviewer = reviewerDouble(() => findingsMessage());
    const { run } = await loopRun(reviewer, {
      ports: { dirtyOf: (directory) => (directory.endsWith(join('review', '1')) ? ['src/cart.ts'] : []) },
    });
    // When the round ends
    // Then the loop ends as "failed", naming the file, and the run's results are kept
    expect(loopOf(run.outputDir)).toMatchObject({
      outcome: 'failed',
      reason: expect.stringContaining('src/cart.ts'),
    });
    expect(run.outcome).toBe('completed');
  });

  it("@F4.9 A loop session killed at its cap keeps the run's results", async () => {
    // Given a fixer session that exceeds "review_loop.caps.session_time_s"
    const reviewer = reviewerDouble(() => findingsMessage(finding('blocker')));
    const base = doubles({
      usageOf: () => ({ ...NO_USAGE, costUsd: 0.5, costEur: 0.45 }),
      execResultOf: (command) => (command[4] === 'sleep' ? { code: 124, stdout: '', stderr: '' } : undefined),
    });
    const agent: AgentPort = {
      runStep: async (request) => {
        if (isFixer(request)) {
          base.recorded.steps.push(request);
          await request.run(['sleep', '1000']);
          return { sessionId: request.sessionId, usage: NO_USAGE, transcript: [], error: 'no result event' };
        }
        return base.agent.runStep(request);
      },
      resume: (request) => base.agent.resume(request),
    };
    const { checked } = loopCampaign({ loop: reviewLoopYaml({ caps: { session_time_s: 60 } }) });
    const summary = await runCampaign(checked, { ...base, agent, reviewer: { agent: reviewer } });
    const run = summary.runs[0];
    // When it is killed
    const timed = base.recorded.execs.find((exec) => exec.command[4] === 'sleep');
    expect(Number(timed?.command[3])).toBeLessThanOrEqual(60);
    // Then the loop ends as "failed", and the run's steps, scores and M-K1 are unchanged
    expect(loopOf(run?.outputDir ?? '')).toMatchObject({
      outcome: 'failed',
      reason: expect.stringMatching(/time cap/),
    });
    expect(run?.outcome).toBe('completed');
    const record = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'run.json'), 'utf8')) as {
      steps: { usage: { costEur: number } }[];
    };
    expect(record.steps.map((step) => step.usage.costEur)).toEqual([0.45, 0.45]);
  });
});
