import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, stringify } from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { main } from '../../src/cli/index.js';
import { priceCampaign } from '../support/dry-run-fixture.js';
import { repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';

/** A clone of github/spec-kit with the pinned tag: BENCH_SPECKIT_REPO, as for a campaign. */
const clone = process.env.BENCH_SPECKIT_REPO ?? '';

describe('the speckit arm in a real container (task-066)', () => {
  let image = '';
  afterEach(() => {
    vi.unstubAllEnvs();
    if (image !== '') execFileSync('docker', ['image', 'rm', image], { stdio: 'ignore' });
    image = '';
  });

  it.skipIf(clone === '' || !existsSync(join(clone, '.git')))(
    "builds Spec Kit's bundle, installs it offline, initializes it for Claude Code and writes the scenario's rules into its constitution",
    async () => {
      const root = tempDir('bench-docker-speckit-');
      cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
      cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
      cpSync(repoPath('arms/speckit'), join(root, 'arms', 'speckit'), { recursive: true });
      cpSync(repoPath('eligibility'), join(root, 'eligibility'), { recursive: true });
      cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
      const file = join(root, 'campaigns', 'speckit.yaml');
      const yaml = parse(readFileSync(join(root, 'campaigns', 'arms.yaml'), 'utf8')) as Record<
        string,
        unknown
      >;
      writeFileSync(
        file,
        stringify({
          ...yaml,
          arms: ['baseline', 'speckit'],
          harnesses: { speckit: { tool: 'speckit', version: 'v1.1.0' } },
        }),
      );
      vi.stubEnv('BENCH_FAKE_SCRIPT', repoPath('test/fixtures/fake-script-arms.json'));
      vi.stubEnv('BENCH_SPECKIT_REPO', clone);

      let output = '';
      priceCampaign(file);
      const code = await main(['campaign', 'run', file], {
        stdout: (text) => (output += text),
        stderr: (text) => (output += text),
      });
      expect({ code, output }).toEqual({
        code: 0,
        output: expect.stringContaining('2 runs completed, 0 failed'),
      });
      image = /campaign ([0-9a-f]{12})/.exec(output)?.[1] ?? '';

      const workspace = join(root, 'runs', image, '1', 'T2@1.0', 'speckit', 'fake-model', 'r1', 'workspace');
      const out = join(root, 'results', image, '1', 'runs', 'T2@1.0', 'speckit', 'fake-model', 'r1');
      // Installed from the bundle, offline, and initialized for Claude Code: its skills and its .specify/.
      expect(readFileSync(join(out, 'setup', 'log.txt'), 'utf8')).toContain(
        'Installed 1 executable: specify',
      );
      expect(existsSync(join(workspace, '.claude', 'skills', 'speckit-specify', 'SKILL.md'))).toBe(true);
      // The scenario's rule, declared once as the wingfoil arm's directive, is in Spec Kit's constitution.
      const constitution = readFileSync(join(workspace, '.specify', 'memory', 'constitution.md'), 'utf8');
      expect(constitution).toContain('### No throw\n');
      expect(readFileSync(join(out, 'generated', 'constitution.md'), 'utf8')).toBe(constitution);
      const record = JSON.parse(readFileSync(join(out, 'run.json'), 'utf8')) as {
        harness: Record<string, string>;
        generated_sha256: string;
        telemetry_off: string[];
      };
      expect(record.harness).toMatchObject({ tool: 'speckit', version: 'v1.1.0' });
      expect(record.generated_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(record.telemetry_off).toEqual([]);
      // The manual is the agent's CLAUDE.md: Spec Kit writes none of its own.
      expect(readFileSync(join(workspace, 'CLAUDE.md'), 'utf8')).toBe(
        readFileSync(repoPath('arms/speckit/manual.md'), 'utf8'),
      );
    },
  );
});
