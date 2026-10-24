import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, stringify } from 'yaml';

import { loadCampaign } from '../../src/campaign/index.js';
import { checkCampaign, main } from '../../src/cli/index.js';
import { runCampaign } from '../../src/runner/index.js';
import { executionResumable, nextExecution } from '../../src/results/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import { writeArmsNamed } from '../support/arm-fixture.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';
import { priceCampaign, writeDryRunProfile } from '../support/dry-run-fixture.js';
import { repoPath } from '../support/paths.js';
import { doubles } from '../support/runner-doubles.js';
import type { Doubles } from '../support/runner-doubles.js';
import { tempDir } from '../support/scenario-fixture.js';
import { CANCEL, EXECUTION, scoringDocker, storedRun } from '../support/score-fixture.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * A repository with T3 — standing in for S1, S3 in the feature — in the baseline and wingfoil arms, a
 * campaign of three repetitions at 0.92 EUR/USD, and the dry runs `arms` lists already made with the
 * fake agent, reporting `perStepUsd` for each of T3's two steps.
 */
async function pricedRepository(
  arms: Readonly<Record<string, number | readonly number[]>>,
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
  for (const [arm, costs] of Object.entries(arms).flatMap(([name, value]) =>
    (typeof value === 'number' ? [value] : value).map((perStepUsd) => [name, perStepUsd] as const),
  )) {
    const perStepUsd = costs;
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
  // Two dry runs of the same cost: a range with no margin, so that the guard's figure is the scenario's (task-081).
  priceCampaign(file, estimateEur, 2);
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

/**
 * T3 (two steps) in the baseline arm, `repetitions` times, at 1 EUR/USD, with the caps and budget given, and any
 * other field of the campaign file in `extra` (task-079: `fail_fast`).
 */
function cappedCampaign(
  runCostEur: number,
  repetitions: number,
  ceilingEur: number,
  extra: Readonly<Record<string, unknown>> = {},
) {
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
      ...extra,
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

/**
 * A repository (writeRepo's) with `preset` as `campaigns/presets/reference.yaml` and a campaign file that
 * extends it with `own` (dl-022, task-101); `own.extends` replaces the default reference.
 */
function presetRepo(
  preset: Record<string, unknown>,
  own: Record<string, unknown>,
): { root: string; file: string } {
  const { root, file } = writeRepo();
  mkdirSync(join(root, 'campaigns', 'presets'));
  writeFileSync(join(root, 'campaigns', 'presets', 'reference.yaml'), stringify(preset));
  writeFileSync(file, stringify({ extends: 'presets/reference.yaml', ...own }));
  return { root, file };
}

/** `bench …` from `root`, its output captured. */
async function cli(argv: string[], root: string): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  const code = await main(
    argv,
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    doubles(),
    root,
  );
  return { code, stdout, stderr };
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
    expect(campaign.spec.agent).toEqual({
      name: 'claude-code',
      version: '2.1.221',
      effort: { 'claude-sonnet-5': 'high', 'claude-opus-5': 'high' },
    });
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

  it('@F1.1 A campaign file that extends a preset is resolved before it is validated', async () => {
    // Given a preset that describes what it measures and pins every field but the budget
    const { budget, ...pins } = completeCampaignYaml();
    const { root, file } = presetRepo(
      { description: 'every arm, every scenario', ...pins },
      { budget: { warn_eur: 5, ceiling_eur: 9 } },
    );
    void budget;

    // When the maintainer validates the campaign file
    const result = checkCampaign(file);
    const printed = await cli(['campaign', 'validate', file], root);

    // Then the campaign is accepted, with the preset's pins and the file's budget
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.campaign.spec.arms).toEqual(['baseline', 'baseline-docs', 'wingfoil']);
    expect(result.value.campaign.spec.budget).toEqual({ warn_eur: 5, ceiling_eur: 9 });
    // And the validation prints the resolved campaign
    expect(printed.code).toBe(0);
    expect(printed.stdout).toContain('resolved from presets/reference.yaml:');
    expect(printed.stdout).toContain('ceiling_eur: 9');
    expect(printed.stdout).not.toContain('extends:');
  });

  it('@F1.1 A preset that cannot be extended is refused', () => {
    const preset = (change: Record<string, unknown>): Record<string, unknown> => {
      const content: Record<string, unknown> = {
        description: 'every arm',
        ...completeCampaignYaml(),
        ...change,
      };
      if (content.description === undefined) delete content.description;
      return content;
    };
    const cases: [string, Record<string, unknown>, Record<string, unknown>, RegExp][] = [
      [
        'extends another preset',
        preset({ extends: 'presets/other.yaml' }),
        {},
        /'presets\/reference.yaml' must not extend another preset/,
      ],
      [
        'has no description',
        preset({ description: undefined }),
        {},
        /'presets\/reference.yaml' has no description/,
      ],
      [
        'does not exist',
        preset({}),
        { extends: 'presets/missing.yaml' },
        /'presets\/missing.yaml' cannot be read/,
      ],
      [
        'lies outside campaigns/presets/',
        preset({}),
        { extends: 'presets/../campaign.yaml' },
        /must name a file in campaigns\/presets\//,
      ],
    ];
    for (const [defect, content, own, message] of cases) {
      // Given a campaign file that extends a preset that <defect>
      const { file } = presetRepo(content, own);

      // When the maintainer validates the campaign file
      const result = checkCampaign(file);

      // Then the campaign is rejected, and the message names the preset and says why
      expect(result.ok, defect).toBe(false);
      if (result.ok) continue;
      expect(result.issues, defect).toEqual([{ path: 'extends', message: expect.stringMatching(message) }]);
    }
  });

  it('@F1.1 A campaign is identified by its resolved content', () => {
    // Given a campaign file that extends a preset, and a whole file holding the same resolved content
    const { root, file } = presetRepo(
      { description: 'every arm', ...completeCampaignYaml() },
      { currency: { usd_to_eur: 0.9 } },
    );
    const whole = join(root, 'campaigns', 'whole.yaml');
    writeFileSync(whole, stringify({ ...completeCampaignYaml(), currency: { usd_to_eur: 0.9 } }));

    // When the maintainer validates both, they have the same identity
    const extending = loadCampaign(file);
    const written = loadCampaign(whole);
    expect(extending.ok && written.ok).toBe(true);
    if (!extending.ok || !written.ok) return;
    expect(extending.value.id).toBe(written.value.id);

    // And changing the preset gives the extending campaign a new identity
    writeFileSync(
      join(root, 'campaigns', 'presets', 'reference.yaml'),
      stringify({ description: 'every arm', ...completeCampaignYaml(), approver_policy: 'v2' }),
    );
    const changed = loadCampaign(file);
    expect(changed.ok && changed.value.id).not.toBe(extending.value.id);
  });

  it('@F1.1 An execution keeps the resolved campaign', async () => {
    // Given a campaign file that extends a preset (T3 once in the baseline arm, with the fake agent)
    const runnable = budgetedRepository(0.01, { warn_eur: 30, ceiling_eur: 100 });
    const root = join(runnable, '..', '..');
    const pins = parse(readFileSync(runnable, 'utf8')) as Record<string, unknown>;
    const { budget, ...preset } = pins;
    mkdirSync(join(root, 'campaigns', 'presets'));
    writeFileSync(
      join(root, 'campaigns', 'presets', 'smoke.yaml'),
      stringify({ description: 'T3 once', ...preset }),
    );
    writeFileSync(runnable, stringify({ extends: 'presets/smoke.yaml', budget }));
    const loaded = loadCampaign(runnable);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    // When the maintainer runs the campaign
    const ports = doubles();
    const run = await start(runnable, ports);
    expect(run.code).toBe(0);

    // Then the execution's campaign.yaml is the resolved campaign, without the extends field
    const kept = parse(
      readFileSync(join(root, 'results', loaded.value.id, '1', 'campaign.yaml'), 'utf8'),
    ) as Record<string, unknown>;
    expect(kept).toEqual(pins);
    expect(kept).not.toHaveProperty('extends');
  });

  it('@F1.1 The presets are listed with what they measure', async () => {
    // Given two presets in campaigns/presets/
    const { root } = presetRepo({ description: 'every arm, every scenario', ...completeCampaignYaml() }, {});
    writeFileSync(
      join(root, 'campaigns', 'presets', 'smoke.yaml'),
      stringify({ description: 'one cheap scenario in every arm', repetitions: { S3: 1 } }),
    );

    // When the maintainer lists the presets
    const listed = await cli(['campaign', 'presets'], root);

    // Then each is listed with its name and its description
    expect(listed.code).toBe(0);
    expect(listed.stdout).toBe(
      'reference: every arm, every scenario\n' + 'smoke: one cheap scenario in every arm\n',
    );
  });

  it('@F1.2 The cost is estimated before any run starts', async () => {
    // Three dry runs of T3 in the baseline arm, one in wingfoil (REQ-CLI-02 as amended in 1.26, task-081)
    const { file } = await pricedRepository({ baseline: [0.01, 0.02, 0.03], wingfoil: 0.05 });
    const ports = doubles();

    // When the maintainer asks for the campaign's cost estimate
    const result = await estimate(file, ports);

    // Then the estimate lists, per scenario and per arm, the dry-run cost times the repetitions: the lowest, the mean
    // and the highest of its dry runs, or the one dry run with a stated 35 % margin
    expect(result.code).toBe(0);
    const lines = result.stdout.split('\n');
    expect(lines.slice(0, 2)).toEqual([
      'T3@1.0 baseline fake-model: low 0.0200, mean 0.0400, high 0.0600 USD × 3 = 0.1800 USD ' +
        '(3 dry runs: results/dry-runs/3, results/dry-runs/2, results/dry-runs/1)',
      'T3@1.0 wingfoil fake-model: 0.1000 USD + 35 % margin = 0.1350 USD × 3 = 0.4050 USD ' +
        '(1 dry run: results/dry-runs/4)',
    ]);
    // And it shows the total in euro, as an API-equivalent cost, and the figure the budget guard compares
    expect(lines.slice(2, 4)).toEqual([
      'estimate: low 0.3600, mean 0.4200, high 0.5850 USD; high 0.5382 EUR at 0.92 EUR/USD, API-equivalent',
      'budget guard: 0.0000 + 0.5382 = 0.5382 EUR (warn 30 EUR, ceiling 100 EUR)',
    ]);
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
      'campaign: the budget guard, 0.0000 + 42.0000 = 42.0000 EUR, is above the warning threshold, 30 EUR\n',
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
        'campaign: not started: the budget guard, 0.0000 + 130.0000 = 130.0000 EUR, is above the ceiling, 100 EUR. No option ' +
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
  it('@F1.4 An interrupted campaign stops cleanly', async () => {
    // Given a campaign execution with runs still to start: three runs of T3
    const checked = cappedCampaign(3, 3, 100);
    const interrupt = new AbortController();
    const started = new Date('2026-10-11T08:00:00.000Z');
    const ended = new Date('2026-10-11T08:05:00.000Z');
    const dates = [started, ended];
    // When the maintainer interrupts it during a run: the second run's step 1, whose agent the stop kills
    const ports = doubles({
      usageOf: () => spent(0.5),
      onStep: (request) => {
        if (ports.recorded.creates.length === 2 && request.step === 1) {
          interrupt.abort();
          throw new Error('the agent exited with code 137');
        }
      },
    });
    const summary = await runCampaign(checked, {
      ...ports,
      signal: interrupt.signal,
      date: () => dates.shift() ?? ended,
    });

    // Then the current run is recorded as interrupted
    expect(summary.runs.map((run) => run.outcome)).toEqual(['completed', 'interrupted']);
    const run = JSON.parse(readFileSync(join(summary.runs[1]?.outputDir ?? '', 'run.json'), 'utf8'));
    expect(run.outcome).toBe('interrupted');
    // its step counted at its bound — all that was left of the run's 3 EUR cap, at 1 EUR/USD
    expect(run.steps).toEqual([
      expect.objectContaining({ n: 1, outcome: 'interrupted', cost_reported: false, cost_bound_usd: 3 }),
    ]);
    // and its container removed, once
    expect(ports.recorded.removes).toEqual(['container-1', 'container-2']);
    // No further run starts
    expect(ports.recorded.creates).toHaveLength(2);
    // And the execution is recorded as stopped, with why
    expect(summary.outcome).toBe('interrupted');
    expect(JSON.parse(readFileSync(join(summary.resultsDir, 'execution.json'), 'utf8'))).toEqual({
      state: 'stopped',
      reason: 'interrupt',
      detail: expect.stringContaining('interrupted during run T3@1.0/baseline/fake-model/r2'),
      started: started.toISOString(),
      ended: ended.toISOString(),
    });
  });

  it('@F1.4 A campaign stops itself after the same failure repeats', async () => {
    // Given a campaign file that stops after 2 runs fail with the same error at the same step
    const checked = cappedCampaign(3, 4, 100, { fail_fast: { same_error: 2 } });
    // When two runs fail that way
    const ports = doubles({
      errorOf: (request) => (request.step === 1 ? 'the agent could not reach the API' : undefined),
    });
    const summary = await runCampaign(checked, ports);

    // Then the campaign starts no further run
    expect(ports.recorded.creates).toHaveLength(2);
    expect(summary.runs.map((run) => run.outcome)).toEqual(['failed', 'failed']);
    // and records why
    expect(summary.outcome).toBe('fail_fast');
    const execution = JSON.parse(readFileSync(join(summary.resultsDir, 'execution.json'), 'utf8'));
    expect(execution).toMatchObject({ state: 'stopped', reason: 'fail_fast' });
    expect(execution.detail).toContain('2 runs failed at step 01');
    expect(execution.detail).toContain('the agent could not reach the API');
  });
  it('@F1.4 A resume re-runs only what infrastructure stopped', async () => {
    // Given a stopped execution holding a completed run (r1), a run that reached its cost cap (r2), a run failed by
    // the infrastructure (r3), an interrupted run (r4), a run stopped at the subscription's quota (r5) and runs never
    // started (r6, r7)
    const checked = cappedCampaign(3, 7, 100);
    let run = 0;
    const first = doubles({
      usageOf: (request) => spent(request.step === 1 && run === 2 ? 3.1 : 0.1),
      onStep: (request) => {
        if (request.step === 1) run += 1;
      },
      stopOf: (request) => {
        if (request.step !== 1) return undefined;
        if (run === 2) return 'cap reached';
        if (run === 5) return 'quota exhausted';
        return undefined;
      },
      errorOf: (request) =>
        request.step === 1 && (run === 3 || run === 4) ? 'the network failed' : undefined,
    });
    const stopped = await runCampaign(checked, first);
    expect(stopped.runs.map((r) => r.outcome)).toEqual([
      'completed',
      'cap reached',
      'failed',
      'failed',
      'quota exhausted',
    ]);
    // One execution cannot stop both at the quota and by an interrupt: r4's record says what an interrupt records.
    const r4 = join(stopped.runs[3]?.outputDir ?? '', 'run.json');
    writeFileSync(r4, JSON.stringify({ ...JSON.parse(readFileSync(r4, 'utf8')), outcome: 'interrupted' }));
    const before = (k: number) =>
      readFileSync(join(stopped.runs[k - 1]?.outputDir ?? '', 'run.json'), 'utf8');
    const kept = [before(1), before(2)];

    // When the maintainer resumes it
    const resumed = doubles();
    const summary = await runCampaign(checked, resumed, { resume: stopped.execution });

    // Then only the failed, interrupted, quota-stopped and never-started runs run, in the same execution
    expect(summary.execution).toBe(stopped.execution);
    expect(summary.runs.map((r) => r.outputDir.split('/').at(-1))).toEqual(['r3', 'r4', 'r5', 'r6', 'r7']);
    expect(resumed.recorded.creates).toHaveLength(5);
    expect(summary.runs.every((r) => r.outcome === 'completed')).toBe(true);
    // And the run that reached its cap is not re-run, nor the completed one
    expect([before(1), before(2)]).toEqual(kept);
    // And each earlier attempt is kept beside the new one, and the number of attempts is recorded
    const dir = (k: number) => join(stopped.resultsDir, 'runs', 'T3@1.0', 'baseline', 'fake-model', `r${k}`);
    const record = (path: string) => JSON.parse(readFileSync(join(path, 'run.json'), 'utf8'));
    expect(record(join(dir(3), 'attempts', '1'))).toMatchObject({ outcome: 'failed', attempts: 1 });
    expect(record(join(dir(4), 'attempts', '1'))).toMatchObject({ outcome: 'interrupted' });
    expect(record(join(dir(5), 'attempts', '1'))).toMatchObject({ outcome: 'quota exhausted', attempts: 1 });
    for (const k of [3, 4, 5]) expect(record(dir(k))).toMatchObject({ outcome: 'completed', attempts: 2 });
    for (const k of [6, 7]) {
      expect(record(dir(k))).toMatchObject({ outcome: 'completed', attempts: 1 });
      expect(existsSync(join(dir(k), 'attempts'))).toBe(false);
    }
    expect(JSON.parse(readFileSync(join(stopped.resultsDir, 'execution.json'), 'utf8'))).toMatchObject({
      state: 'completed',
      resumed: [expect.any(String)],
    });
  });

  it('@F1.4 A resume is refused when it could mix results', async () => {
    const checked = cappedCampaign(3, 2, 100);
    const stopped = await runCampaign(checked, doubles());
    const target = `${checked.campaign.id}/${stopped.execution}`;

    // When the maintainer resumes an execution with a campaign file that changed
    const changed = join(checked.campaign.repoRoot, 'campaigns', 'changed.yaml');
    writeFileSync(
      changed,
      readFileSync(checked.campaign.file, 'utf8').replace('run_cost_eur: 3', 'run_cost_eur: 4'),
    );
    const ports = doubles();
    const mixed = await start(changed, ports, undefined, '--resume', target);
    // Then the resume is refused, naming the reason
    expect(mixed.code).toBe(1);
    expect(mixed.stderr).toContain(`is campaign ${loadIdOf(changed)}, not ${checked.campaign.id}`);
    expect(mixed.stderr).toContain('would mix results');

    // When the maintainer resumes an execution already aggregated
    writeFileSync(join(stopped.resultsDir, 'aggregate.json'), '{}\n');
    const aggregated = await start(checked.campaign.file, ports, undefined, '--resume', target);
    // Then the resume is refused, naming the reason
    expect(aggregated.code).toBe(1);
    expect(aggregated.stderr).toContain('is already aggregated');
    expect(ports.recorded.builds).toEqual([]);
  });

  it('@F1.4 Scoring a stopped execution keeps it resumable', async () => {
    // Given a stopped execution with runs never started: two of T3's three planned repetitions ran
    const stored = await storedRun({ steps: [{}, CANCEL] });
    await storedRun({ steps: [{}, CANCEL], into: { root: stored.root, repetition: 2 } });
    writeFileSync(
      join(stored.executionDir, 'campaign.yaml'),
      stringify({
        scenarios: [{ id: 'T3', version: '1.0' }],
        arms: ['baseline'],
        repetitions: { T3: 3 },
        models: { default: 'fake-model' },
        currency: { usd_to_eur: 0.5 },
      }),
    );
    writeFileSync(
      join(stored.executionDir, 'execution.json'),
      JSON.stringify({ state: 'stopped', reason: 'interrupt', started: '2026-10-12T08:00:00.000Z' }),
    );
    const score = async (...flags: string[]) => {
      let stdout = '';
      let stderr = '';
      const code = await main(
        ['score', EXECUTION, ...flags],
        { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
        { docker: scoringDocker().docker, git: gitCli(systemProcess), agent: doubles().agent },
        stored.root,
      );
      return { code, stdout, stderr };
    };

    // When the maintainer scores it
    const scored = await score();

    // Then its runs are scored but the execution is not aggregated
    expect(scored.code).toBe(0);
    expect(scored.stdout).toContain('T3@1.0 baseline fake-model r1');
    expect(scored.stdout).toContain('T3@1.0 baseline fake-model r2');
    expect(scored.stdout).toContain('not aggregated: execution 1 is stopped (interrupt)');
    expect(existsSync(join(stored.executionDir, 'aggregate.json'))).toBe(false);
    // and it can still be resumed
    expect(executionResumable(stored.executionDir).ok).toBe(true);

    // And only when the maintainer declares it final is it aggregated, the runs never started listed as not run
    const final = await score('--final');
    expect(final.code).toBe(0);
    const aggregate = JSON.parse(readFileSync(join(stored.executionDir, 'aggregate.json'), 'utf8'));
    expect(aggregate.not_run).toEqual(['T3@1.0/baseline/fake-model/r3']);
    expect(JSON.parse(readFileSync(join(stored.executionDir, 'execution.json'), 'utf8'))).toMatchObject({
      state: 'stopped',
      final: true,
    });
    expect(executionResumable(stored.executionDir).ok).toBe(false);
  });
  it('@F1.4 The ceiling covers every execution of a campaign', async () => {
    // Given a campaign whose earlier execution already spent part of its ceiling: two runs of T3 under a 6.5 EUR
    // ceiling, each run priced at 2 EUR by two dry runs; the first execution spent 3 EUR, its second run failing
    const file = budgetedRepository(2, { warn_eur: 6.5, ceiling_eur: 6.5 });
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replace('T3: 1', 'T3: 2').replace('run_cost_eur: 3', 'run_cost_eur: 10'),
    );
    const checked = loadCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    let run = 0;
    const first = await start(
      file,
      doubles({
        usageOf: () => spent(1),
        onStep: (request) => {
          if (request.step === 1) run += 1;
        },
        errorOf: (request) => (run === 2 && request.step === 1 ? 'the network failed' : undefined),
      }),
    );
    expect(first.stdout).toContain('1 run completed, 1 failed');

    // When the maintainer runs it again
    const again = doubles();
    const refused = await start(file, again);
    // Then the budget guard compares the ceiling with what every execution spent plus the highest estimate of what
    // is left: 3 EUR spent, 4 EUR for the whole campaign again
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain(
      'campaign: not started: the budget guard, 3.0000 + 4.0000 = 7.0000 EUR, is above the ceiling, 6.5 EUR',
    );
    expect(again.recorded.builds).toEqual([]);

    // When the maintainer resumes it: only the failed run is left, 2 EUR
    const resumed = doubles();
    const resume = await start(file, resumed, undefined, '--resume', `${checked.value.id}/1`);
    expect(resume.stdout).toContain('spent by earlier executions: 3.0000 EUR\n');
    expect(resume.stdout).toContain(
      'budget guard: 3.0000 + 2.0000 = 5.0000 EUR (warn 6.5 EUR, ceiling 6.5 EUR)\n',
    );
    expect(resume.code).toBe(0);
    expect(resumed.recorded.creates).toHaveLength(1);
  });
});

/** The identity of the campaign file `file`. */
function loadIdOf(file: string): string {
  const loaded = loadCampaign(file);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  return loaded.value.id;
}
