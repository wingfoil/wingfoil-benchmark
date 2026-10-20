import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { armDigest } from '../../../src/arms/index.js';
import { main } from '../../../src/cli/index.js';
import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
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
