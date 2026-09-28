import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stringify } from 'yaml';

import { loadCampaign } from '../../src/campaign/index.js';
import { checkCampaign, main } from '../../src/cli/index.js';
import { runCampaign } from '../../src/runner/index.js';
import { nextExecution } from '../../src/results/index.js';
import { writeArmsNamed } from '../support/arm-fixture.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';
import { priceCampaign, writeDryRunProfile } from '../support/dry-run-fixture.js';
import { repoPath } from '../support/paths.js';
import { doubles } from '../support/runner-doubles.js';
import type { Doubles } from '../support/runner-doubles.js';
import { tempDir } from '../support/scenario-fixture.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * A repository with T3 — standing in for S1, S3 in the feature — in the baseline and wingfoil arms, a
 * campaign of three repetitions at 0.92 EUR/USD, and the dry runs `arms` lists already made with the
 * fake agent, reporting `perStepUsd` for each of T3's two steps.
 */
async function pricedRepository(
  arms: Readonly<Record<string, number>>,
): Promise<{ root: string; file: string }> {
  const root = tempDir('bench-repo-');
  cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
  copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
  writeArmsNamed(root, ['baseline', 'wingfoil']);
  writeDryRunProfile(root);
  mkdirSync(join(root, 'campaigns'));
  const file = join(root, 'campaigns', 'c.yaml');
  writeFileSync(
    file,
    stringify({
      ...completeCampaignYaml(),
      scenarios: [{ id: 'T3', version: '1.0' }],
      arms: ['baseline', 'wingfoil'],
      repetitions: { T3: 3 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
      currency: { usd_to_eur: 0.92 },
    }),
  );
  vi.stubEnv('BENCH_WINGFOIL_REPO', '/clones/wingfoil');
  for (const [arm, perStepUsd] of Object.entries(arms)) {
    const ports = doubles({
      commits: { '3df305e': '3df305ea198d7e2ca0da73bfb12b14af865e9922' },
      onRunOnce: (request) => {
        mkdirSync(join(request.mount.source, 'out'), { recursive: true });
        writeFileSync(join(request.mount.source, 'out', 'wingfoil-0.1.0.tgz'), 'tarball');
        writeFileSync(join(request.mount.source, 'out', 'installed.tgz'), 'installed');
      },
      usageOf: () => ({
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        costUsd: perStepUsd,
        costEur: 0,
        turns: 1,
        durationMs: 1,
      }),
    });
    const code = await main(
      ['scenario', 'dry-run', 'T3@1.0', '--arm', arm],
      { stdout: () => {}, stderr: () => {} },
      ports,
      root,
    );
    if (code !== 0) throw new Error(`the dry run of T3 in ${arm} failed`);
  }
  return { root, file };
}

async function estimate(file: string, ports: Doubles) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    ['campaign', 'estimate', file],
    {
      stdout: (text) => (stdout += text),
      stderr: (text) => (stderr += text),
    },
    ports,
  );
  return { code, stdout, stderr };
}

/**
 * A repository whose campaign runs T3 once in the baseline arm at 1 EUR/USD under `budget`, with a
 * stored dry run of T3 that costs `estimateEur`: the campaign's estimate (task-022).
 */
function budgetedRepository(estimateEur: number, budget: { warn_eur: number; ceiling_eur: number }): string {
  const root = tempDir('bench-repo-');
  cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
  writeArmsNamed(root, ['baseline']);
  mkdirSync(join(root, 'campaigns'));
  const file = join(root, 'campaigns', 'c.yaml');
  writeFileSync(
    file,
    stringify({
      ...completeCampaignYaml(),
      harnesses: {},
      scenarios: [{ id: 'T3', version: '1.0' }],
      arms: ['baseline'],
      repetitions: { T3: 1 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
      budget,
      currency: { usd_to_eur: 1 },
    }),
  );
  priceCampaign(file, estimateEur);
  return file;
}

/** `campaign run`, with the maintainer's answers to any question, in order; none means no terminal. */
async function start(file: string, ports: Doubles, answers?: string[], ...flags: string[]) {
  let stdout = '';
  let stderr = '';
  const questions: string[] = [];
  const code = await main(
    ['campaign', 'run', file, ...flags],
    {
      stdout: (text) => (stdout += text),
      stderr: (text) => (stderr += text),
      ...(answers === undefined
        ? {}
        : {
            ask: (question: string) => {
              questions.push(question);
              return Promise.resolve(answers.shift() ?? '');
            },
          }),
    },
    ports,
  );
  return { code, stdout, stderr, questions };
}

/** T3 (two steps) in the baseline arm, `repetitions` times, at 1 EUR/USD, with the caps and budget given. */
function cappedCampaign(runCostEur: number, repetitions: number, ceilingEur: number) {
  const root = tempDir('bench-repo-');
  cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
  writeArmsNamed(root, ['baseline']);
  mkdirSync(join(root, 'campaigns'));
  const file = join(root, 'campaigns', 'c.yaml');
  writeFileSync(
    file,
    stringify({
      ...completeCampaignYaml(),
      harnesses: {},
      scenarios: [{ id: 'T3', version: '1.0' }],
      arms: ['baseline'],
      repetitions: { T3: repetitions },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
      caps: { step_time_s: 60, step_tokens: 1_000_000, run_cost_eur: runCostEur },
      budget: { warn_eur: ceilingEur, ceiling_eur: ceilingEur },
      currency: { usd_to_eur: 1 },
    }),
  );
  const checked = checkCampaign(file);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return checked.value;
}

function spent(costUsd: number) {
  return {
    inputTokens: 1,
    outputTokens: 1,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUsd,
    costEur: costUsd,
    turns: 1,
    durationMs: 1,
  };
}

describe('campaign.feature', () => {
  it('@F1.1 A campaign file pins every variable', () => {
    const { file } = writeRepo();

    const result = checkCampaign(file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { campaign } = result.value;
    expect(campaign.id).toMatch(/^[0-9a-f]{12}$/);
    expect(campaign.spec.harnesses).toEqual({ wingfoil: { tool: 'wingfoil', version: '3df305e' } });
    expect(result.value.scenarios.map((s) => `${s.id}@${s.version}`)).toEqual([
      'S1@1.0',
      'S2@1.0',
      'S3@1.0',
      'S8@1.0',
    ]);
    expect(campaign.spec.arms).toEqual(['baseline', 'baseline-docs', 'wingfoil']);
    expect(campaign.spec.agent).toEqual({ name: 'claude-code', version: '2.1.221' });
    expect(campaign.spec.models.default).toBe('claude-sonnet-5');
    expect(campaign.spec.repetitions).toEqual({ S1: 3, S2: 1, S3: 1, S8: 1 });
    expect(campaign.spec.approver_policy).toBe('v1');
    expect(campaign.spec.currency.usd_to_eur).toBe(0.92);
  });

  it('@F1.1 A campaign with an unpinned harness is rejected', () => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = { wingfoil: { tool: 'wingfoil', version: 'main' } };

    const result = checkCampaign(writeRepo(yaml).file);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      { path: 'harnesses.wingfoil.version', message: expect.stringMatching(/'main' is not pinned/) },
    ]);
  });

  it('@F1.1 The same campaign file identifies the same campaign', () => {
    const { root, file } = writeRepo();
    const first = loadCampaign(file);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    mkdirSync(join(root, 'results', first.value.id, '1'), { recursive: true });

    const reordered = Object.fromEntries(Object.entries(completeCampaignYaml()).reverse());
    writeFileSync(file, `# the same campaign, reformatted\n${stringify(reordered, { indent: 4 })}`);
    const again = loadCampaign(file);

    expect(again.ok && again.value.id).toBe(first.value.id);
    expect(nextExecution(first.value.resultsRoot, first.value.id)).toBe(2);
  });

  it('@F1.2 The cost is estimated before any run starts', async () => {
    const { file } = await pricedRepository({ baseline: 0.01, wingfoil: 0.05 });
    const ports = doubles();

    // When the maintainer asks for the campaign's cost estimate
    const result = await estimate(file, ports);

    // Then the estimate lists, per scenario and per arm, the dry-run cost times the repetitions
    expect(result.code).toBe(0);
    const lines = result.stdout.split('\n');
    expect(lines.slice(0, 2)).toEqual([
      'T3@1.0 baseline fake-model: 0.0200 USD × 3 = 0.0600 USD (results/dry-runs/1)',
      'T3@1.0 wingfoil fake-model: 0.1000 USD × 3 = 0.3000 USD (results/dry-runs/2)',
    ]);
    // And it shows the total in euro, as an API-equivalent cost
    expect(lines[2]).toBe('estimate: 0.3600 USD, 0.3312 EUR at 0.92 EUR/USD, API-equivalent');
    // And no agent session is started
    expect(ports.recorded.steps).toEqual([]);
    expect(ports.recorded.builds).toEqual([]);
    expect(ports.recorded.creates).toEqual([]);
    expect(ports.recorded.runOnce).toEqual([]);
  });

  it('@F1.2 A scenario without a dry run cannot be estimated', async () => {
    // Given scenario S3 has no recorded dry-run cost for the wingfoil arm
    const { file } = await pricedRepository({ baseline: 0.01 });

    // When the maintainer asks for the campaign's cost estimate
    const result = await estimate(file, doubles());

    // Then the estimate fails
    // And the message names S3 and the wingfoil arm, and says to run a dry run first
    expect(result).toEqual({
      code: 1,
      stdout: '',
      stderr:
        'scenarios[0]: T3@1.0 has no completed dry run in arm wingfoil on model fake-model: run bench ' +
        'scenario dry-run T3@1.0 --arm wingfoil --model fake-model first\n',
    });
  });

  it('@F1.3 A campaign above the warning threshold warns but may start', async () => {
    // Given the estimate is 42 euro
    // And the warning threshold is 30 euro and the ceiling is 100 euro
    const file = budgetedRepository(42, { warn_eur: 30, ceiling_eur: 100 });

    // When the maintainer starts the campaign
    // Then a warning shows the estimate and the threshold
    const declined = doubles();
    const refused = await start(file, declined, ['n']);
    expect(refused.stderr).toContain(
      'campaign: the estimate, 42.0000 EUR, is above the warning threshold, 30 EUR\n',
    );
    expect(refused.questions).toEqual(['Start the campaign? [y/N] ']);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toMatch(/campaign: not started: not confirmed\n$/);
    expect(declined.recorded.builds).toEqual([]);

    // And the campaign starts only after the maintainer confirms
    const confirmed = doubles();
    const started = await start(file, confirmed, ['y']);
    expect(started.code).toBe(0);
    expect(confirmed.recorded.creates).toHaveLength(1);
  });

  it('@F1.3 A campaign above the ceiling refuses to start', async () => {
    // Given the estimate is 130 euro
    // And the ceiling is 100 euro
    const file = budgetedRepository(130, { warn_eur: 30, ceiling_eur: 100 });

    // When the maintainer starts the campaign
    // (and no command-line option can make it start: the only one there is, included)
    for (const flags of [[], ['--allow-spending']]) {
      const ports = doubles();
      const result = await start(file, ports, ['y'], ...flags);

      // Then the campaign does not start
      expect(result.code).toBe(1);
      expect(result.stderr).toBe(
        'campaign: not started: the estimate, 130.0000 EUR, is above the ceiling, 100 EUR. No option ' +
          "overrides it: lower the campaign's cost, or raise ceiling_eur, which makes a new campaign\n",
      );
      expect(result.questions).toEqual([]);
      // And no agent session is started
      expect(ports.recorded.steps).toEqual([]);
      expect(ports.recorded.builds).toEqual([]);
      expect(ports.recorded.creates).toEqual([]);
    }
  });

  it('@F1.3 A run that exceeds its own cost cap is stopped', async () => {
    // Given a run whose cost cap is 3 euro
    const checked = cappedCampaign(3, 1, 100);
    // When the run's accumulated cost reaches 3 euro during a step — the agent, given what is left of
    // the cap, stops there, as Claude Code does at --max-budget-usd (task-024, C1)
    const ports = doubles({
      usageOf: () => spent(3.1),
      stopOf: (request) => (request.step === 1 ? 'cap reached' : undefined),
    });
    const summary = await runCampaign(checked, ports);
    const run = summary.runs[0];

    // Then the step is stopped
    expect(ports.recorded.steps.map((request) => request.step)).toEqual([1]);
    expect(ports.recorded.steps[0]?.remainingCostUsd).toBe(3);
    // And the run ends with the outcome "cap reached"
    expect(run?.outcome).toBe('cap reached');
    expect(run?.steps.map((step) => step.outcome)).toEqual(['cap reached']);
    // And the snapshot at that moment is kept for scoring
    expect(ports.recorded.gitCalls).toContainEqual(expect.stringMatching(/commit .* step 01/));
    expect(readFileSync(join(run?.outputDir ?? '', 'steps', '01', 'diff.patch'), 'utf8')).not.toBe('');
  });

  it('@F1.3 A campaign stops starting new runs when the budget is spent', async () => {
    // Given the campaign's accumulated cost reaches the ceiling — three runs of T3, 1 EUR each, under
    // a 2 EUR ceiling
    const checked = cappedCampaign(3, 3, 2);
    const ports = doubles({ usageOf: () => spent(0.5) });

    // When the next run would start
    const summary = await runCampaign(checked, ports);

    // Then it does not start
    expect(ports.recorded.creates).toHaveLength(2);
    // And the campaign ends with the outcome "budget exhausted"
    expect(summary.outcome).toBe('budget exhausted');
    // And the completed runs are kept and can be scored
    expect(summary.runs.map((run) => run.outcome)).toEqual(['completed', 'completed']);
    for (const run of summary.runs) {
      expect(JSON.parse(readFileSync(join(run.outputDir, 'run.json'), 'utf8'))).toMatchObject({
        outcome: 'completed',
      });
    }
  });
});
