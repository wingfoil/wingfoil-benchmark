import { chmodSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CODEX_SCOPE_END, codexScopeIssues } from '../../../src/cli/codex-scope.js';
import { main } from '../../../src/cli/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { repoPath } from '../../support/paths.js';
import { doubles } from '../../support/runner-doubles.js';
import { tempDir } from '../../support/scenario-fixture.js';

const CODEX = { name: 'codex', version: '0.162.1', effort: { 'gpt-6.1-sol': 'medium' } };

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A fake Codex credential, mode 600 in a directory of its own outside any checkout, as the preflight wants it. */
function fakeAuthFile(): string {
  const dir = tempDir('bench-codex-scope-auth-');
  chmodSync(dir, 0o700);
  const file = join(dir, 'auth.json');
  writeFileSync(file, JSON.stringify({ tokens: { access_token: 'at-fake-scope-value-0001' } }));
  chmodSync(file, 0o600);
  return file;
}

/** dl-024's scope, enforced before any Codex session: the date, and the campaign or dry run it may serve. */
describe("the Codex credential's scope (dl-024)", () => {
  const before = Date.parse('2026-11-13T23:59:59Z');
  const after = Date.parse('2026-11-14T00:00:00Z');

  it('ends on 2026-11-13', () => {
    expect(CODEX_SCOPE_END).toBe('2026-11-13');
  });

  it('accepts the Codex baseline campaign and its dry runs until the end of 2026-11-13', () => {
    expect(
      codexScopeIssues(
        { agent: 'codex', preset: 'presets/baseline-across-agents.yaml', arms: ['baseline'] },
        before,
      ),
    ).toEqual([]);
    expect(
      codexScopeIssues(
        { agent: 'codex', dryRunArm: 'baseline', profile: 'codex-baseline.dry-run.yaml' },
        before,
      ),
    ).toEqual([]);
  });

  it('refuses any Codex session after 2026-11-13', () => {
    expect(
      codexScopeIssues(
        { agent: 'codex', dryRunArm: 'baseline', profile: 'codex-baseline.dry-run.yaml' },
        after,
      ),
    ).toEqual([{ path: 'agent', message: "codex's credential is in scope until 2026-11-13 only (dl-024)" }]);
  });

  it('refuses a Codex campaign that does not extend baseline-across-agents, or runs another arm', () => {
    expect(codexScopeIssues({ agent: 'codex', arms: ['baseline'] }, before)).toEqual([
      {
        path: 'extends',
        message: 'a codex campaign must extend presets/baseline-across-agents.yaml (dl-024)',
      },
    ]);
    expect(
      codexScopeIssues(
        { agent: 'codex', preset: 'presets/baseline-across-agents.yaml', arms: ['baseline', 'wingfoil'] },
        before,
      ),
    ).toEqual([{ path: 'arms', message: 'a codex campaign runs the baseline arm only (dl-024)' }]);
    expect(
      codexScopeIssues(
        { agent: 'codex', dryRunArm: 'wingfoil', profile: 'codex-baseline.dry-run.yaml' },
        before,
      ),
    ).toEqual([{ path: 'arm', message: 'a codex dry run runs the baseline arm only (dl-024)' }]);
  });

  it("refuses a Codex dry run from another profile than the campaign's (review round 1)", () => {
    expect(
      codexScopeIssues(
        { agent: 'codex', dryRunArm: 'baseline', profile: 'x-codex-s3-codex.dry-run.yaml' },
        before,
      ),
    ).toEqual([
      { path: 'profile', message: 'a codex dry run reads campaigns/codex-baseline.dry-run.yaml (dl-024)' },
    ]);
  });

  it('says nothing for another agent', () => {
    expect(codexScopeIssues({ agent: 'claude-code', arms: ['baseline', 'wingfoil'] }, after)).toEqual([]);
  });
});

/** The scope where it is wired: `campaign run` and `scenario dry-run` refuse before anything is built (review round 1). */
describe("dl-024's scope in the commands", () => {
  const after = () => Date.parse('2026-11-14T00:00:00Z');

  async function cli(argv: string[], root: string, now: () => number, ports = doubles()) {
    let stderr = '';
    const code = await main(argv, { stdout: () => {}, stderr: (text) => (stderr += text), now }, ports, root);
    return { code, stderr, built: ports.recorded.builds.length + ports.recorded.creates.length };
  }

  it('refuses a Codex campaign after 2026-11-13, building nothing', async () => {
    const pins = {
      ...completeCampaignYaml(),
      harnesses: {},
      arms: ['baseline'],
      agent: CODEX,
      models: { default: 'gpt-6.1-sol' },
    };
    const { root, file } = writeRepo(pins);
    mkdirSync(join(root, 'campaigns', 'presets'));
    writeFileSync(
      join(root, 'campaigns', 'presets', 'baseline-across-agents.yaml'),
      stringify({ description: 'b', ...pins }),
    );
    writeFileSync(file, stringify({ extends: 'presets/baseline-across-agents.yaml' }));
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', fakeAuthFile());

    const refused = await cli(['campaign', 'run', file, '--allow-spending'], root, after);

    expect(refused).toMatchObject({ code: 1, built: 0 });
    expect(refused.stderr).toContain("agent: codex's credential is in scope until 2026-11-13 only (dl-024)");
  });

  it('refuses a Codex campaign that does not extend the preset, building nothing', async () => {
    const { root, file } = writeRepo({
      ...completeCampaignYaml(),
      harnesses: {},
      arms: ['baseline'],
      agent: CODEX,
      models: { default: 'gpt-6.1-sol' },
    });
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', fakeAuthFile());

    const refused = await cli(['campaign', 'run', file, '--allow-spending'], root, () =>
      Date.parse('2026-10-24T12:00:00Z'),
    );

    expect(refused).toMatchObject({ code: 1, built: 0 });
    expect(refused.stderr).toContain(
      'extends: a codex campaign must extend presets/baseline-across-agents.yaml (dl-024)',
    );
  });

  it("refuses a Codex dry run from another profile than the campaign's, building nothing", async () => {
    const { root } = writeRepo();
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    writeFileSync(
      join(root, 'campaigns', 'other.dry-run.yaml'),
      stringify({
        harnesses: {},
        agent: CODEX,
        models: { default: 'gpt-6.1-sol' },
        approver_policy: 'v1',
        caps: { step_time_s: 60, step_tokens: 1000, run_cost_eur: 1 },
        currency: { usd_to_eur: 0.9 },
      }),
    );
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', fakeAuthFile());

    const refused = await cli(
      [
        'scenario',
        'dry-run',
        'S1@1.0',
        '--arm',
        'baseline',
        '--profile',
        join(root, 'campaigns', 'other.dry-run.yaml'),
        '--allow-spending',
      ],
      root,
      () => Date.parse('2026-10-24T12:00:00Z'),
    );

    expect(refused).toMatchObject({ code: 1, built: 0 });
    expect(refused.stderr).toContain(
      'profile: a codex dry run reads campaigns/codex-baseline.dry-run.yaml (dl-024)',
    );
  });
});
