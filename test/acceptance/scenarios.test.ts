import { createHash } from 'node:crypto';
import {
  appendFileSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { parse, stringify } from 'yaml';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { main } from '../../src/cli/index.js';
import { validateScenario } from '../../src/cli/scenario.js';
import { armDigest, renderConstitution } from '../../src/arms/index.js';
import { checkCampaign, runCampaign } from '../../src/runner/index.js';
import { latestDryRun } from '../../src/results/index.js';
import { loadScenario, oracleLiterals } from '../../src/scenario/index.js';
import { writeArmsNamed } from '../support/arm-fixture.js';
import { configuredRecord, writeConfiguration } from '../support/configured-fixture.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';
import { writeDryRunProfile, writeStoredDryRun } from '../support/dry-run-fixture.js';
import {
  benchConfigure,
  configurePorts,
  configureRepo,
  copyUnconfigured,
  isConfigurationPath,
  SETUP_FILES,
  storedRecords,
  workspaceFiles,
  writeFiles,
} from '../support/configure-fixture.js';
import { doubles, fakeBuild, invocationOf, NO_USAGE } from '../support/runner-doubles.js';
import { localScoringDocker } from '../support/local-scoring.js';
import { repoPath } from '../support/paths.js';
import { tempDir, writeScenario } from '../support/scenario-fixture.js';
import {
  CANCEL,
  EXECUTION,
  HOLDOUT_SECRET,
  scoringDocker,
  storedRun,
  t3Holdout,
} from '../support/score-fixture.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import type { AgentPort } from '../../src/agents/index.js';

const NO_AGENT: AgentPort = {
  runStep: () => Promise.reject(new Error('scoring runs no agent')),
  resume: () => Promise.reject(new Error('scoring runs no agent')),
};

/** `bench score` on the stored-run fixture's execution, with Docker replaced by the scoring double. */
async function benchScore(root: string, ...argv: string[]) {
  const { docker, recorded } = scoringDocker();
  let stdout = '';
  let stderr = '';
  const code = await main(
    ['score', EXECUTION, ...argv],
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    { docker, git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, stderr, recorded };
}

/**
 * A repository holding the fixture T3 — standing in for S1, S2 and S3 until W7 and W8 — and the
 * benchmark's own leak-scan declarations. `change` edits T3's version directory first.
 */
function repository(change?: (dir: string) => void): string {
  const root = tempDir('bench-repo-');
  cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
  copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
  change?.(join(root, 'scenarios', 'T3', '1.0'));
  return root;
}

/** A hold-out with T3's additions in a temporary directory: its content is never in this repository. */
function holdout(files: Record<string, string>): string {
  const root = tempDir('bench-holdout-');
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, 'scenarios', 'T3', '1.0', path, '..'), { recursive: true });
    writeFileSync(join(root, 'scenarios', 'T3', '1.0', path), content);
  }
  return root;
}

/** The v0.1 scenarios authored so far: the rows of the @F6.x outline that can run. */
const READY = ['S1', 'S2', 'S3', 'S8'];

/** The WingFoil commit the fixture arms' harness resolves to (W3). */
const WINGFOIL_SHA = '3df305ea198d7e2ca0da73bfb12b14af865e9922';

/** Any `bench` command in `root`, with `ports` when given. */
async function cli(root: string, argv: readonly string[], ports?: Parameters<typeof main>[2]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    [...argv],
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    ports,
    root,
  );
  return { code, stdout, stderr };
}

async function validate(root: string, ...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    ['scenario', 'validate', 'T3@1.0', ...argv],
    {
      stdout: (text) => (stdout += text),
      stderr: (text) => (stderr += text),
    },
    undefined,
    root,
  );
  return { code, stdout, stderr };
}

describe('scenarios.feature', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('@F3.1 A scenario declares everything the runner and the scorer need', () => {
    const root = writeScenario();
    const dir = join(root, 'S9', '1.0');

    const result = loadScenario(root, 'S9', '1.0');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const scenario = result.value;
    expect(scenario.id).toBe('S9');
    expect(scenario.version).toBe('1.0');
    expect(scenario.seedDir).toBe(join(dir, 'seed'));
    expect(scenario.steps).toEqual([
      { n: 1, promptPath: join(dir, 'prompts/01.md') },
      { n: 2, promptPath: join(dir, 'prompts/02.md') },
    ]);
    expect(scenario.oracle.suites).toEqual([
      { id: 'first', dir: join(dir, 'oracle/first'), afterSteps: [1] },
      { id: 'all', dir: join(dir, 'oracle/all'), afterSteps: [1, 2] },
    ]);
    expect(scenario.categories).toEqual({ primary: 'C', secondary: ['D'] });
    expect(scenario.profiles).toEqual(['solo-developer', 'team-developer']);
    expect(scenario.gqm).toEqual(['Q-C1', 'G-X1']);
    expect(scenario.capabilities).toEqual(['workflow-engine']);
  });

  it('@F3.2 A well-formed scenario passes the validator', async () => {
    // Given scenario S1 as specified — T3, with its hold-out additions
    const root = repository();
    const additions = holdout({ 'orders/refund.test.ts': "expect(refund(o)).toBe('refunded in full');\n" });

    // When the maintainer validates it
    const result = await validate(root, '--holdout', additions);

    // Then validation passes
    expect(result).toEqual({ code: 0, stdout: 'scenario T3@1.0 is valid (hold-out: 1 file)\n', stderr: '' });
  });

  it('@F3.2 A step prompt that names a harness is rejected', async () => {
    // Given a step prompt of S3 that mentions "WingFoil"
    const root = repository((dir) =>
      writeFileSync(join(dir, 'prompts', '02.md'), 'Record the change as a WingFoil decision.\n'),
    );

    // When the maintainer validates S3
    const result = await validate(root);

    // Then validation fails, and the message names the step and the offending text
    expect(result).toEqual({
      code: 1,
      stdout: '',
      stderr: "steps[1].prompt_file: names the harness 'WingFoil'\n",
    });
  });

  it('@F3.2 Oracle content that appears in the seed or the prompts is rejected', async () => {
    // Given a hidden test of S2 whose expected value also appears in a step prompt
    const secret = 'refunded to card 4417';
    const root = repository((dir) =>
      writeFileSync(join(dir, 'prompts', '01.md'), `Add a way to cancel an order; it ends ${secret}.\n`),
    );
    const additions = holdout({ 'orders/refund.test.ts': `expect(refund(o)).toBe('${secret}');\n` });

    // When the maintainer validates S2 with the hold-out path configured
    const result = await validate(root, '--holdout', additions);

    // Then validation fails, and the message names the file and the step, without printing the
    // hold-out content
    expect(result).toEqual({
      code: 1,
      stdout: '',
      stderr: 'steps[0].prompt_file: holds a literal of the hold-out file orders/refund.test.ts\n',
    });
    expect(result.stderr).not.toContain('4417');
  });

  it('@F3.5 Hold-out additions are used for scoring only', async () => {
    // Given the hold-out path is configured, and it contains additional tests for S1 — T3 standing in
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    const additions = t3Holdout();

    // When a run of S1 is scored
    const result = await benchScore(fixture.root, '--holdout', additions);

    // Then the hold-out tests are executed on the run's snapshots — in containers of their own, the
    // additions mounted read-only beside the public suite
    expect(result.code).toBe(0);
    const holdoutRuns = result.recorded.creates.filter((create) =>
      create.readOnly.some((mount) => mount.target === '/score/oracle/public.holdout'),
    );
    expect(holdoutRuns.length).toBeGreaterThan(0);
    // And their results are reported apart from the public tests, in counts, naming no hold-out test
    const score = JSON.parse(readFileSync(join(fixture.runDir, 'score.json'), 'utf8')) as {
      final: { m_q1: unknown };
      holdout: { scored: boolean; final: { m_q1: unknown } };
    };
    expect(score.final.m_q1).toEqual({ passed: 1, total: 1 });
    expect(score.holdout).toMatchObject({ scored: true, final: { m_q1: { passed: 1, total: 2 } } });
    expect(result.stdout + result.stderr + JSON.stringify(score)).not.toContain(HOLDOUT_SECRET);
  });

  it('@F3.5 A missing hold-out does not break scoring of public oracles', async () => {
    // Given the hold-out path is not configured
    const previous = process.env.BENCH_HOLDOUT_PATH;
    delete process.env.BENCH_HOLDOUT_PATH;
    const fixture = await storedRun({ steps: [{}, CANCEL] });

    // When a run of S1 is scored
    const result = await benchScore(fixture.root).finally(() => {
      if (previous !== undefined) process.env.BENCH_HOLDOUT_PATH = previous;
    });

    // Then the public oracle is scored
    expect(result.code).toBe(0);
    const score = JSON.parse(readFileSync(join(fixture.runDir, 'score.json'), 'utf8')) as {
      final: { m_q1: unknown };
      holdout: unknown;
    };
    expect(score.final.m_q1).toEqual({ passed: 1, total: 1 });
    // And the report states that hold-out additions were not scored
    expect(score.holdout).toEqual({ scored: false, reason: 'not configured' });
    expect(result.stdout).toMatch(/; hold-out not scored\naggregate: /);
  });

  it('@F3.6 A scenario that needs a missing harness capability is an expected failure', async () => {
    // Given a scenario that declares the capability "workflow engine" — the complete fixture does
    const { file } = writeRepo(
      {
        ...completeCampaignYaml(),
        scenarios: [{ id: 'S1', version: '1.0' }],
        repetitions: { S1: 1 },
        arms: ['baseline', 'wingfoil'],
        harnesses: { wingfoil: { tool: 'wingfoil', version: '3df305e' } },
        agent: { name: 'fake', version: '1.0.0' },
        models: { default: 'fake-model' },
      },
      ['S1@1.0'],
    );
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    // And the WingFoil under test does not provide it: the fixture wingfoil arm declares no `provides`
    expect(checked.value.arms.find((arm) => arm.name === 'wingfoil')?.provides).toEqual({});

    // When the scenario runs in the wingfoil arm
    const ports = doubles();
    const summary = await runCampaign(checked.value, {
      ...ports,
      harnessSources: { wingfoil: '/clones/wingfoil' },
    });

    // Then the run is executed normally
    const wingfoil = summary.runs.find((run) => run.arm === 'wingfoil');
    expect([wingfoil?.outcome, wingfoil?.steps.length]).toEqual(['completed', 2]);
    // And its result is marked "expected failure", naming the missing capability
    const record = JSON.parse(readFileSync(join(wingfoil?.outputDir ?? '', 'run.json'), 'utf8')) as {
      expected_failure: unknown;
    };
    expect(record.expected_failure).toEqual({ missing: ['workflow-engine'] });
    // And it is scored like any run, the mark carried into its score
    const stored = await storedRun({ steps: [{}, CANCEL] });
    const runFile = join(stored.runDir, 'run.json');
    const run = JSON.parse(readFileSync(runFile, 'utf8')) as Record<string, unknown>;
    writeFileSync(runFile, JSON.stringify({ ...run, expected_failure: record.expected_failure }));
    const scored = await benchScore(stored.root);
    expect(scored.code).toBe(0);
    expect(scored.stdout).toMatch(
      /final 1\/1; hold-out not scored; expected failure \(missing workflow-engine\)\naggregate: /,
    );
    const score = JSON.parse(readFileSync(join(stored.runDir, 'score.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(score.expected_failure).toEqual({ missing: ['workflow-engine'] });
    // And it is published as a loss, never skipped: aggregated with what it measured, the loss named
    const aggregate = JSON.parse(readFileSync(join(stored.executionDir, 'aggregate.json'), 'utf8')) as {
      groups: {
        runs: string[];
        losses: unknown[];
        metrics: { m_q1: { final: { m_q1: { values: unknown[] } } } };
      }[];
    };
    expect(aggregate.groups[0]?.runs).toEqual(['abcdef012345/1/runs/T3@1.0/baseline/fake-model/r1']);
    expect(aggregate.groups[0]?.losses).toEqual([
      {
        run: 'abcdef012345/1/runs/T3@1.0/baseline/fake-model/r1',
        reason: 'expected failure (missing workflow-engine)',
      },
    ]);
    expect(aggregate.groups[0]?.metrics.m_q1.final.m_q1.values).toEqual([{ passed: 1, total: 1 }]);
  });

  it('@F3.3 A dry run measures the real cost of a scenario in one arm', async () => {
    // T3 stands in for S1 and baseline for the wingfoil arm; the fake agent for the real one reports a
    // cost per step, as the real one does (REQ-RUN-9), and no container or session is real.
    const root = repository();
    writeArmsNamed(root, ['baseline']);
    writeDryRunProfile(root);
    const cost = [0.03, 0.01];
    const ports = doubles({
      usageOf: (request) => ({
        inputTokens: 1,
        outputTokens: 1,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        costUsd: invocationOf(request) === 0 ? (cost[request.step - 1] ?? 0) : 0,
        costEur: 0,
        turns: 1,
        durationMs: 1,
      }),
    });
    let stdout = '';
    let stderr = '';

    // When the maintainer dry-runs S1 in the wingfoil arm with the real agent
    const code = await main(
      ['scenario', 'dry-run', 'T3@1.0', '--arm', 'baseline'],
      { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
      ports,
      root,
    );

    // Then one run of S1 is executed in that arm
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(ports.recorded.creates).toHaveLength(1);
    expect(ports.recorded.steps.map((step) => step.step)).toEqual([1, 2]);

    // And its cost per step and in total is recorded as the dry-run cost of S1 in that arm
    const dir = join(root, 'results', 'dry-runs', '1');
    const record = JSON.parse(
      readFileSync(join(dir, 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r1', 'run.json'), 'utf8'),
    ) as Record<string, unknown>;
    const scenario = loadScenario(join(root, 'scenarios'), 'T3', '1.0');
    if (!scenario.ok) throw new Error(JSON.stringify(scenario.issues));
    const key = { id: 'T3', version: '1.0', hash: scenario.value.hash, arm: 'baseline', model: 'fake-model' };
    expect(record).toMatchObject({
      dry_run: true,
      scenario_hash: key.hash,
      arm: 'baseline',
      outcome: 'completed',
    });
    expect(latestDryRun(join(root, 'results'), key)).toMatchObject({
      execution: 1,
      dir,
      costUsd: 0.04,
      stepCostsUsd: [0.03, 0.01],
    });
    expect(stdout).toContain('dry run T3@1.0 in baseline on fake-model: no dry run yet');
    expect(stdout).toContain(
      'dry run T3@1.0 in baseline: completed, 0.0400 USD (0.0200 EUR) — step 01 0.0300 USD, ' +
        'step 02 0.0100 USD — results/dry-runs/1\n',
    );

    // And the result is marked as a dry run and never appears in published results
    expect(record).not.toHaveProperty('campaign');
    expect(readdirSync(join(root, 'results'))).toEqual(['dry-runs']);
    // It is no campaign's result either: the version stays open to change (task-021 Design), and the
    // changed version's cost is no longer the dry run's.
    writeFileSync(
      join(root, 'scenarios', 'T3', '1.0', 'prompts', '02.md'),
      'Refuse to cancel a shipped order.\n',
    );
    expect((await validate(root)).code).toBe(0);
    const changed = loadScenario(join(root, 'scenarios'), 'T3', '1.0');
    if (!changed.ok) throw new Error(JSON.stringify(changed.issues));
    expect(latestDryRun(join(root, 'results'), { ...key, hash: changed.value.hash })).toBeUndefined();
  });

  it('@F3.4 Changing a scenario creates a new version', async () => {
    // Given S1 at version 1.0 has stored results — T3, run once by a campaign with the doubles
    const root = repository();
    mkdirSync(join(root, 'campaigns'));
    const campaign = join(root, 'campaigns', 'c.yaml');
    const yaml = (version: string) =>
      stringify({
        ...completeCampaignYaml(),
        harnesses: {},
        arms: ['baseline'],
        scenarios: [{ id: 'T3', version }],
        repetitions: { T3: 1 },
        agent: { name: 'fake', version: '1.0.0' },
        models: { default: 'fake-model' },
      });
    writeFileSync(campaign, yaml('1.0'));
    writeArmsNamed(root, ['baseline']);
    const first = checkCampaign(campaign);
    if (!first.ok) throw new Error(JSON.stringify(first.issues));
    const summary = await runCampaign(first.value, doubles());
    const recordFile = join(summary.runs[0]?.outputDir ?? '', 'run.json');
    const stored = readFileSync(recordFile, 'utf8');
    expect(JSON.parse(stored)).toMatchObject({
      scenario: 'T3',
      version: '1.0',
      scenario_hash: first.value.scenarios[0]?.hash,
    });

    // When the maintainer changes a step prompt of S1
    const version = join(root, 'scenarios', 'T3', '1.0');
    writeFileSync(join(version, 'prompts', '02.md'), 'Refuse to cancel a shipped order.\n');

    // Then S1 must be registered as a new version before it can run
    const refused = checkCampaign(campaign);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.issues).toEqual([
        {
          path: 'scenarios[0]',
          message: `T3@1.0 has changed since ${relative(root, recordFile)} ran it: register the change as a new version`,
        },
      ]);
    }
    expect((await validate(root)).stderr).toBe(
      `scenario: T3@1.0 has changed since ${relative(root, recordFile)} ran it: register the change as a new version\n`,
    );
    cpSync(version, join(root, 'scenarios', 'T3', '1.1'), { recursive: true });
    writeFileSync(
      join(root, 'scenarios', 'T3', '1.1', 'scenario.yaml'),
      readFileSync(join(version, 'scenario.yaml'), 'utf8').replace("version: '1.0'", "version: '1.1'"),
    );
    writeFileSync(campaign, yaml('1.1'));
    expect(checkCampaign(campaign).ok).toBe(true);

    // And the stored results keep pointing to version 1.0
    expect(readFileSync(recordFile, 'utf8')).toBe(stored);
  });

  it('@F6.1 @F6.2 @F6.3 @F6.8 Each v0.1 scenario is ready for a campaign', async () => {
    // Every row of the outline: S1 and S2 (W7), S3 and S8 (W8).
    for (const id of READY) {
      // Given scenario <id> as specified, copied from this repository with the three arms
      const root = tempDir('bench-repo-');
      cpSync(repoPath(`scenarios/${id}`), join(root, 'scenarios', id), { recursive: true });
      copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
      writeArmsNamed(root, ['baseline', 'baseline-docs', 'wingfoil']);
      writeDryRunProfile(root);
      vi.stubEnv('BENCH_WINGFOIL_REPO', '/clones/wingfoil');
      vi.stubEnv('BENCH_HOLDOUT_PATH', '');

      // When the maintainer validates it
      const validated = await cli(root, ['scenario', 'validate', `${id}@1.0`]);
      // Then validation passes
      expect(validated).toEqual({
        code: 0,
        stdout: `scenario ${id}@1.0 is valid (hold-out: not configured)\n`,
        stderr: '',
      });

      for (const [index, arm] of ['baseline', 'baseline-docs', 'wingfoil'].entries()) {
        // When the maintainer dry-runs it in each of the three arms — the agent and the containers
        // doubled, the workspace's git real, so that the run stores patches a snapshot is rebuilt from
        const run = doubles({ commits: { '3df305e': WINGFOIL_SHA }, onRunOnce: fakeBuild });
        const git = gitCli(systemProcess);
        const dryRun = await cli(root, ['scenario', 'dry-run', `${id}@1.0`, '--arm', arm], {
          docker: run.docker,
          agent: run.agent,
          // The WingFoil clone is doubled too: its commit and its archive come from the doubles.
          git: { ...git, resolveCommit: run.git.resolveCommit, archive: run.git.archive },
        });
        expect(dryRun).toMatchObject({ code: 0, stderr: '' });
        // Then every arm has a recorded dry-run cost
        const execution = join(root, 'results', 'dry-runs', String(index + 1));
        const record = JSON.parse(
          readFileSync(join(execution, 'runs', `${id}@1.0`, arm, 'fake-model', 'r1', 'run.json'), 'utf8'),
        ) as { dry_run: boolean; steps: { usage: { costUsd: number } }[] };
        expect(record.dry_run).toBe(true);
        expect(record.steps.every((step) => typeof step.usage.costUsd === 'number')).toBe(true);

        // And the public oracle scores the dry run without errors — its hidden tests really run
        const scored = await cli(root, ['score', `dry-runs/${index + 1}`], {
          docker: localScoringDocker(),
          git: gitCli(systemProcess),
          agent: NO_AGENT,
        });
        expect(scored).toMatchObject({ code: 0, stderr: '' });
        expect(scored.stdout).toMatch(new RegExp(`^${id}@1\\.0 ${arm} fake-model r1: step 01 `));
      }
    }
    // The hidden tests really run, every suite on every snapshot of every arm: minutes — 173 s alone with
    // S1–S3 on an idle machine, 634 s with S1–S8 at load average 50 (bug-008, task-048).
  }, 1_200_000);
});

describe('S1 1.1 (bug-025, task-131)', () => {
  /** Every file under `dir`, relative, with its bytes as text. */
  function treeOf(dir: string): Record<string, string> {
    const out: Record<string, string> = {};
    const walk = (at: string) => {
      for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) =>
        a.name < b.name ? -1 : 1,
      )) {
        const path = join(at, entry.name);
        // No symbolic link in a scenario version (bug-034): each file is its own bytes.
        expect(entry.isSymbolicLink(), path).toBe(false);
        if (entry.isDirectory()) walk(path);
        else out[relative(dir, path)] = readFileSync(path, 'utf8');
      }
    };
    walk(dir);
    return out;
  }
  const SENTENCE =
    'When an array gains or loses an item, the patch adds or removes that item, and does not rewrite the items ' +
    'around it; when an item moves within an array, the patch moves it, or removes it and adds it back, and does not ' +
    'rewrite the items in between.';

  it("@F3.4 S1 1.1's step 5 has one reading", () => {
    vi.stubEnv('BENCH_HOLDOUT_PATH', '');
    // Given S1 1.1 — Then it is valid and passes the leak scan
    expect(validateScenario({ id: 'S1', version: '1.1' }, repoPath('.'))).toEqual({
      ok: true,
      line: 'scenario S1@1.1 is valid (hold-out: not configured)',
    });
    // And its step 5's request states how a patch describes an item an array gains, loses or moves
    const v10 = treeOf(repoPath('scenarios/S1/1.0'));
    // Less its configurations, which task-143 wrote after it (REQ-FMT-04 as amended in 1.50)
    const v11 = Object.fromEntries(
      Object.entries(treeOf(repoPath('scenarios/S1/1.1'))).filter(([path]) => !isConfigurationPath(path)),
    );
    expect(v11['prompts/05.md']?.replace(/\s+/g, ' ')).toContain(SENTENCE);
    // And everything else in it is S1 1.0's
    expect(Object.keys(v11)).toEqual(Object.keys(v10));
    for (const path of Object.keys(v10)) {
      if (path === 'prompts/05.md' || path === 'scenario.yaml') continue;
      expect(v11[path], path).toBe(v10[path]);
    }
    expect(v11['scenario.yaml']).toBe(v10['scenario.yaml']?.replace("version: '1.0'", "version: '1.1'"));
    expect(v11['prompts/05.md']?.replace(/\s+/g, ' ').replace(` ${SENTENCE}`, '')).toBe(
      v10['prompts/05.md']?.replace(/\s+/g, ' '),
    );
    // And S1 1.0 stays registered, unchanged, with its step 5's limit stated on the method page
    expect(validateScenario({ id: 'S1', version: '1.0' }, repoPath('.')).ok).toBe(true);
    expect(readFileSync(repoPath('site-content/method.md'), 'utf8')).toContain('{#s1-step-5-limit}');
  });
});

describe('S2, S3 and S8 1.1 (task-132)', () => {
  /** Every file under `dir`, relative, with its text; a symbolic link fails it (bug-034). */
  function filesOf(dir: string): Record<string, string> {
    const out: Record<string, string> = {};
    const walk = (at: string) => {
      for (const entry of readdirSync(at, { withFileTypes: true })) {
        const path = join(at, entry.name);
        expect(entry.isSymbolicLink(), path).toBe(false);
        if (entry.isDirectory()) walk(path);
        else out[relative(dir, path)] = readFileSync(path, 'utf8');
      }
    };
    walk(dir);
    return out;
  }
  const CHECKS: Record<string, string | undefined> = {
    S2: 'oracle/checks/duplicate.yaml',
    S3: 'oracle/checks/d3-revision.yaml',
    S8: undefined,
  };

  it("@F3.4 S2, S3 and S8 1.1 carry the oracle's corrections", () => {
    vi.stubEnv('BENCH_HOLDOUT_PATH', '');
    for (const [id, check] of Object.entries(CHECKS)) {
      // Given S2, S3 and S8 1.1 — Then each is valid and passes the leak scan
      expect(validateScenario({ id, version: '1.1' }, repoPath('.'))).toEqual({
        ok: true,
        line: `scenario ${id}@1.1 is valid (hold-out: not configured)`,
      });
      // And each is its 1.0 but for its version and, in S2 and S3, its content check and its rubric
      const v10 = filesOf(repoPath(`scenarios/${id}/1.0`));
      // Less its configurations, which task-143 wrote after it (REQ-FMT-04 as amended in 1.50)
      const v11 = Object.fromEntries(
        Object.entries(filesOf(repoPath(`scenarios/${id}/1.1`))).filter(
          ([path]) => !isConfigurationPath(path),
        ),
      );
      const changed = ['scenario.yaml', ...(check === undefined ? [] : [check, 'oracle/rubric.md'])];
      expect(Object.keys(v11).sort()).toEqual(
        [...Object.keys(v10), ...(check === undefined ? [] : ['oracle/rubric.md'])].sort(),
      );
      for (const path of Object.keys(v10))
        if (!changed.includes(path)) expect(v11[path], `${id} ${path}`).toBe(v10[path]);
      expect(v11['scenario.yaml']).toBe(v10['scenario.yaml']?.replace("version: '1.0'", "version: '1.1'"));
      // And S2's duplicate and S3's D3 revision checks match whole words, each with its section in the version's rubric
      if (check !== undefined) {
        const loaded = loadScenario(repoPath('scenarios'), id, '1.1');
        if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
        const content = loaded.value.oracle.checks.filter((c) => c.kind === 'content');
        expect(content.map((c) => [c.id, c.kind === 'content' ? c.match : undefined])).toEqual([
          [check.split('/').at(-1)?.replace('.yaml', ''), 'words'],
        ]);
      }
      // And the 1.0 versions stay registered, unchanged
      expect(validateScenario({ id, version: '1.0' }, repoPath('.')).ok).toBe(true);
    }
  });
});

describe('symbolic links and open fences in a scenario version (task-139, bug-034)', () => {
  it('@F3.1 A scenario version holds no symbolic link and no directive file with an open fence', () => {
    const messages = (root: string) => {
      const result = loadScenario(root, 'S9', '1.0');
      return result.ok ? [] : result.issues.map((issue) => issue.message);
    };
    const linked = writeScenario();
    const dir = join(linked, 'S9', '1.0');
    const outside = join(tempDir('bench-outside-'), 'scenario.yaml');
    writeFileSync(outside, readFileSync(join(dir, 'scenario.yaml')));
    rmSync(join(dir, 'scenario.yaml'));
    symlinkSync(outside, join(dir, 'scenario.yaml'));
    expect(messages(linked)).toEqual(["'scenario.yaml' is a symbolic link"]);

    const deep = writeScenario();
    mkdirSync(join(deep, 'S9', '1.0', 'seed', 'lib'), { recursive: true });
    symlinkSync('../README.md', join(deep, 'S9', '1.0', 'seed', 'lib', 'readme.md'));
    expect(messages(deep)).toEqual(["'seed/lib/readme.md' is a symbolic link"]);

    const fenced = writeScenario();
    const custom = join(fenced, 'S9', '1.0', 'arms', 'wingfoil', '.wingfoil', 'directives', 'custom');
    mkdirSync(custom, { recursive: true });
    writeFileSync(join(custom, 'r1.md'), '---\nid: r1\ntitle: One\n---\n\n~~~\nopen\n');
    expect(messages(fenced)).toEqual([
      "'arms/wingfoil/.wingfoil/directives/custom/r1.md' has an unclosed code fence",
    ]);
  });
});

describe("a scenario version's configurations (task-140, F7.5)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /** A repository holding a copy of the scenario version, and the leak-scan declarations. */
  function copied(id: string, version: string) {
    const root = tempDir('bench-repo-');
    copyUnconfigured(repoPath(join('scenarios', id, version)), join(root, 'scenarios', id, version));
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    return { root, dir: join(root, 'scenarios', id, version) };
  }

  it('@F7.5 A symbolic link in a configuration is refused', () => {
    const { root, dir } = copied('S3', '1.1');
    writeConfiguration(dir, 'openspec-configured', { 'openspec/config.yaml': 'context: |\n  Orders.\n' });
    symlinkSync('config.yaml', join(dir, 'arms', 'openspec-configured', 'openspec', 'context.yaml'));

    const result = loadScenario(join(root, 'scenarios'), 'S3', '1.1');

    expect(result.ok ? [] : result.issues).toEqual([
      {
        path: 'arms/openspec-configured/openspec/context.yaml',
        message: "'arms/openspec-configured/openspec/context.yaml' is a symbolic link",
      },
    ]);
  });

  it('@F7.5 A version 1.0 holding a configuration is refused', () => {
    const { root, dir } = copied('S2', '1.0');
    mkdirSync(join(dir, 'arms', 'speckit-configured', '.specify', 'memory'), { recursive: true });
    writeFileSync(join(dir, 'arms', 'speckit-configured', '.specify', 'memory', 'constitution.md'), '# C\n');

    const result = loadScenario(join(root, 'scenarios'), 'S2', '1.0');

    expect(result.ok ? [] : result.issues).toEqual([
      {
        path: 'arms.speckit-configured',
        message:
          "a version 1.0 holds no configuration: 'arms/speckit-configured' (the approver's choice of 2026-11-06)",
      },
    ]);
  });

  it('@F7.5 The leak scan covers a configuration', () => {
    vi.stubEnv('BENCH_HOLDOUT_PATH', '');
    const { root, dir } = copied('S2', '1.1');
    const loaded = loadScenario(join(root, 'scenarios'), 'S2', '1.1');
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const suiteDir = loaded.value.oracle.suites[0]?.dir ?? '';
    const suiteFile = readdirSync(suiteDir).find((file) => /\.test\.m?ts$/.test(file)) ?? '';
    // A literal the scan looks for in a configuration: more than one word, or not letters only (bug-047)
    const literal =
      oracleLiterals(readFileSync(join(suiteDir, suiteFile), 'utf8'), 8).find((l) => !/^\p{L}+$/u.test(l)) ??
      '';
    expect(literal).not.toBe('');
    const rule = '.wingfoil/directives/custom/r9.md';
    writeConfiguration(dir, 'wingfoil-configured', { [rule]: `# Rule\n\nRemember: ${literal}\n` });

    const result = validateScenario({ id: 'S2', version: '1.1' }, root);

    expect(result.ok).toBe(false);
    const issues = result.ok ? [] : result.issues;
    expect(issues).toEqual([
      {
        path: 'arms.wingfoil-configured',
        message: expect.stringMatching(
          new RegExp(`^${rule.replace(/\./g, '\\.')} holds a literal of oracle/`),
        ),
      },
    ]);
    expect(JSON.stringify(issues)).not.toContain(literal);
  });
});

describe('an ordinary word in a configuration (task-143, bug-047, F7.5)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('@F7.5 A configuration may use a one-word literal of the oracle as prose', () => {
    vi.stubEnv('BENCH_HOLDOUT_PATH', '');
    const root = tempDir('bench-repo-');
    const dir = join(root, 'scenarios', 'S2', '1.1');
    copyUnconfigured(repoPath('scenarios/S2/1.1'), dir);
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    const loaded = loadScenario(join(root, 'scenarios'), 'S2', '1.1');
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const oracle = loaded.value.oracle.suites
      .flatMap((suite) =>
        readdirSync(suite.dir)
          .filter((file) => /\.test\.m?ts$/.test(file))
          .map((file) => readFileSync(join(suite.dir, file), 'utf8')),
      )
      .join('\n');
    // Given S2 1.1's oracle quotes "duplicate" as a test group's name
    const literals = oracleLiterals(oracle, 8);
    expect(literals).toContain('duplicate');
    // And a configuration file of S2 1.1 says "duplicate SKUs merged"
    const rule = '.wingfoil/directives/custom/r9.md';
    writeConfiguration(dir, 'wingfoil-configured', {
      [rule]: '# Orders\n\n- Orders: duplicate SKUs merged.\n',
    });

    // When S2 1.1 is validated — Then it is valid
    expect(validateScenario({ id: 'S2', version: '1.1' }, root)).toEqual({
      ok: true,
      line: 'scenario S2@1.1 is valid (hold-out: not configured)',
    });

    // And a literal of more than one word, or with a character other than a letter, is still refused
    for (const literal of [
      literals.find((l) => /\s/.test(l)),
      literals.find((l) => !/\s/.test(l) && !/^\p{L}+$/u.test(l)),
    ]) {
      expect(literal).toBeDefined();
      writeConfiguration(dir, 'wingfoil-configured', { [rule]: `# Orders\n\nRemember: ${literal}\n` });
      const refused = validateScenario({ id: 'S2', version: '1.1' }, root);
      expect(refused.ok ? [] : refused.issues.map((issue) => issue.path)).toEqual([
        'arms.wingfoil-configured',
      ]);
    }
  });
});

describe('bench scenario configure and the configuring session (task-141, F7.5)', () => {
  beforeEach(() => {
    // A harness built from a clone needs its clone named (REQ-RUN-14); the doubles never read it.
    vi.stubEnv('BENCH_WINGFOIL_REPO', '/clones/wingfoil');
    vi.stubEnv('BENCH_SPECKIT_REPO', '/clones/spec-kit');
    vi.stubEnv('BENCH_HOLDOUT_PATH', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const sha256 = (content: string | Buffer) => createHash('sha256').update(content).digest('hex');
  const versionDir = (root: string, ref: string) => join(root, 'scenarios', ...ref.split('@'));
  const nothingRan = (ports: { recorded: { creates: unknown[]; runOnce: unknown[]; steps: unknown[] } }) => {
    expect(ports.recorded.creates).toEqual([]);
    expect(ports.recorded.runOnce).toEqual([]);
    expect(ports.recorded.steps).toEqual([]);
  };

  it('@F7.5 The configuring agent sees the seed and the installed harness only', async () => {
    const root = configureRepo(['S3@1.1'], ['openspec']);
    const dir = versionDir(root, 'S3@1.1');
    let seen: string[] = [];
    const ports = configurePorts('openspec', { session: (workspace) => (seen = workspaceFiles(workspace)) });

    await benchConfigure(root, ['S3@1.1', '--arm', 'openspec', '--allow-spending'], ports);

    // Its workspace holds the seed and the openspec arm's setup, less the manual moved aside
    const seed = workspaceFiles(join(dir, 'seed'));
    expect(seen).toEqual([...new Set([...seed, ...Object.keys(SETUP_FILES.openspec ?? {})])].sort());
    // And no step prompt, oracle file, hold-out file or other arm's configuration: nothing else reached the container
    expect(
      ports.recorded.copies.map((copy) => copy.split(' -> ')[1]?.replace(/^container-\d+:/, '')),
    ).toEqual(['/home/node/arm', '/home/node/harness.tgz']);
    expect(ports.recorded.steps).toHaveLength(1);
    expect(ports.recorded.steps[0]?.prompt).toBe(
      readFileSync(join(root, 'configuring', 'prompt.md'), 'utf8'),
    );
  });

  it('@F7.5 The configuring agent writes what it added or changed, and its record', async () => {
    const root = configureRepo(['S3@1.1'], ['openspec']);
    const dir = versionDir(root, 'S3@1.1');
    const written = {
      'openspec/config.yaml': 'schema: spec-driven\ncontext: |\n  An orders service.\n',
      'openspec/schemas/orders/schema.yaml': 'name: orders\n',
      '.claude/commands/opsx/review.md': '# Review\n',
    };
    const usage = {
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 10,
      costUsd: 0.4,
      costEur: 0.36,
      turns: 4,
      durationMs: 1000,
    };
    const ports = configurePorts('openspec', {
      session: (workspace) => writeFiles(workspace, written),
      doubles: { usageOf: () => usage },
    });

    // When a configuring session adds two files and changes one
    const result = await benchConfigure(root, ['S3@1.1', '--arm', 'openspec', '--allow-spending'], ports);

    expect({ code: result.code, stderr: result.stderr }).toEqual({ code: 0, stderr: '' });
    // Then the three files are written to "arms/openspec-configured/" of the scenario version
    const configured = join(dir, 'arms', 'openspec-configured');
    expect(workspaceFiles(configured)).toEqual(Object.keys(written).sort());
    for (const [path, content] of Object.entries(written)) {
      expect(readFileSync(join(configured, path), 'utf8')).toBe(content);
    }
    expect(readFileSync(join(dir, 'configured', 'openspec-configured.patch'), 'utf8')).toContain(
      'openspec/schemas/orders/schema.yaml',
    );
    // And "configured/openspec-configured.json" records the agent, model, prompt digest, pin, usage, cost and files
    const records = storedRecords(dir, 'openspec');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      agent: { name: 'fake', version: '1.0.0' },
      model: 'fake-model',
      prompt_sha256: sha256(readFileSync(join(root, 'configuring', 'prompt.md'))),
      profile_sha256: sha256(readFileSync(join(root, 'configuring', 'profile.yaml'))),
      harness: { tool: 'openspec', version: '1.14.0', commit: expect.stringMatching(/^[0-9a-f]{64}$/) },
      base_arm_digest: armDigest(root, 'openspec').slice(0, 12),
      rules_sha256: null,
      usage,
      cost_eur: 0.36,
      outcome: 'written',
      files: Object.entries(written)
        .map(([path, content]) => ({ path, sha256: sha256(content) }))
        .sort((a, b) => (a.path < b.path ? -1 : 1)),
    });
    expect(records[0]).not.toHaveProperty('cost_reported');
    // The transcript is kept under results/configuring/, which git ignores
    expect(
      existsSync(join(root, 'results', 'configuring', 'S3@1.1', 'openspec', '1', 'transcript.jsonl')),
    ).toBe(true);
    expect(result.stdout).toContain('arms/openspec-configured');
    // The version then loads with its configuration
    const loaded = loadScenario(join(root, 'scenarios'), 'S3', '1.1');
    expect(loaded.ok ? Object.keys(loaded.value.configurations) : loaded.issues).toEqual([
      'openspec-configured',
    ]);
  });

  it("@F7.5 A configuring session's result is refused when it touches what is not configuration", async () => {
    const rows: { does: string; act: (workspace: string) => void; path: string }[] = [
      { does: 'deletes a file', act: (w) => rmSync(join(w, 'README.md')), path: 'README.md' },
      {
        does: 'writes a symbolic link',
        act: (w) => symlinkSync('../../README.md', join(w, '.specify', 'presets', 'readme.md')),
        path: '.specify/presets/readme.md',
      },
      {
        does: 'changes "src/index.ts"',
        act: (w) => writeFileSync(join(w, 'src', 'index.ts'), 'export {};\n'),
        path: 'src/index.ts',
      },
      {
        does: 'writes CLAUDE.md',
        act: (w) => writeFileSync(join(w, 'CLAUDE.md'), '# Mine\n'),
        path: 'CLAUDE.md',
      },
    ];
    for (const row of rows) {
      const root = configureRepo(['S8@1.1'], ['speckit']);
      const dir = versionDir(root, 'S8@1.1');
      const ports = configurePorts('speckit', {
        session: (workspace) => {
          // Beside what is refused, a file the result could keep.
          writeFiles(workspace, { '.specify/presets/team/preset.yml': 'name: team\n' });
          row.act(workspace);
        },
      });

      // When a configuring session <does>
      const result = await benchConfigure(root, ['S8@1.1', '--arm', 'speckit', '--allow-spending'], ports);

      // Then no configuration is written, its record states the refusal, and the command exits 1
      expect({ row: row.does, code: result.code }).toEqual({ row: row.does, code: 1 });
      expect(existsSync(join(dir, 'arms', 'speckit-configured'))).toBe(false);
      expect(existsSync(join(dir, 'configured', 'speckit-configured.patch'))).toBe(false);
      const records = storedRecords(dir, 'speckit');
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        outcome: 'refused',
        reason: expect.stringContaining(`'${row.path}'`),
      });
      expect(records[0]).not.toHaveProperty('files');
      expect(result.stderr).toContain(row.path);
    }
  });

  it('@F7.5 A configuring session that writes outside its configuration places is refused', async () => {
    const places = {
      configuration: [
        { glob: '.wingfoil/dna.yaml', source: 'test' },
        { glob: '.wingfoil/roles.yaml', source: 'test' },
        { glob: '.wingfoil/directives/custom/**', source: 'test' },
      ],
      state: [
        { glob: '.wingfoil/directives/custom/.index/**', source: 'test' },
        { glob: 'docs/memory/**', source: 'test' },
      ],
    };
    const dna = (members: string) =>
      (SETUP_FILES.wingfoil?.['.wingfoil/dna.yaml'] ?? '').replace(
        / {2}members:\n[\s\S]*? {2}roles:/,
        `  members:\n${members}  roles:`,
      );
    const rows: { writes: string; act: (workspace: string) => void; path: string }[] = [
      {
        writes: 'adds "src/helpers.ts"',
        act: (w) => writeFiles(w, { 'src/helpers.ts': 'export {};\n' }),
        path: 'src/helpers.ts',
      },
      {
        writes: 'adds ".wingfoil/directives/custom/.index/a"',
        act: (w) => writeFiles(w, { '.wingfoil/directives/custom/.index/a': 'a\n' }),
        path: '.wingfoil/directives/custom/.index/a',
      },
      {
        writes: "changes the Benchmark Approver's role",
        act: (w) =>
          writeFiles(w, {
            '.wingfoil/dna.yaml': dna(
              '    - name: Benchmark Approver\n      email: approver@benchmark.localhost\n      roles: [developer]\n',
            ),
          }),
        path: '.wingfoil/dna.yaml',
      },
      {
        writes: 'adds a member with the approver role',
        act: (w) =>
          writeFiles(w, {
            '.wingfoil/dna.yaml': dna(
              '    - name: Benchmark Approver\n      email: approver@benchmark.localhost\n      roles: [approver]\n' +
                '    - name: Second Approver\n      email: second@benchmark.localhost\n      roles: [approver]\n',
            ),
          }),
        path: '.wingfoil/dna.yaml',
      },
    ];
    for (const row of rows) {
      const root = configureRepo(['S1@1.1'], ['wingfoil']);
      // Given the wingfoil arm declares these configuration and state places
      const armFile = join(root, 'arms', 'wingfoil', 'arm.yaml');
      const arm = parse(readFileSync(armFile, 'utf8')) as Record<string, unknown>;
      writeFileSync(armFile, stringify({ ...arm, ...places }));
      const dir = versionDir(root, 'S1@1.1');
      const ports = configurePorts('wingfoil', {
        session: (workspace) => {
          writeFiles(workspace, { '.wingfoil/directives/custom/r9.md': '# Rule\n' });
          row.act(workspace);
        },
      });

      // When a configuring session for S1 1.1 and "wingfoil" <writes>
      const result = await benchConfigure(root, ['S1@1.1', '--arm', 'wingfoil', '--allow-spending'], ports);

      // Then no configuration is written, its record names <path>, and the command exits 1
      expect({ row: row.writes, code: result.code, stderr: result.stderr }).toMatchObject({
        row: row.writes,
        code: 1,
        stderr: expect.stringContaining(row.path),
      });
      expect(existsSync(join(dir, 'arms', 'wingfoil-configured'))).toBe(false);
      const [record] = storedRecords(dir, 'wingfoil');
      expect(record).toMatchObject({ outcome: 'refused', reason: expect.stringContaining(`'${row.path}'`) });
      expect(String(record?.reason)).not.toContain('r9.md');
    }
  });

  it('@F7.5 A configuration place over a seed file is refused for that version', async () => {
    const root = configureRepo(['S8@1.1'], ['speckit']);
    // Given the speckit arm declares configuration "src/**", otherwise valid
    const armFile = join(root, 'arms', 'speckit', 'arm.yaml');
    const arm = parse(readFileSync(armFile, 'utf8')) as { configuration: unknown[] };
    writeFileSync(
      armFile,
      stringify({ ...arm, configuration: [...arm.configuration, { glob: 'src/**', source: 'test' }] }),
    );
    const ports = configurePorts('speckit');

    const result = await benchConfigure(root, ['S8@1.1', '--arm', 'speckit', '--allow-spending'], ports);

    // Then it is refused before any session, naming the glob and the seed file it matches, and exits 1
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("'src/**' matches the seed file 'src/index.ts'");
    nothingRan(ports);
    expect(existsSync(join(versionDir(root, 'S8@1.1'), 'configured'))).toBe(false);
  });

  it("@F7.5 A harness arm's configuration places hold its project rules", async () => {
    const root = configureRepo(['S8@1.1'], ['speckit']);
    const dir = versionDir(root, 'S8@1.1');
    const constitution = '.specify/memory/constitution.md';
    const ports = configurePorts('speckit', {
      // When a configuring session for S8 1.1 and "speckit" extends the generated constitution
      session: (workspace) =>
        appendFileSync(join(workspace, constitution), '\n## Reviews\n\nEvery change is reviewed.\n'),
    });

    const result = await benchConfigure(root, ['S8@1.1', '--arm', 'speckit', '--allow-spending'], ports);

    // Then the configuration is written with ".specify/memory/constitution.md"
    expect({ code: result.code, stderr: result.stderr }).toEqual({ code: 0, stderr: '' });
    expect(workspaceFiles(join(dir, 'arms', 'speckit-configured'))).toEqual([constitution]);
    expect(storedRecords(dir, 'speckit')[0]).toMatchObject({
      outcome: 'written',
      files: [{ path: constitution }],
    });
  });

  it("@F7.5 The configuring agent for Spec Kit on S8 sees S8's project rules", async () => {
    const root = configureRepo(['S8@1.1'], ['speckit']);
    const dir = versionDir(root, 'S8@1.1');
    const constitution = '.specify/memory/constitution.md';
    let seen = '';
    const ports = configurePorts('speckit', {
      session: (workspace) => {
        seen = readFileSync(join(workspace, constitution), 'utf8');
        writeFiles(workspace, { '.specify/presets/team/preset.yml': 'name: team\n' });
      },
    });

    await benchConfigure(root, ['S8@1.1', '--arm', 'speckit', '--allow-spending'], ports);

    // Then its workspace holds the constitution REQ-FMT-14 generates from S8's rules
    const rules = join(dir, 'arms', 'wingfoil');
    const expected = renderConstitution(
      new Map(workspaceFiles(rules).map((path) => [path, readFileSync(join(rules, path), 'utf8')])),
    );
    expect(expected).toBeDefined();
    expect(seen).toBe(expected);
    // And its record holds that constitution's SHA-256
    expect(storedRecords(dir, 'speckit')[0]?.rules_sha256).toBe(sha256(expected ?? ''));
  });

  it('@F7.5 A version a run has recorded is never configured again', async () => {
    for (const { arm, flag } of [
      { arm: 'speckit', flag: [] },
      { arm: 'wingfoil', flag: ['--replace'] },
    ]) {
      const root = configureRepo(['S1@1.1'], [arm]);
      // Given a dry run under "results/dry-runs/" has run S1 1.1
      writeStoredDryRun(root, 1, { id: 'S1', version: '1.1', hash: 'f'.repeat(64), arm, stepCostsUsd: [0] });
      const ports = configurePorts(arm);

      const result = await benchConfigure(root, ['S1@1.1', '--arm', arm, '--allow-spending', ...flag], ports);

      // Then it is refused before any session, and exits 1
      expect({ arm, code: result.code }).toEqual({ arm, code: 1 });
      expect(result.stderr).toContain(`results/dry-runs/1/runs/S1@1.1/${arm}/fake-model/r1/run.json`);
      nothingRan(ports);
    }
  });

  it('@F7.5 An existing configuration is kept unless replaced', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    // Given S1 1.1 holds a configuration for "wingfoil-configured"
    writeConfiguration(versionDir(root, 'S1@1.1'), 'wingfoil-configured', {
      '.wingfoil/directives/custom/r9.md': '# Rule\n',
    });
    const ports = configurePorts('wingfoil');

    const result = await benchConfigure(root, ['S1@1.1', '--arm', 'wingfoil', '--allow-spending'], ports);

    // Then it is refused before any session, and exits 1
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('S1@1.1 already holds a configuration for wingfoil-configured');
    expect(result.stderr).toContain('--replace');
    nothingRan(ports);
  });

  it('@F7.5 A version 1.0 is never configured', async () => {
    const root = configureRepo(['S1@1.0'], ['wingfoil']);
    const ports = configurePorts('wingfoil');

    const result = await benchConfigure(root, ['S1@1.0', '--arm', 'wingfoil', '--allow-spending'], ports);

    // Then it is refused before any session, naming the approver's choice, and exits 1
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(
      "a version 1.0 is never configured (the approver's choice of 2026-11-06)",
    );
    nothingRan(ports);
  });

  it("@F7.5 The configuring session runs without the arm's manual and MCP server", async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    let manualDuring: boolean | undefined;
    let workspaceDir = '';
    const ports = configurePorts('wingfoil', {
      session: (workspace) => {
        workspaceDir = workspace;
        manualDuring = existsSync(join(workspace, 'CLAUDE.md'));
        writeFiles(workspace, { '.wingfoil/directives/custom/r9.md': '# Rule\n' });
      },
    });

    const result = await benchConfigure(root, ['S1@1.1', '--arm', 'wingfoil', '--allow-spending'], ports);

    expect({ code: result.code, stderr: result.stderr }).toEqual({ code: 0, stderr: '' });
    // Then the workspace holds no CLAUDE.md and no MCP server is attached during the session
    expect(manualDuring).toBe(false);
    expect(ports.recorded.steps).toHaveLength(1);
    expect(ports.recorded.steps[0]?.mcpConfig).toBeUndefined();
    // And the merged manual is back after it
    expect(readFileSync(join(workspaceDir, 'CLAUDE.md'), 'utf8')).toBe(
      readFileSync(join(root, 'arms', 'wingfoil', 'manual.md'), 'utf8'),
    );
  });

  it('@F7.5 A configuring session killed at a cap writes its record only', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const dir = versionDir(root, 'S1@1.1');
    const ports = configurePorts('wingfoil', {
      doubles: {
        execResultOf: (command) => {
          if (command[0] === 'bash') return { code: 0, stdout: '', stderr: '' };
          return command[4] === 'sleep' ? { code: 124, stdout: '', stderr: '' } : undefined;
        },
      },
    });
    // The killed session reports nothing: no result event, no cost (C3).
    const agent: AgentPort = {
      runStep: async (request) => {
        writeFiles(ports.recorded.creates.at(-1)?.workspace ?? '', {
          '.wingfoil/directives/custom/r9.md': '# R\n',
        });
        await request.run(['sleep', '100']);
        return {
          sessionId: request.sessionId,
          usage: { ...NO_USAGE },
          transcript: [],
          error: 'the session ended with no result event',
        };
      },
      resume: () => Promise.reject(new Error('a configuring session is never resumed')),
    };

    // When a configuring session is killed at the step time cap
    const result = await benchConfigure(root, ['S1@1.1', '--arm', 'wingfoil', '--allow-spending'], {
      ...ports,
      agent,
    });

    // Then its record has the outcome "killed", its cost at its bound and cost_reported false, and no configuration
    expect(result.code).toBe(1);
    const [record] = storedRecords(dir, 'wingfoil');
    expect(record).toMatchObject({ outcome: 'killed', cost_reported: false, cost_eur: 5 });
    expect(existsSync(join(dir, 'arms', 'wingfoil-configured'))).toBe(false);
    expect(existsSync(join(dir, 'configured', 'wingfoil-configured.patch'))).toBe(false);
  });

  it('@F7.5 A configuring prompt that names a harness is refused before any session', async () => {
    const root = configureRepo(['S1@1.1'], ['speckit']);
    // Given "configuring/prompt.md" names "Spec Kit"
    appendFileSync(join(root, 'configuring', 'prompt.md'), '\nAs Spec Kit does.\n');
    const ports = configurePorts('speckit');

    const result = await benchConfigure(root, ['S1@1.1', '--arm', 'speckit', '--allow-spending'], ports);

    // Then it is refused before any session, naming the prompt, and exits 1
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('configuring/prompt.md');
    expect(result.stderr).toContain('Spec Kit');
    nothingRan(ports);
  });

  it('@F7.5 Without --allow-spending nothing runs', async () => {
    const root = configureRepo(['S1@1.1'], ['speckit'], 'claude-code');
    const ports = configurePorts('speckit');

    const result = await benchConfigure(root, ['S1@1.1', '--arm', 'speckit'], ports);

    // Then it is refused before any session, with campaign run's message, and exits 1
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(
      "agent 'claude-code' spends real money, up to the session's ceiling of 5 EUR; pass --allow-spending to run it",
    );
    nothingRan(ports);
    expect(ports.recorded.builds).toEqual([]);
  });

  it('@F7.5 A failed replacement keeps the configuration', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const dir = versionDir(root, 'S1@1.1');
    // Given S1 1.1 holds a configuration for "wingfoil-configured"
    const earlier = { '.wingfoil/directives/custom/r9.md': '# Rule\n' };
    writeConfiguration(dir, 'wingfoil-configured', earlier, [
      configuredRecord(earlier, { date: '2026-11-01T10:00:00Z' }),
    ]);
    const patch = readFileSync(join(dir, 'configured', 'wingfoil-configured.patch'), 'utf8');
    const ports = configurePorts('wingfoil', {
      session: (workspace) => writeFiles(workspace, { 'src/helpers.ts': 'export {};\n' }),
    });

    // When a "--replace" session for it is refused
    const result = await benchConfigure(
      root,
      ['S1@1.1', '--arm', 'wingfoil', '--allow-spending', '--replace'],
      ports,
    );

    // Then S1 1.1 still holds the earlier configuration, and both records are kept
    expect(result.code).toBe(1);
    const records = storedRecords(dir, 'wingfoil');
    expect(records.map((record) => record.outcome)).toEqual(['written', 'refused']);
    expect(workspaceFiles(join(dir, 'arms', 'wingfoil-configured'))).toEqual(Object.keys(earlier));
    expect(readFileSync(join(dir, 'configured', 'wingfoil-configured.patch'), 'utf8')).toBe(patch);
    const loaded = loadScenario(join(root, 'scenarios'), 'S1', '1.1');
    expect(
      loaded.ok ? loaded.value.configurations['wingfoil-configured']?.record.outcome : loaded.issues,
    ).toBe('written');
  });
});
