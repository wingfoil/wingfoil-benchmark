import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { armDigest } from '../../../src/arms/index.js';
import { main } from '../../../src/cli/index.js';
import { checkCampaign, checkDryRun, estimateCampaign, runCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { dryRunProfileYaml, priceCampaign, writeStoredDryRun } from '../../support/dry-run-fixture.js';
import { repoPath } from '../../support/paths.js';
import { doubles } from '../../support/runner-doubles.js';

/** A campaign of two plain arms, no harness, the fake agent. */
function campaign(digests?: Record<string, string>): Record<string, unknown> {
  return {
    ...completeCampaignYaml(),
    harnesses: {},
    arms: ['baseline', 'baseline-notes'],
    scenarios: [{ id: 'S1', version: '1.0' }],
    repetitions: { S1: 1 },
    agent: { name: 'fake', version: '1.0.0' },
    models: { default: 'fake-model' },
    ...(digests === undefined ? {} : { arm_digests: digests }),
  };
}

function git(root: string, ...args: string[]): string {
  return execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    encoding: 'utf8',
  }).trim();
}

/**
 * A repository whose campaign pins both arms' digests at commit `pinned`; then baseline-notes' manual changes and is
 * committed again, as the wingfoil arm moves to v0.3.0 while the bridge keeps v0.2.2's (task-095).
 */
function movedOn() {
  const { root, file } = writeRepo(campaign(), ['S1@1.0']);
  const digests = {
    baseline: armDigest(root, 'baseline').slice(0, 12),
    'baseline-notes': armDigest(root, 'baseline-notes').slice(0, 12),
  };
  writeFileSync(file, stringify(campaign(digests)));
  const before = readFileSync(join(root, 'arms', 'baseline-notes', 'manual.md'), 'utf8');
  git(root, 'init', '-q');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'pinned');
  const pinned = git(root, 'rev-parse', 'HEAD');
  writeFileSync(join(root, 'arms', 'baseline-notes', 'manual.md'), 'A manual for the next version.\n');
  git(root, 'commit', '-q', '-am', 'moved on');
  return { root, file, pinned, before, digests };
}

describe('an arm read by its pinned digest from history (REQ-FMT-13 as amended in 1.33, task-095)', () => {
  it('reads an arm the working tree has moved on from at the newest commit that holds its digest', () => {
    const { root, file, pinned, before } = movedOn();

    const checked = checkCampaign(file);

    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const notes = checked.value.arms.find((arm) => arm.name === 'baseline-notes');
    expect(notes?.from).toEqual({ commit: pinned, root: join(root, '.cache', 'arms', pinned) });
    expect(readFileSync(notes?.manualPath ?? '', 'utf8')).toBe(before);
    expect(notes?.dir).toBe(join(root, '.cache', 'arms', pinned, 'arms', 'baseline-notes'));
    // The arm whose files still digest to its pin is the working tree's.
    expect(checked.value.arms.find((arm) => arm.name === 'baseline')?.from).toBeUndefined();
  });

  it('still refuses a pinned digest no commit holds, as before', () => {
    const { file, digests } = movedOn();
    writeFileSync(file, stringify(campaign({ ...digests, 'baseline-notes': 'abcdef123456' })));

    const checked = checkCampaign(file);

    expect(checked.ok ? [] : checked.issues.map((issue) => issue.path)).toEqual([
      'arm_digests.baseline-notes',
    ]);
  });

  it("records where each run's arm was read in run.json (REQ-FMT-06 as amended in 1.33)", async () => {
    const { file, pinned } = movedOn();
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));

    const summary = await runCampaign(checked.value, doubles());

    const sources = Object.fromEntries(
      summary.runs.map((run) => {
        const record = JSON.parse(readFileSync(join(run.outputDir, 'run.json'), 'utf8')) as {
          arm: string;
          arm_source: unknown;
          arm_digest: string;
        };
        return [record.arm, { source: record.arm_source, digest: record.arm_digest.slice(0, 12) }];
      }),
    );
    expect(sources['baseline']?.source).toEqual({ tree: true });
    expect(sources['baseline-notes']?.source).toEqual({ commit: pinned });
    // The digest recorded is the arm's as it ran, the pinned one.
    expect(sources['baseline-notes']?.digest).toBe(
      (JSON.parse(JSON.stringify(checked.value.campaign.spec.arm_digests)) as Record<string, string>)[
        'baseline-notes'
      ],
    );
  });

  it('says on campaign validate which arm is read from history, naming its commit (REQ-FMT-01 as amended in 1.33)', async () => {
    const { file, pinned } = movedOn();
    let stdout = '';

    const code = await main(['campaign', 'validate', file], {
      stdout: (t) => (stdout += t),
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(stdout).toContain(
      `arm baseline-notes: read from commit ${pinned.slice(0, 12)}, which holds its pinned digest\n`,
    );
  });
});

describe('campaign run names the arms read from history (REQ-FMT-01 as amended in 1.33, review round 1)', () => {
  it('prints the same line as validate before anything is built', async () => {
    const { file, pinned } = movedOn();
    priceCampaign(file);
    vi.stubEnv('BENCH_FAKE_SCRIPT', repoPath('test/fixtures/fake-script.json'));
    onTestFinished(() => {
      vi.unstubAllEnvs();
    });
    const ports = doubles();
    let stdout = '';

    await main(
      ['campaign', 'run', file],
      { stdout: (t) => (stdout += t), stderr: () => undefined },
      {
        docker: ports.docker,
        git: ports.git,
        agent: ports.agent,
      },
    );

    expect(stdout).toContain(
      `arm baseline-notes: read from commit ${pinned.slice(0, 12)}, which holds its pinned digest\n`,
    );
  });
});

describe('dry runs and the estimate by the pinned arm (task-095 review round 1)', () => {
  function profile(root: string, digests?: Record<string, string>): void {
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    writeFileSync(
      join(root, 'scenarios', 'dry-run.yaml'),
      stringify({
        ...dryRunProfileYaml(),
        harnesses: {},
        ...(digests === undefined ? {} : { arm_digests: digests }),
      }),
    );
  }

  it("reads a dry run's arm by the digest its profile pins, and gives it another identity than the tree's", () => {
    const { root, pinned, digests } = movedOn();
    profile(root);
    const tree = checkDryRun({ id: 'S1', version: '1.0', arm: 'baseline-notes' }, root);
    profile(root, { 'baseline-notes': digests['baseline-notes'] });
    const old = checkDryRun({ id: 'S1', version: '1.0', arm: 'baseline-notes' }, root);

    if (!tree.ok || !old.ok) throw new Error(JSON.stringify([tree, old]));
    expect(tree.value.arm.from).toBeUndefined();
    expect(old.value.arm.from?.commit).toBe(pinned);
    expect(old.value.id).not.toBe(tree.value.id);
  });

  it('refuses a dry run whose profile pins a digest no commit holds', () => {
    const { root } = movedOn();
    profile(root, { 'baseline-notes': 'abcdef123456' });
    const checked = checkDryRun({ id: 'S1', version: '1.0', arm: 'baseline-notes' }, root);
    expect(checked.ok ? [] : checked.issues.map((issue) => issue.path)).toEqual([
      'arm_digests.baseline-notes',
    ]);
  });

  it('counts for the estimate only a dry run of the arm the campaign pins, by its recorded digest', () => {
    const { file, digests } = movedOn();
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const root = checked.value.campaign.repoRoot;
    const hash = checked.value.scenarios[0]?.hash ?? '';
    const pinned = digests['baseline-notes'];
    const other = 'f'.repeat(64);
    writeStoredDryRun(root, 1, {
      id: 'S1',
      hash,
      arm: 'baseline-notes',
      stepCostsUsd: [1],
      armDigest: other,
    });
    writeStoredDryRun(root, 2, { id: 'S1', hash, arm: 'baseline', stepCostsUsd: [1] });

    const first = estimateCampaign(checked.value);
    expect(first.ok ? [] : first.issues.map((issue) => issue.message).join('\n')).toMatch(
      new RegExp(`dry run 1 ran arm baseline-notes at digest ffffffffffff, the campaign pins ${pinned}`),
    );
    writeStoredDryRun(root, 3, {
      id: 'S1',
      hash,
      arm: 'baseline-notes',
      stepCostsUsd: [2],
      armDigest: `${pinned}${'0'.repeat(52)}`,
    });
    expect(estimateCampaign(checked.value).ok).toBe(true);
  });

  it('works for an arm the working tree no longer has at all', () => {
    const { root, file, pinned } = movedOn();
    rmSync(join(root, 'arms', 'baseline-notes'), { recursive: true });
    git(root, 'commit', '-q', '-am', 'removed');

    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    expect(checked.value.arms.find((arm) => arm.name === 'baseline-notes')?.from?.commit).toBe(pinned);
  });

  it('reuses a cached arm that already digests to the pin, writing nothing (review round 2)', () => {
    const { root, file, pinned } = movedOn();
    expect(checkCampaign(file).ok).toBe(true);
    const manual = join(root, '.cache', 'arms', pinned, 'arms', 'baseline-notes', 'manual.md');
    const before = statSync(manual).mtimeMs;
    const inode = statSync(manual).ino;

    expect(checkCampaign(file).ok).toBe(true);

    expect([statSync(manual).ino, statSync(manual).mtimeMs]).toEqual([inode, before]);
  });

  it('rewrites a stale copy of an arm read from history rather than reading it', () => {
    const { root, file, pinned } = movedOn();
    expect(checkCampaign(file).ok).toBe(true);
    writeFileSync(
      join(root, '.cache', 'arms', pinned, 'arms', 'baseline-notes', 'stray.txt'),
      'left behind\n',
    );

    expect(checkCampaign(file).ok).toBe(true);
    expect(existsSync(join(root, '.cache', 'arms', pinned, 'arms', 'baseline-notes', 'stray.txt'))).toBe(
      false,
    );
  });
});

describe('the WingFoil the register admits (task-095 review round 1)', () => {
  it('refuses a campaign pinning WingFoil v0.3.1, which the register has not assessed', () => {
    const reference = readFileSync(repoPath('campaigns/v0-2-reference.yaml'), 'utf8');
    const file = repoPath('campaigns/x-test-task-095-v0-3-1.yaml');
    writeFileSync(file, reference.replace('version: v0.3.0', 'version: v0.3.1'));
    onTestFinished(() => rmSync(file, { force: true }));

    const checked = checkCampaign(file);

    expect(checked.ok ? '' : JSON.stringify(checked.issues)).toContain('v0.3.1');
  });
});

describe('the estimate by the harness version a dry run ran (task-095 review round 2)', () => {
  /** A campaign of baseline, wingfoil and its docs control, WingFoil pinned at `version`. */
  function wingfoilCampaign(version: string) {
    const yaml = {
      ...completeCampaignYaml(),
      harnesses: { wingfoil: { tool: 'wingfoil', version } },
      arms: ['baseline', 'baseline-docs', 'wingfoil'],
      scenarios: [{ id: 'S1', version: '1.0' }],
      repetitions: { S1: 1 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
    };
    const { root, file } = writeRepo(yaml, ['S1@1.0']);
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    return { root, checked: checked.value };
  }

  /** A stored dry run of `arm` whose stored profile pinned WingFoil at `version` (and `commit`, if given). */
  function dryRunOn(
    root: string,
    execution: number,
    arm: string,
    hash: string,
    version: string,
    commit?: string,
  ): void {
    const dir = writeStoredDryRun(root, execution, { id: 'S1', hash, arm, stepCostsUsd: [1] });
    writeFileSync(
      join(dir, 'dry-run.yaml'),
      stringify({
        ...dryRunProfileYaml(),
        harnesses: { wingfoil: { tool: 'wingfoil', version, ...(commit === undefined ? {} : { commit }) } },
      }),
    );
  }

  it('counts a dry run whose profile also named the commit of the version the campaign pins (review round 3)', () => {
    const { root, checked } = wingfoilCampaign('v0.2.2');
    const hash = checked.scenarios[0]?.hash ?? '';
    const sha = '12537b627ce0517222da762e8fa90997a1208a4b';
    dryRunOn(root, 1, 'baseline', hash, 'v0.2.2', sha);
    dryRunOn(root, 2, 'wingfoil', hash, 'v0.2.2', sha);
    dryRunOn(root, 3, 'baseline-docs', hash, 'v0.2.2', sha);

    const estimate = estimateCampaign(checked);
    expect(estimate.ok ? '' : JSON.stringify(estimate.issues)).toBe('');
  });

  it('counts for a harness arm, and for its docs control, only a dry run made on the WingFoil the campaign pins', () => {
    const { root, checked } = wingfoilCampaign('v0.2.2');
    const hash = checked.scenarios[0]?.hash ?? '';
    dryRunOn(root, 1, 'baseline', hash, '3df305e');
    dryRunOn(root, 2, 'wingfoil', hash, '3df305e');
    dryRunOn(root, 3, 'baseline-docs', hash, '3df305e');

    const refused = estimateCampaign(checked);
    const messages = refused.ok ? '' : refused.issues.map((issue) => issue.message).join('\n');
    expect(messages).toContain('dry run 2 ran wingfoil 3df305e, the campaign pins v0.2.2');
    expect(messages).toContain('dry run 3 ran wingfoil 3df305e, the campaign pins v0.2.2');
    // The baseline requires no harness: its dry run counts whatever WingFoil its profile named.
    expect(messages).not.toMatch(/in arm baseline on/);

    dryRunOn(root, 4, 'wingfoil', hash, 'v0.2.2');
    dryRunOn(root, 5, 'baseline-docs', hash, 'v0.2.2');
    expect(estimateCampaign(checked).ok).toBe(true);
  });
});
