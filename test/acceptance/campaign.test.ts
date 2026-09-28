import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stringify } from 'yaml';

import { loadCampaign } from '../../src/campaign/index.js';
import { checkCampaign, main } from '../../src/cli/index.js';
import { nextExecution } from '../../src/results/index.js';
import { writeArmsNamed } from '../support/arm-fixture.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';
import { writeDryRunProfile } from '../support/dry-run-fixture.js';
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
});
