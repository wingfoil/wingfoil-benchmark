import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import type { RunOnceRequest } from '../../../src/core/index.js';
import { plainArmYaml } from '../../support/arm-fixture.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { doubles } from '../../support/runner-doubles.js';

const SHA = '3df305ea198d7e2ca0da73bfb12b14af865e9922';
const CLONE = '/clones/wingfoil';

function campaignYaml(): Record<string, unknown> {
  return {
    ...completeCampaignYaml(),
    harnesses: { wingfoil: { tool: 'wingfoil', version: '3df305e' } },
    arms: ['baseline', 'wingfoil'],
    scenarios: [{ id: 'S1', version: '1.0' }],
    repetitions: { S1: 1 },
    agent: { name: 'fake', version: '1.0.0' },
    models: { default: 'fake-model' },
  };
}

function checked(yaml = campaignYaml(), change?: (root: string) => void) {
  const { root, file } = writeRepo(yaml, ['S1@1.0']);
  change?.(root);
  const result = checkCampaign(file);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return { root, checked: result.value };
}

/** A build that writes what the real one writes: the npm tarball and the installed artefact. */
function build(request: RunOnceRequest): void {
  mkdirSync(join(request.mount.source, 'out'), { recursive: true });
  writeFileSync(join(request.mount.source, 'out', 'wingfoil-0.1.0.tgz'), 'tarball');
  writeFileSync(join(request.mount.source, 'out', 'installed.tgz'), 'installed');
}

function ports(extra: Parameters<typeof doubles>[0] = {}) {
  return doubles({ commits: { '3df305e': SHA }, onRunOnce: build, ...extra });
}

describe('the WingFoil under test (REQ-RUN-14, adr-003 decisions 1-5)', () => {
  it('builds it once, from the clone by SHA, in the campaign image, before any run', async () => {
    const { root, checked: campaign } = checked();
    const p = ports();

    await runCampaign(campaign, { ...p, harnessSources: { wingfoil: CLONE } });

    expect(p.recorded.gitCalls.slice(0, 2)).toEqual([`resolve ${CLONE} 3df305e`, `archive ${CLONE} ${SHA}`]);
    expect(p.recorded.runOnce).toHaveLength(1);
    expect(p.recorded.runOnce[0]?.image).toBe(campaign.campaign.id);
    expect(p.recorded.runOnce[0]?.mount).toEqual({
      source: join(root, '.cache', 'harness', 'wingfoil', SHA, 'build'),
      target: '/build',
    });
    // The build ran before the first container was created.
    expect(p.recorded.creates).toHaveLength(2);
    // The build directory is gone; the artefact and its record stay, keyed by the full SHA.
    const cache = join(root, '.cache', 'harness', 'wingfoil', SHA);
    expect(existsSync(join(cache, 'build'))).toBe(false);
    expect(readFileSync(join(cache, 'installed.tgz'), 'utf8')).toBe('installed');
    expect(JSON.parse(readFileSync(join(cache, 'harness.json'), 'utf8'))).toEqual({
      tool: 'wingfoil',
      commit: SHA,
      tarball_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      installed_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('gives the artefact to the runs of an arm that requires it, and only to them', async () => {
    const { root, checked: campaign } = checked();
    const p = ports();

    await runCampaign(campaign, { ...p, harnessSources: { wingfoil: CLONE } });

    const installed = join(root, '.cache', 'harness', 'wingfoil', SHA, 'installed.tgz');
    expect(p.recorded.copies.filter((copy) => copy.endsWith('/home/node/harness.tgz'))).toEqual([
      `${installed} -> container-2:/home/node/harness.tgz`,
    ]);
  });

  it('records the harness in run.json: the full commit and both digests', async () => {
    const { checked: campaign } = checked();
    const p = ports();

    const summary = await runCampaign(campaign, { ...p, harnessSources: { wingfoil: CLONE } });

    const record = (arm: string) =>
      JSON.parse(
        readFileSync(join(summary.runs.find((run) => run.arm === arm)?.outputDir ?? '', 'run.json'), 'utf8'),
      ) as { harness?: Record<string, string> };
    expect(record('wingfoil').harness).toEqual({
      tool: 'wingfoil',
      commit: SHA,
      tarball_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      installed_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(record('baseline').harness).toBeUndefined();
  });

  it('reuses a cached artefact whose digest still matches, and rebuilds one that does not', async () => {
    const { root, checked: campaign } = checked();
    await runCampaign(campaign, { ...ports(), harnessSources: { wingfoil: CLONE } });

    const again = ports();
    await runCampaign(campaign, { ...again, harnessSources: { wingfoil: CLONE } });
    expect(again.recorded.runOnce).toHaveLength(0);

    writeFileSync(join(root, '.cache', 'harness', 'wingfoil', SHA, 'installed.tgz'), 'tampered');
    const third = ports();
    await runCampaign(campaign, { ...third, harnessSources: { wingfoil: CLONE } });
    expect(third.recorded.runOnce).toHaveLength(1);
  });

  it('does not start a campaign whose pinned commit is not in the clone, naming both', async () => {
    const { checked: campaign } = checked();
    const p = ports({ commits: {} });

    await expect(runCampaign(campaign, { ...p, harnessSources: { wingfoil: CLONE } })).rejects.toThrow(
      `the wingfoil harness pins 3df305e, which is not a commit of ${CLONE}`,
    );
    expect(p.recorded.creates).toEqual([]);
  });

  it('does not start a campaign whose harness has no clone configured', async () => {
    const { checked: campaign } = checked();
    const p = ports();

    await expect(runCampaign(campaign, p)).rejects.toThrow(
      'the wingfoil harness of arm wingfoil needs a local clone of wingfoil, and none is configured',
    );
    expect(p.recorded.creates).toEqual([]);
  });

  it('does not start a campaign whose harness tool has no builder, rather than run without it', async () => {
    const yaml = campaignYaml();
    yaml.harnesses = { wingfoil: { tool: 'openspec', version: '1.0.0' } };
    const { checked: campaign } = checked(yaml, (root) =>
      writeFileSync(
        join(root, 'arms', 'wingfoil', 'arm.yaml'),
        stringify({ ...plainArmYaml('wingfoil'), requires: 'openspec' }),
      ),
    );

    await expect(runCampaign(campaign, { ...ports(), harnessSources: { openspec: CLONE } })).rejects.toThrow(
      "the harness 'openspec' of arm wingfoil has no builder in this runner",
    );
  });

  it('does not start a campaign whose build fails, keeping the end of its output', async () => {
    const { checked: campaign } = checked();
    const p = ports({
      runOnceResult: { code: 1, stdout: '', stderr: 'npm ERR! code E404\nnpm ERR! 404 Not Found\n' },
    });

    await expect(runCampaign(campaign, { ...p, harnessSources: { wingfoil: CLONE } })).rejects.toThrow(
      `building wingfoil ${SHA} failed with code 1: npm ERR! code E404\nnpm ERR! 404 Not Found`,
    );
  });

  it("copies a scenario's configuration for an arm to that arm's container only (dl-005)", async () => {
    const { root, checked: campaign } = checked(campaignYaml(), (repo) =>
      mkdirSync(join(repo, 'scenarios', 'S1', '1.0', 'arms', 'wingfoil', '.wingfoil'), { recursive: true }),
    );
    const p = ports();

    await runCampaign(campaign, { ...p, harnessSources: { wingfoil: CLONE } });

    expect(p.recorded.copies.filter((copy) => copy.endsWith('/home/node/scenario'))).toEqual([
      `${join(root, 'scenarios', 'S1', '1.0', 'arms', 'wingfoil')} -> container-2:/home/node/scenario`,
    ]);
  });

  it('names only the exit code of a build that failed without a word', async () => {
    const { checked: campaign } = checked();
    const p = ports({ runOnceResult: { code: 2, stdout: '', stderr: '' } });

    await expect(runCampaign(campaign, { ...p, harnessSources: { wingfoil: CLONE } })).rejects.toThrow(
      new RegExp(`^building wingfoil ${SHA} failed with code 2$`),
    );
  });

  it('does not start a campaign whose build produced no tarball', async () => {
    const { checked: campaign } = checked();
    const p = ports({
      onRunOnce: (request) => mkdirSync(join(request.mount.source, 'out'), { recursive: true }),
    });

    await expect(runCampaign(campaign, { ...p, harnessSources: { wingfoil: CLONE } })).rejects.toThrow(
      `building wingfoil ${SHA} produced no tarball`,
    );
  });

  it('refuses an arm that requires a tool and pins no harness, if one reaches the runner unchecked', async () => {
    const { checked: campaign } = checked();
    const unchecked = {
      ...campaign,
      campaign: { ...campaign.campaign, spec: { ...campaign.campaign.spec, harnesses: {} } },
    };

    await expect(runCampaign(unchecked, { ...ports(), harnessSources: { wingfoil: CLONE } })).rejects.toThrow(
      "arm wingfoil requires 'wingfoil' and pins no harness",
    );
  });
});
