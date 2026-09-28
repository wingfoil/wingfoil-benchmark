import { copyFileSync, cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { main } from '../../src/cli/index.js';
import { checkCampaign, runCampaign } from '../../src/runner/index.js';
import { latestDryRun } from '../../src/results/index.js';
import { loadScenario } from '../../src/scenario/index.js';
import { writeArmsNamed } from '../support/arm-fixture.js';
import { completeCampaignYaml } from '../support/campaign-fixture.js';
import { writeDryRunProfile } from '../support/dry-run-fixture.js';
import { doubles, invocationOf } from '../support/runner-doubles.js';
import { repoPath } from '../support/paths.js';
import { tempDir, writeScenario } from '../support/scenario-fixture.js';

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
    expect(scenario.oracle.publicTestsDir).toBe(join(dir, 'oracle/public'));
    expect(scenario.categories).toEqual({ primary: 'C', secondary: ['D'] });
    expect(scenario.profiles).toEqual(['solo-developer', 'team-developer']);
    expect(scenario.gqm).toEqual(['Q-C1', 'G-X1']);
    expect(scenario.capabilities).toEqual(['workflow-engine']);
  });

  it('@F3.2 A well-formed scenario passes the validator', async () => {
    // Given scenario S1 as specified — T3, with its hold-out additions
    const root = repository();
    const additions = holdout({ 'hidden/refund.test.ts': "expect(refund(o)).toBe('refunded in full');\n" });

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
    const additions = holdout({ 'hidden/refund.test.ts': `expect(refund(o)).toBe('${secret}');\n` });

    // When the maintainer validates S2 with the hold-out path configured
    const result = await validate(root, '--holdout', additions);

    // Then validation fails, and the message names the file and the step, without printing the
    // hold-out content
    expect(result).toEqual({
      code: 1,
      stdout: '',
      stderr: 'steps[0].prompt_file: holds a literal of the hold-out file hidden/refund.test.ts\n',
    });
    expect(result.stderr).not.toContain('4417');
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
});
