import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { renderConstitution } from '../../../src/arms/index.js';
import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { repoPath } from '../../support/paths.js';
import { doubles } from '../../support/runner-doubles.js';

const SHA = 'f1d3a4f8337ebbd3ae22760a9c12e3352b93a175';
const RULE = [
  '---',
  'id: r1',
  'type: directive',
  'title: "No new runtime dependency"',
  '---',
  '',
  '# No new runtime dependency',
  '',
  'Add no package to `dependencies`.',
  '',
].join('\n');

/** S1 in the speckit arm, the repository's own, with or without project rules declared as the wingfoil arm's. */
function speckitRepo(rules: boolean) {
  const repo = writeRepo(
    {
      ...completeCampaignYaml(),
      arms: ['baseline', 'speckit'],
      harnesses: { speckit: { tool: 'speckit', version: 'v1.1.0' } },
      scenarios: [{ id: 'S1', version: '1.0' }],
      repetitions: { S1: 1 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
    },
    ['S1@1.0'],
  );
  rmSync(join(repo.root, 'arms', 'speckit'), { recursive: true, force: true });
  cpSync(repoPath('arms/speckit'), join(repo.root, 'arms', 'speckit'), { recursive: true });
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
    writeFileSync(join(dir, '..', '..', 'roles.yaml'), 'assignments:\n  developer:\n    - r1\n');
  }
  const checked = checkCampaign(repo.file);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { ...repo, checked: checked.value };
}

const build = (request: { mount: { source: string } }) => {
  mkdirSync(join(request.mount.source, 'out'), { recursive: true });
  writeFileSync(join(request.mount.source, 'out', 'specify_cli-1.1.0-py3-none-any.whl'), 'wheel');
  writeFileSync(join(request.mount.source, 'out', 'installed.tgz'), 'bundle');
};

const record = (outputDir: string) =>
  JSON.parse(readFileSync(join(outputDir, 'run.json'), 'utf8')) as Record<string, unknown> & {
    manual: { sha256: string; bytes: number };
    generated_sha256?: string;
  };

describe('the speckit arm in a run (REQ-FMT-14, REQ-RUN-12 as amended, task-066)', () => {
  it("writes the scenario's rules into Spec Kit's constitution after the setup, keeps it, and records its digest", async () => {
    const { checked } = speckitRepo(true);
    const ports = doubles({ commits: { 'v1.1.0': SHA }, onRunOnce: build });
    const summary = await runCampaign(checked, { ...ports, harnessSources: { speckit: '/clones/spec-kit' } });
    const run = summary.runs.find((r) => r.arm === 'speckit');
    const workspace = ports.recorded.creates.find((c) => c.workspace.includes('/speckit/'))?.workspace ?? '';
    const expected = renderConstitution(
      new Map([
        ['.wingfoil/roles.yaml', 'assignments:\n  developer:\n    - r1\n'],
        ['.wingfoil/directives/custom/r1.md', RULE],
      ]),
    );
    expect(readFileSync(join(workspace, '.specify', 'memory', 'constitution.md'), 'utf8')).toBe(expected);
    expect(readFileSync(join(run?.outputDir ?? '', 'generated', 'constitution.md'), 'utf8')).toBe(expected);
    expect(record(run?.outputDir ?? '').generated_sha256).toBe(
      createHash('sha256')
        .update(expected ?? '')
        .digest('hex'),
    );
    // The baseline arm gets no constitution: the generator is Spec Kit's.
    const baseline = ports.recorded.creates.find((c) => c.workspace.includes('/baseline/'))?.workspace ?? '';
    expect(existsSync(join(baseline, '.specify'))).toBe(false);
  });

  it('leaves the template of a scenario that declares no rules, and records no generated digest', async () => {
    const { checked } = speckitRepo(false);
    const ports = doubles({ commits: { 'v1.1.0': SHA }, onRunOnce: build });
    const summary = await runCampaign(checked, { ...ports, harnessSources: { speckit: '/clones/spec-kit' } });
    const run = summary.runs.find((r) => r.arm === 'speckit');
    expect(record(run?.outputDir ?? '').generated_sha256).toBeUndefined();
    expect(existsSync(join(run?.outputDir ?? '', 'generated'))).toBe(false);
  });

  it("puts the manual first and the tool's CLAUDE.md under a heading, measuring the whole file", async () => {
    const { checked } = speckitRepo(false);
    const ports = doubles({
      commits: { 'v1.1.0': SHA },
      onRunOnce: build,
      // The tool's setup writes its own CLAUDE.md over the manual, as some tools do.
      execResultOf: (command) => {
        if (command.join(' ') !== 'bash /home/node/arm/setup.sh') return undefined;
        const workspace = ports.recorded.creates.at(-1)?.workspace ?? '';
        writeFileSync(join(workspace, 'CLAUDE.md'), "The tool's own notes.\n");
        return { code: 0, stdout: '', stderr: '' };
      },
    });
    const summary = await runCampaign(checked, { ...ports, harnessSources: { speckit: '/clones/spec-kit' } });
    const run = summary.runs.find((r) => r.arm === 'speckit');
    const workspace = ports.recorded.creates.find((c) => c.workspace.includes('/speckit/'))?.workspace ?? '';
    const manual = readFileSync(repoPath('arms/speckit/manual.md'), 'utf8');
    const merged = readFileSync(join(workspace, 'CLAUDE.md'), 'utf8');
    expect(merged).toBe(`${manual.trimEnd()}\n\n## speckit\n\nThe tool's own notes.\n`);
    const recorded = record(run?.outputDir ?? '').manual;
    expect(recorded.sha256).toBe(createHash('sha256').update(manual).digest('hex'));
    expect(recorded.bytes).toBe(Buffer.byteLength(merged));
  });
});

describe('the speckit arm, its edges (task-066 review round 1)', () => {
  it("keeps the manual once when the tool's setup writes its CLAUDE.md before it", async () => {
    const { checked } = speckitRepo(false);
    const ports = doubles({
      commits: { 'v1.1.0': SHA },
      onRunOnce: build,
      execResultOf: (command) => {
        if (command.join(' ') !== 'bash /home/node/arm/setup.sh') return undefined;
        const file = join(ports.recorded.creates.at(-1)?.workspace ?? '', 'CLAUDE.md');
        writeFileSync(file, `The tool's own notes.\n\n${readFileSync(file, 'utf8')}`);
        return { code: 0, stdout: '', stderr: '' };
      },
    });
    await runCampaign(checked, { ...ports, harnessSources: { speckit: '/clones/spec-kit' } });
    const workspace = ports.recorded.creates.find((c) => c.workspace.includes('/speckit/'))?.workspace ?? '';
    const manual = readFileSync(repoPath('arms/speckit/manual.md'), 'utf8');
    expect(readFileSync(join(workspace, 'CLAUDE.md'), 'utf8')).toBe(
      `${manual.trimEnd()}\n\n## speckit\n\nThe tool's own notes.\n`,
    );
  });

  it("sets an arm's telemetry settings in its container, the runner's own variables winning", async () => {
    const { root, checked } = speckitRepo(false);
    const yaml = join(root, 'arms', 'speckit', 'arm.yaml');
    writeFileSync(
      yaml,
      readFileSync(yaml, 'utf8').replace('telemetry_off: []', 'telemetry_off: [DO_NOT_TRACK=1]'),
    );
    const again = checkCampaign(join(root, 'campaigns', 'campaign.yaml'));
    if (!again.ok) throw new Error(JSON.stringify(again.issues));
    const ports = doubles({ commits: { 'v1.1.0': SHA }, onRunOnce: build });
    await runCampaign(again.value, {
      ...ports,
      harnessSources: { speckit: '/clones/spec-kit' },
      containerEnv: { ANTHROPIC_AUTH_TOKEN: 'token' },
    });
    const create = ports.recorded.creates.find((c) => c.workspace.includes('/speckit/'));
    expect(create?.env).toEqual({
      DO_NOT_TRACK: '1',
      CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
      ANTHROPIC_AUTH_TOKEN: 'token',
    });
    void checked;
  });

  it("builds Spec Kit's bundle in the campaign image: the wheel, its dependencies, their digests, all flat", async () => {
    const { checked } = speckitRepo(false);
    const ports = doubles({ commits: { 'v1.1.0': SHA }, onRunOnce: build });
    await runCampaign(checked, { ...ports, harnessSources: { speckit: '/clones/spec-kit' } });
    const script = ports.recorded.runOnce[0]?.command.at(-1) ?? '';
    expect(script).toContain('uv build --wheel --out-dir /build/bundle');
    expect(script).toContain('python -m pip download -q -d /build/bundle /build/bundle/specify_cli-*.whl');
    expect(script).toContain('sha256sum *.whl > SHA256SUMS');
    expect(script).toContain('tar -czf /build/out/installed.tgz -C /build/bundle .');
    expect(ports.recorded.gitCalls).toContain(`archive /clones/spec-kit ${SHA}`);
  });
});
