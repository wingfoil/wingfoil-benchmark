import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { renderProjectRules } from '../../../src/arms/index.js';
import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { doubles, fakeBuild } from '../../support/runner-doubles.js';

const CLONE = '/clones/wingfoil';

function campaignYaml(
  arms = ['baseline', 'baseline-docs', 'wingfoil'],
  scenarios = ['S1'],
): Record<string, unknown> {
  return {
    ...completeCampaignYaml(),
    harnesses: arms.includes('wingfoil') ? { wingfoil: { tool: 'wingfoil', version: '3df305e' } } : {},
    arms,
    scenarios: scenarios.map((id) => ({ id, version: '1.0' })),
    repetitions: Object.fromEntries(scenarios.map((id) => [id, 1])),
    agent: { name: 'fake', version: '1.0.0' },
    models: { default: 'fake-model' },
  };
}

function checked(yaml = campaignYaml(), scenarios = ['S1@1.0'], change?: (root: string) => void) {
  const { root, file } = writeRepo(yaml, scenarios);
  change?.(root);
  const result = checkCampaign(file);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return { root, checked: result.value };
}

describe('the baseline-docs environment, generated per scenario (REQ-RUN-11)', () => {
  it("snapshots the wingfoil configuration by running the wingfoil arm's own setup, once per scenario", async () => {
    const { root, checked: campaign } = checked(campaignYaml(undefined, ['S1', 'S2']), ['S1@1.0', 'S2@1.0']);
    const seen: string[][] = [];
    const ports = doubles({
      onRunOnce: (request) => {
        const build = request.mount.source;
        if (request.command.join(' ').includes('/build/arm/')) {
          seen.push(
            ['harness.tgz', 'arm/setup.sh', 'workspace'].filter((path) => existsSync(join(build, path))),
          );
        }
        fakeBuild(request);
      },
    });

    const summary = await runCampaign(campaign, { ...ports, harnessSources: { wingfoil: CLONE } });

    const snapshots = ports.recorded.runOnce.filter((request) =>
      request.command.join(' ').includes('/build/arm/'),
    );
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]?.command).toEqual([
      'bash',
      '-c',
      'export HOME=/build WORKSPACE=/build/workspace && bash /build/arm/setup.sh',
    ]);
    expect(snapshots[0]?.image).toBe(campaign.campaign.id);
    // Its build directory held the WingFoil artefact, the wingfoil arm and a repository made the way a
    // run's is: one commit, the agent's identity.
    expect(seen).toEqual([
      ['harness.tgz', 'arm/setup.sh', 'workspace'],
      ['harness.tgz', 'arm/setup.sh', 'workspace'],
    ]);
    const snapshotWorkspace = join(summary.resultsDir, 'generated', 'S1@1.0', 'build', 'workspace');
    expect(ports.recorded.gitCalls.filter((call) => call.includes(snapshotWorkspace))).toEqual([
      `init ${snapshotWorkspace}`,
      `identity ${snapshotWorkspace} Benchmark Approver <approver@benchmark.localhost>`,
      `commit ${snapshotWorkspace} seed --allow-empty`,
    ]);
    // Kept with the results: the snapshot and what was rendered from it; the build directory is gone.
    const generated = join(summary.resultsDir, 'generated', 'S1@1.0');
    expect(readFileSync(join(generated, 'wingfoil', '.wingfoil', 'dna.yaml'), 'utf8')).toContain(
      'name: Fake',
    );
    expect(existsSync(join(generated, 'build'))).toBe(false);
    const rules = readFileSync(join(generated, 'PROJECT_RULES.md'), 'utf8');
    expect(rules).toBe(
      renderProjectRules(
        new Map([
          ['.wingfoil/dna.yaml', 'project:\n  name: Fake\n  description: A fake project.\n'],
          ['.wingfoil/roles.yaml', 'assignments:\n  developer: [fake-rule]\n'],
          [
            '.wingfoil/directives/custom/fake-rule.md',
            '---\nid: fake-rule\ntitle: Fake rule\n---\nBe fake.\n',
          ],
        ]),
      ),
    );
    expect(root).toBeDefined();
  });

  it("gives the scenario's configuration to the snapshot, as the wingfoil arm's runs get it (dl-005)", async () => {
    const { checked: campaign } = checked(campaignYaml(), ['S1@1.0'], (root) => {
      const overlay = join(root, 'scenarios', 'S1', '1.0', 'arms', 'wingfoil', '.wingfoil');
      mkdirSync(overlay, { recursive: true });
      writeFileSync(join(overlay, 'marker'), 'from the scenario\n');
    });
    let overlay = '';
    const ports = doubles({
      onRunOnce: (request) => {
        const marker = join(request.mount.source, 'scenario', '.wingfoil', 'marker');
        if (existsSync(marker)) overlay = readFileSync(marker, 'utf8');
        fakeBuild(request);
      },
    });

    await runCampaign(campaign, { ...ports, harnessSources: { wingfoil: CLONE } });

    expect(overlay).toBe('from the scenario\n');
  });

  it('puts PROJECT_RULES.md in the baseline-docs workspace, and in no other arm', async () => {
    const { checked: campaign } = checked();
    const ports = doubles();

    const summary = await runCampaign(campaign, { ...ports, harnessSources: { wingfoil: CLONE } });

    const workspace = (arm: string) => summary.runs.find((run) => run.arm === arm)?.workspace ?? '';
    expect(readFileSync(join(workspace('baseline-docs'), 'PROJECT_RULES.md'), 'utf8')).toBe(
      readFileSync(join(summary.resultsDir, 'generated', 'S1@1.0', 'PROJECT_RULES.md'), 'utf8'),
    );
    expect(existsSync(join(workspace('baseline'), 'PROJECT_RULES.md'))).toBe(false);
    expect(existsSync(join(workspace('wingfoil'), 'PROJECT_RULES.md'))).toBe(false);
  });

  it('makes no snapshot for a campaign without the baseline-docs arm', async () => {
    const { checked: campaign } = checked(campaignYaml(['baseline', 'wingfoil']));
    const ports = doubles();

    await runCampaign(campaign, { ...ports, harnessSources: { wingfoil: CLONE } });

    expect(
      ports.recorded.runOnce
        .map((request) => request.command.join(' '))
        .filter((c) => c.includes('/build/arm/')),
    ).toEqual([]);
  });

  it('does not start a campaign whose snapshot fails, keeping the end of its output', async () => {
    const { checked: campaign } = checked();
    const ports = doubles({
      onRunOnce: (request) => {
        if (!request.command.join(' ').includes('/build/arm/')) fakeBuild(request);
      },
    });
    const failing = {
      ...ports,
      docker: {
        ...ports.docker,
        runOnce: async (request: Parameters<typeof ports.docker.runOnce>[0]) =>
          request.command.join(' ').includes('/build/arm/')
            ? { code: 1, stdout: '', stderr: 'error: missing required argument: --template\n' }
            : ports.docker.runOnce(request),
      },
    };

    await expect(runCampaign(campaign, { ...failing, harnessSources: { wingfoil: CLONE } })).rejects.toThrow(
      'the wingfoil configuration of S1@1.0 could not be made: the setup failed with code 1: error: missing required argument: --template',
    );
    expect(ports.recorded.creates).toEqual([]);
  });
});

describe('checkCampaign, the baseline-docs arm (REQ-RUN-11)', () => {
  it('rejects a campaign with baseline-docs and no wingfoil arm to generate it from', () => {
    const result = checkCampaign(writeRepo(campaignYaml(['baseline', 'baseline-docs']), ['S1@1.0']).file);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      {
        path: 'arms',
        message:
          "includes baseline-docs, which is generated from the wingfoil arm's configuration: add the wingfoil arm",
      },
    ]);
  });
});
