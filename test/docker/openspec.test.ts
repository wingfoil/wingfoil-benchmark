import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, stringify } from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { main } from '../../src/cli/index.js';
import { priceCampaign } from '../support/dry-run-fixture.js';
import { repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';

describe('the openspec arm in a real container (task-071)', () => {
  let image = '';
  afterEach(() => {
    vi.unstubAllEnvs();
    if (image !== '') execFileSync('docker', ['image', 'rm', image], { stdio: 'ignore' });
    image = '';
  });

  it("builds OpenSpec from the npm registry, installs it, initializes it for Claude Code and writes the scenario's rules into its configuration", async () => {
    const root = tempDir('bench-docker-openspec-');
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
    cpSync(repoPath('arms/openspec'), join(root, 'arms', 'openspec'), { recursive: true });
    cpSync(repoPath('arms/openspec-docs'), join(root, 'arms', 'openspec-docs'), { recursive: true });
    cpSync(repoPath('eligibility'), join(root, 'eligibility'), { recursive: true });
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    const file = join(root, 'campaigns', 'openspec.yaml');
    const yaml = parse(readFileSync(join(root, 'campaigns', 'arms.yaml'), 'utf8')) as Record<string, unknown>;
    writeFileSync(
      file,
      stringify({
        ...yaml,
        // task-072: and its docs control, whose snapshot runs the arm's real setup in a one-off container.
        arms: ['baseline', 'openspec', 'openspec-docs'],
        harnesses: { openspec: { tool: 'openspec', version: '1.14.0' } },
      }),
    );
    vi.stubEnv('BENCH_FAKE_SCRIPT', repoPath('test/fixtures/fake-script-arms.json'));

    let output = '';
    priceCampaign(file);
    const code = await main(['campaign', 'run', file], {
      stdout: (text) => (output += text),
      stderr: (text) => (output += text),
    });
    expect({ code, output }).toEqual({
      code: 0,
      output: expect.stringContaining('3 runs completed, 0 failed'),
    });
    image = /campaign ([0-9a-f]{12})/.exec(output)?.[1] ?? '';

    const workspace = join(root, 'runs', image, '1', 'T2@1.0', 'openspec', 'fake-model', 'r1', 'workspace');
    const out = join(root, 'results', image, '1', 'runs', 'T2@1.0', 'openspec', 'fake-model', 'r1');
    // Installed from its artifact and initialized for Claude Code: its skills, its commands, its configuration.
    expect(existsSync(join(workspace, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(workspace, '.claude', 'commands', 'opsx', 'apply.md'))).toBe(true);
    // The scenario's rule, declared once as the wingfoil arm's directive, is in OpenSpec's project context.
    const config = readFileSync(join(workspace, 'openspec', 'config.yaml'), 'utf8');
    expect((parse(config) as { schema: string }).schema).toBe('spec-driven');
    expect((parse(config) as { context: string }).context).toContain('## No throw\n');
    expect(readFileSync(join(out, 'generated', 'config.yaml'), 'utf8')).toBe(config);
    const record = JSON.parse(readFileSync(join(out, 'run.json'), 'utf8')) as {
      harness: Record<string, string>;
      generated_sha256: string;
      telemetry_off: string[];
    };
    // Fetched by version: its commit is the registry tarball's digest.
    expect(record.harness).toMatchObject({ tool: 'openspec', version: '1.14.0' });
    expect(record.harness.commit).toBe(record.harness.tarball_sha256);
    expect(record.generated_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(record.telemetry_off).toEqual(['OPENSPEC_TELEMETRY=0']);
    // openspec-docs (task-072): its PROJECT_RULES.md is the context the real snapshot's rules generator wrote.
    const docs = join(root, 'runs', image, '1', 'T2@1.0', 'openspec-docs', 'fake-model', 'r1', 'workspace');
    const rules = readFileSync(join(docs, 'PROJECT_RULES.md'), 'utf8');
    expect(rules).toContain('### No throw\n');
    expect(rules).not.toContain('spec-driven');
    // The manual is the agent's CLAUDE.md: OpenSpec writes none of its own with --tools claude.
    expect(readFileSync(join(workspace, 'CLAUDE.md'), 'utf8')).toBe(
      readFileSync(repoPath('arms/openspec/manual.md'), 'utf8'),
    );
  });
});
