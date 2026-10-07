import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

import { renderOpenSpecConfig } from '../../../src/arms/index.js';
import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { repoPath } from '../../support/paths.js';
import { doubles } from '../../support/runner-doubles.js';

const RULE = [
  '---',
  'id: r1',
  'type: directive',
  'title: "No new runtime dependency"',
  '---',
  '',
  '# No new runtime dependency',
  '',
  'Add no package to `dependencies`: "quotes", colons: and # hashes stay text.',
  '',
].join('\n');
const ROLES = 'assignments:\n  developer:\n    - r1\n';

/** S1 in the openspec arm, the repository's own, with or without project rules declared as the wingfoil arm's. */
function openspecRepo(
  rules: boolean,
  pin: Record<string, unknown> = { tool: 'openspec', version: '1.14.0' },
) {
  const repo = writeRepo(
    {
      ...completeCampaignYaml(),
      arms: ['baseline', 'openspec'],
      harnesses: { openspec: pin },
      scenarios: [{ id: 'S1', version: '1.0' }],
      repetitions: { S1: 1 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
    },
    ['S1@1.0'],
  );
  rmSync(join(repo.root, 'arms', 'openspec'), { recursive: true, force: true });
  cpSync(repoPath('arms/openspec'), join(repo.root, 'arms', 'openspec'), { recursive: true });
  if (rules) {
    const dir = join(
      repo.root,
      'scenarios',
      'S1',
      '1.0',
      'arms',
      'wingfoil',
      '.wingfoil',
      'directives',
      'custom',
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'r1.md'), RULE);
    writeFileSync(join(dir, '..', '..', 'roles.yaml'), ROLES);
  }
  const checked = checkCampaign(repo.file);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { ...repo, checked: checked.value };
}

/** A registry build that writes what the real one writes: npm's tarball and the installed prefix. */
const build = (request: { mount: { source: string } }) => {
  mkdirSync(join(request.mount.source, 'out'), { recursive: true });
  writeFileSync(join(request.mount.source, 'out', 'fission-ai-openspec-1.14.0.tgz'), 'npm tarball');
  writeFileSync(join(request.mount.source, 'out', 'installed.tgz'), 'installed prefix');
};

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const record = (outputDir: string) =>
  JSON.parse(readFileSync(join(outputDir, 'run.json'), 'utf8')) as Record<string, unknown> & {
    generated_sha256?: string;
  };

describe('the OpenSpec harness, built from the npm registry (REQ-FMT-12, REQ-RUN-14, task-071)', () => {
  it('builds it by version in the campaign image, with no clone and no git, and records its tarball as its commit', async () => {
    const { root, checked } = openspecRepo(false);
    const ports = doubles({ onRunOnce: build });
    const summary = await runCampaign(checked, ports);

    expect(
      ports.recorded.gitCalls.filter((call) => call.startsWith('resolve') || call.startsWith('archive')),
    ).toEqual([]);
    expect(ports.recorded.runOnce).toHaveLength(1);
    expect(ports.recorded.runOnce[0]?.mount).toEqual({
      source: join(root, '.cache', 'harnesses', 'openspec', '1.14.0', 'build'),
      target: '/build',
    });
    const script = ports.recorded.runOnce[0]?.command.at(-1) ?? '';
    expect(script).toContain("npm pack --pack-destination /build/out '@fission-ai/openspec@1.14.0'");
    expect(script).toContain('npm install --global --prefix /build/install/openspec');
    expect(script).toContain('tar -czf /build/out/installed.tgz -C /build/install openspec');

    const run = summary.runs.find((r) => r.arm === 'openspec');
    expect(record(run?.outputDir ?? '').harness).toEqual({
      tool: 'openspec',
      version: '1.14.0',
      commit: sha256('npm tarball'),
      tarball_sha256: sha256('npm tarball'),
      installed_sha256: sha256('installed prefix'),
      artifact_sha256: sha256('installed prefix'),
    });
  });

  it('reuses its cached artifact by version, and refuses one whose bytes changed', async () => {
    const { root, checked } = openspecRepo(false);
    await runCampaign(checked, doubles({ onRunOnce: build }));
    const again = doubles({ onRunOnce: build });
    await runCampaign(checked, again);
    expect(again.recorded.runOnce).toEqual([]);

    writeFileSync(join(root, '.cache', 'harnesses', 'openspec', '1.14.0', 'installed.tgz'), 'tampered');
    await expect(runCampaign(checked, doubles({ onRunOnce: build }))).rejects.toThrow(
      'the cached harness artifact .cache/harnesses/openspec/1.14.0/installed.tgz no longer matches its recorded digest',
    );
  });

  it('refuses a commit pin: the registry has none', async () => {
    const { checked } = openspecRepo(false, {
      tool: 'openspec',
      version: '1.14.0',
      commit: '1'.repeat(40),
    });
    await expect(runCampaign(checked, doubles({ onRunOnce: build }))).rejects.toThrow(
      'the openspec harness pins commit 1111111111111111111111111111111111111111, but openspec is fetched from the npm registry by version',
    );
  });
});

describe('the openspec arm in a run (REQ-FMT-14, REQ-FMT-05, task-071)', () => {
  it("writes the scenario's rules into openspec/config.yaml's context after the setup, keeps it, and records its digest", async () => {
    const { checked } = openspecRepo(true);
    const ports = doubles({ onRunOnce: build });
    const summary = await runCampaign(checked, ports);
    const run = summary.runs.find((r) => r.arm === 'openspec');
    const workspace = ports.recorded.creates.find((c) => c.workspace.includes('/openspec/'))?.workspace ?? '';
    const written = readFileSync(join(workspace, 'openspec', 'config.yaml'), 'utf8');
    expect(written).toBe(
      renderOpenSpecConfig(
        new Map([
          ['.wingfoil/roles.yaml', ROLES],
          ['.wingfoil/directives/custom/r1.md', RULE],
        ]),
      ),
    );
    expect(readFileSync(join(run?.outputDir ?? '', 'generated', 'config.yaml'), 'utf8')).toBe(written);
    expect(record(run?.outputDir ?? '').generated_sha256).toBe(sha256(written));
    const config = parse(written) as { schema: string; context: string };
    expect(config.schema).toBe('spec-driven');
    expect(config.context).toContain('No new runtime dependency');
    expect(config.context).toContain('"quotes", colons: and # hashes stay text.');
  });

  it("leaves init's file for a scenario that declares no rules, and records no generated digest", async () => {
    const { checked } = openspecRepo(false);
    const summary = await runCampaign(checked, doubles({ onRunOnce: build }));
    const run = summary.runs.find((r) => r.arm === 'openspec');
    expect(record(run?.outputDir ?? '').generated_sha256).toBeUndefined();
    expect(existsSync(join(run?.outputDir ?? '', 'generated'))).toBe(false);
  });

  it('turns its telemetry off in the run container, and records it', async () => {
    const { checked } = openspecRepo(false);
    const ports = doubles({ onRunOnce: build });
    const summary = await runCampaign(checked, ports);
    const create = ports.recorded.creates.find((c) => c.workspace.includes('/openspec/'));
    expect(create?.env).toMatchObject({ OPENSPEC_TELEMETRY: '0' });
    const run = summary.runs.find((r) => r.arm === 'openspec');
    expect(record(run?.outputDir ?? '').telemetry_off).toEqual(['OPENSPEC_TELEMETRY=0']);
  });
});

describe('renderOpenSpecConfig (REQ-FMT-14, task-071)', () => {
  it('renders nothing for a scenario without developer rules', () => {
    expect(renderOpenSpecConfig(new Map())).toBeUndefined();
  });
});
