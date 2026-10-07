import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkCampaign, main } from '../../../src/cli/index.js';
import { parseDryRunArguments } from '../../../src/cli/dry-run.js';
import { runCampaign } from '../../../src/runner/index.js';
import type { RunOnceRequest } from '../../../src/core/index.js';
import { writeArmsNamed } from '../../support/arm-fixture.js';
import { completeCampaignYaml } from '../../support/campaign-fixture.js';
import { dryRunProfileYaml, writeDryRunProfile } from '../../support/dry-run-fixture.js';
import { repoPath } from '../../support/paths.js';
import { doubles } from '../../support/runner-doubles.js';
import type { Doubles } from '../../support/runner-doubles.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SHA = '3df305ea198d7e2ca0da73bfb12b14af865e9922';

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A repository with T3, the leak-scan declarations, the three arms and a dry-run profile. */
function repository(profile: Record<string, unknown> | string | null = dryRunProfileYaml()): string {
  const root = tempDir('bench-repo-');
  cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
  copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
  writeArmsNamed(root, ['baseline', 'baseline-docs', 'wingfoil']);
  if (profile !== null) writeDryRunProfile(root, profile);
  return root;
}

/** A harness build and a wingfoil snapshot that write what the real ones write. */
function oneOff(request: RunOnceRequest): void {
  const out = join(request.mount.source, 'out');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'wingfoil-0.1.0.tgz'), 'tarball');
  writeFileSync(join(out, 'installed.tgz'), 'installed');
}

function ports(extra: Parameters<typeof doubles>[0] = {}): Doubles {
  return doubles({ commits: { '3df305e': SHA }, onRunOnce: oneOff, ...extra });
}

async function dryRun(root: string, argv: readonly string[], p: Doubles | undefined = ports()) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    ['scenario', 'dry-run', ...argv],
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    p,
    root,
  );
  return { code, stdout, stderr };
}

function runJson(
  root: string,
  execution: number,
  arm: string,
  model = 'fake-model',
): Record<string, unknown> {
  const file = join(
    root,
    'results',
    'dry-runs',
    String(execution),
    'runs',
    'T3@1.0',
    arm,
    model,
    'r1',
    'run.json',
  );
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

describe('bench scenario dry-run: its arguments (REQ-CLI-05)', () => {
  it('takes a scenario version, an arm, and optionally a model and the spending flag, in any order', () => {
    expect(parseDryRunArguments(['T3@1.0', '--arm', 'baseline'])).toEqual({
      id: 'T3',
      version: '1.0',
      arm: 'baseline',
      allowSpending: false,
    });
    expect(
      parseDryRunArguments([
        'T3@1.0',
        '--allow-spending',
        '--model',
        'claude-haiku-4-5',
        '--arm',
        'wingfoil',
      ]),
    ).toEqual({ id: 'T3', version: '1.0', arm: 'wingfoil', model: 'claude-haiku-4-5', allowSpending: true });
  });

  it.each([
    [[]],
    [['T3']],
    [['T3@1.0']],
    [['T3@1.0', '--arm']],
    [['T3@1.0', '--arm', '--model', 'm']],
    [['T3@1.0', '--arm', 'baseline', '--arm', 'wingfoil']],
    [['T3@1.0', '--arm', 'baseline', '--model', 'a', '--model', 'b']],
    [['T3@1.0', '--arm', 'baseline', '--allow-spending', '--allow-spending']],
    [['T3@1.0', '--arm', 'baseline', '--holdout', '/h']],
    [['T3@1.0', '--arm', 'baseline', 'extra']],
    [['--arm', 'baseline', 'T3@1.0']],
  ])('exits 2 with the usage on %j', async (argv) => {
    const result = await dryRun(repository(), argv);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/^usage: bench/);
  });
});

describe('bench scenario dry-run: the checks before anything is built (task-021 Design)', () => {
  it('needs the profile, and names it', async () => {
    const root = repository(null);
    const p = ports();
    expect(await dryRun(root, ['T3@1.0', '--arm', 'baseline'], p)).toEqual({
      code: 1,
      stdout: '',
      stderr: `dry-run.yaml: not found in ${join(root, 'scenarios')}\n`,
    });
    expect(p.recorded.builds).toEqual([]);
  });

  it('checks a model given on the command line as a campaign checks one', async () => {
    const result = await dryRun(repository(), ['T3@1.0', '--arm', 'baseline', '--model', 'Fake Model']);
    expect(result).toMatchObject({ code: 1, stderr: expect.stringMatching(/^--model: must be a model id/) });
  });

  it('refuses a version that does not load, and names what is wrong', async () => {
    const result = await dryRun(repository(), ['T3@2.0', '--arm', 'baseline']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/^scenario\.yaml: not found in .*T3\/2\.0\n$/);
  });

  it('refuses a version that changed since a campaign ran it (REQ-FMT-09)', async () => {
    const root = repository();
    mkdirSync(join(root, 'campaigns'));
    const file = join(root, 'campaigns', 'c.yaml');
    writeFileSync(
      file,
      stringify({
        ...completeCampaignYaml(),
        harnesses: {},
        arms: ['baseline'],
        scenarios: [{ id: 'T3', version: '1.0' }],
        repetitions: { T3: 1 },
        agent: { name: 'fake', version: '1.0.0' },
        models: { default: 'fake-model' },
      }),
    );
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    await runCampaign(checked.value, doubles());
    writeFileSync(join(root, 'scenarios', 'T3', '1.0', 'prompts', '02.md'), 'Something else.\n');

    const result = await dryRun(root, ['T3@1.0', '--arm', 'baseline']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/^scenario: T3@1\.0 has changed since results\/.* ran it/);
  });

  it('refuses a version the leak scan rejects, without reading the hold-out', async () => {
    const root = repository();
    writeFileSync(join(root, 'scenarios', 'T3', '1.0', 'prompts', '01.md'), 'Use WingFoil for this.\n');
    // A hold-out configured by the variable is never read by a run (REQ-CLI-10): a path that does not
    // exist changes nothing.
    vi.stubEnv('BENCH_HOLDOUT_PATH', join(root, 'no-such-holdout'));
    const result = await dryRun(root, ['T3@1.0', '--arm', 'baseline']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/^steps\[0\]\.prompt_file: names the harness/);
  });

  it('refuses an arm that has no definition', async () => {
    const result = await dryRun(repository(), ['T3@1.0', '--arm', 'openspec']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/^--arm: openspec: arm\.yaml not found in /);
  });

  it('needs the wingfoil arm for baseline-docs, which is generated from it', async () => {
    const root = repository();
    rmSync(join(root, 'arms', 'wingfoil'), { recursive: true });
    const result = await dryRun(root, ['T3@1.0', '--arm', 'baseline-docs']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(
      /^arms: wingfoil \(baseline-docs is generated from it\): arm\.yaml not found/,
    );
  });

  it('needs the harness of the arms it loads, and only theirs', async () => {
    const root = repository({ ...dryRunProfileYaml(), harnesses: {} });
    expect(await dryRun(root, ['T3@1.0', '--arm', 'wingfoil'])).toMatchObject({
      code: 1,
      stderr: "harnesses.wingfoil: is required: the arm requires the harness 'wingfoil'\n",
    });
    // A baseline dry run neither needs the harness the profile pins for wingfoil, nor its clone.
    vi.stubEnv('BENCH_WINGFOIL_REPO', '');
    expect((await dryRun(repository(), ['T3@1.0', '--arm', 'baseline'])).code).toBe(0);
  });

  it('runs a real agent only with --allow-spending, then only with its credential', async () => {
    const root = repository({ ...dryRunProfileYaml(), agent: { name: 'claude-code', version: '2.1.280' } });
    const p = ports();
    expect(await dryRun(root, ['T3@1.0', '--arm', 'baseline'], p)).toEqual({
      code: 1,
      stdout: '',
      stderr:
        "dry run: agent 'claude-code' spends real money, up to the run's cap of 1 EUR; " +
        'pass --allow-spending to run it\n',
    });
    vi.stubEnv('BENCH_AGENT_TOKEN_FILE', '');
    expect(await dryRun(root, ['T3@1.0', '--arm', 'baseline', '--allow-spending'], p)).toMatchObject({
      code: 1,
      stderr: expect.stringMatching(/^BENCH_AGENT_TOKEN_FILE: is not set/),
    });
    expect(p.recorded.builds).toEqual([]);
  });

  it('runs a real agent only at an effort the profile pins for its model (dl-015, task-069)', async () => {
    const root = repository({ ...dryRunProfileYaml(), agent: { name: 'claude-code', version: '2.1.280' } });
    const token = join(tempDir('bench-token-'), 'token');
    writeFileSync(token, 'not-a-real-token\n');
    vi.stubEnv('BENCH_AGENT_TOKEN_FILE', token);
    const p = ports();
    expect(await dryRun(root, ['T3@1.0', '--arm', 'baseline', '--allow-spending'], p)).toEqual({
      code: 1,
      stdout: '',
      stderr:
        'agent.effort.fake-model: is required for a real agent: the effort it runs fake-model at ' +
        '(low, medium, high, xhigh, max, none)\n',
    });
    expect(p.recorded.builds).toEqual([]);
  });

  it('needs the WingFoil clone for an arm that builds WingFoil', async () => {
    vi.stubEnv('BENCH_WINGFOIL_REPO', '');
    const result = await dryRun(repository(), ['T3@1.0', '--arm', 'wingfoil']);
    expect(result).toMatchObject({
      code: 1,
      stderr: expect.stringMatching(/^BENCH_WINGFOIL_REPO: is not set/),
    });
  });
});

describe('bench scenario dry-run: the run (F3.3, REQ-RES-01, REQ-NFR-06)', () => {
  it('runs baseline-docs alone, with its environment generated from the wingfoil arm', async () => {
    vi.stubEnv('BENCH_WINGFOIL_REPO', '/clones/wingfoil');
    const root = repository();
    const p = ports();
    const result = await dryRun(root, ['T3@1.0', '--arm', 'baseline-docs'], p);

    expect(result.code).toBe(0);
    expect(p.recorded.creates.map((create) => create.name)).toEqual([
      expect.stringMatching(/^bench-dry-[0-9a-f]{12}-1-T3-1\.0-baseline-docs-fake-model-r1$/),
    ]);
    // The harness was built and the wingfoil configuration snapshotted: two one-off containers.
    expect(p.recorded.runOnce).toHaveLength(2);
    expect(runJson(root, 1, 'baseline-docs')).toMatchObject({ dry_run: true, arm: 'baseline-docs' });
  });

  it('records the run as a dry run, with its profile, and never as a campaign', async () => {
    const root = repository();
    await dryRun(root, ['T3@1.0', '--arm', 'baseline', '--model', 'other-model']);
    const record = runJson(root, 1, 'baseline', 'other-model');
    expect(record).toMatchObject({
      dry_run: true,
      model: 'other-model',
      agent: { name: 'fake', version: '1.0.0' },
      approver_policy: 'v1',
    });
    expect(record).not.toHaveProperty('campaign');
    expect(readFileSync(join(root, 'results', 'dry-runs', '1', 'dry-run.yaml'), 'utf8')).toBe(
      readFileSync(join(root, 'scenarios', 'dry-run.yaml'), 'utf8'),
    );
    // Its workspace goes where a campaign's does, under the dry runs' own directory.
    expect(existsUnder(join(root, 'runs', 'dry-runs', '1', 'T3@1.0', 'baseline', 'other-model', 'r1'))).toBe(
      true,
    );
  });

  it('has an identity that follows what it pins', async () => {
    const root = repository();
    const first = ports();
    await dryRun(root, ['T3@1.0', '--arm', 'baseline'], first);
    const again = ports();
    await dryRun(root, ['T3@1.0', '--arm', 'baseline'], again);
    const other = ports();
    await dryRun(root, ['T3@1.0', '--arm', 'baseline', '--model', 'other-model'], other);

    expect(again.recorded.builds).toEqual(first.recorded.builds);
    expect(other.recorded.builds).not.toEqual(first.recorded.builds);
    expect(first.recorded.builds[0]).toMatch(/^dry-[0-9a-f]{12}$/);
    // Numbered like a campaign's executions.
    expect(again.recorded.creates[0]?.name).toMatch(/-2-T3-1\.0-baseline-fake-model-r1$/);
  });

  it('prints what it expects to spend before it starts, and what it spent when it ends', async () => {
    const root = repository();
    const costly = (costUsd: number) =>
      ports({
        usageOf: (request) => ({
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
          costUsd: costUsd * request.step,
          costEur: 0,
          turns: 1,
          durationMs: 1,
        }),
      });
    const first = await dryRun(root, ['T3@1.0', '--arm', 'baseline'], costly(0.01));
    expect(first.stdout.split('\n')[0]).toBe(
      'dry run T3@1.0 in baseline on fake-model: no dry run yet; this one may spend up to its cap, 1 EUR',
    );
    expect(first.stdout).toContain(
      'dry run T3@1.0 in baseline: completed, 0.0300 USD (0.0150 EUR) — step 01 0.0100 USD, step 02 ' +
        '0.0200 USD — results/dry-runs/1\n',
    );

    const second = await dryRun(root, ['T3@1.0', '--arm', 'baseline'], costly(0.02));
    expect(second.stdout.split('\n')[0]).toBe(
      'dry run T3@1.0 in baseline on fake-model: the latest dry run cost 0.0300 USD (0.0150 EUR) ' +
        '(results/dry-runs/1)',
    );
  });

  it('exits 1 when the run fails, and keeps it: a failed dry run is stored, and never counts', async () => {
    const root = repository();
    const result = await dryRun(
      root,
      ['T3@1.0', '--arm', 'baseline'],
      ports({ errorOf: (request) => (request.step === 2 ? 'the session broke' : undefined) }),
    );
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/dry run T3@1\.0 in baseline: failed, .* — results\/dry-runs\/1\n$/);
    expect(runJson(root, 1, 'baseline')).toMatchObject({ dry_run: true, outcome: 'failed' });
    const next = await dryRun(root, ['T3@1.0', '--arm', 'baseline']);
    expect(next.stdout).toContain('no dry run yet');
  });

  it('reports a dry run that cannot start at all', async () => {
    const root = repository();
    const result = await dryRun(
      root,
      ['T3@1.0', '--arm', 'baseline'],
      ports({ failing: { call: 'list', error: 'no daemon' } }),
    );
    expect(result).toMatchObject({ code: 1, stderr: 'dry run: no daemon\n' });
  });
});

describe('a campaign run, after the runner took plans (task-021)', () => {
  it('still records the campaign it belonged to, and no dry-run mark', async () => {
    const root = repository();
    mkdirSync(join(root, 'campaigns'));
    const file = join(root, 'campaigns', 'c.yaml');
    writeFileSync(
      file,
      stringify({
        ...completeCampaignYaml(),
        harnesses: {},
        arms: ['baseline'],
        scenarios: [{ id: 'T3', version: '1.0' }],
        repetitions: { T3: 1 },
        agent: { name: 'fake', version: '1.0.0' },
        models: { default: 'fake-model' },
      }),
    );
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const summary = await runCampaign(checked.value, doubles());
    const record = JSON.parse(
      readFileSync(join(summary.runs[0]?.outputDir ?? '', 'run.json'), 'utf8'),
    ) as object;
    expect(record).toMatchObject({ campaign: checked.value.campaign.id });
    expect(record).not.toHaveProperty('dry_run');
  });
});

function existsUnder(dir: string): boolean {
  try {
    readFileSync(join(dir, 'workspace', 'README.md'));
    return true;
  } catch {
    return false;
  }
}
