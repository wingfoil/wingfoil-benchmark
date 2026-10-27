import { chmodSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
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
describe("the Codex credential's scope (dl-024, widened by dl-025)", () => {
  const before = Date.parse('2026-11-13T23:59:59Z');
  const after = Date.parse('2026-11-14T00:00:00Z');
  const BASELINE = 'presets/baseline-across-agents.yaml';
  const HVD = 'presets/harness-vs-docs.yaml';
  const BASELINE_PROFILE = 'campaigns/codex-baseline.dry-run.yaml';
  const TERRA_PROFILE = 'campaigns/codex-terra-harness-vs-docs.dry-run.yaml';
  const issuesOf = (input: Parameters<typeof codexScopeIssues>[0], now = before) =>
    codexScopeIssues(input, now);

  it("accepts the step-A spike's dry run of its arm on Terra, and nothing else of it (task-107, dl-027)", () => {
    const SPIKE = 'campaigns/wingfoil-step-a-spike.dry-run.yaml';
    expect(
      issuesOf({
        agent: 'codex',
        dryRunArm: 'wingfoil-step-a-spike',
        profile: SPIKE,
        model: 'gpt-5.6-terra',
      }),
    ).toEqual([]);
    expect(
      issuesOf({ agent: 'codex', dryRunArm: 'baseline', profile: SPIKE, model: 'gpt-5.6-terra' }),
    ).toEqual([
      { path: 'arm', message: `a codex dry run of ${SPIKE} runs wingfoil-step-a-spike only (dl-027)` },
    ]);
    expect(
      issuesOf({ agent: 'codex', dryRunArm: 'wingfoil-step-a-spike', profile: SPIKE, model: 'gpt-6-luna' }),
    ).toEqual([{ path: 'model', message: `a codex dry run of ${SPIKE} runs gpt-5.6-terra only (dl-027)` }]);
  });

  it('ends on 2026-11-13', () => {
    expect(CODEX_SCOPE_END).toBe('2026-11-13');
  });

  it('accepts the Codex baseline campaign on any model, and its dry runs, until the end of 2026-11-13', () => {
    expect(
      issuesOf({
        agent: 'codex',
        preset: BASELINE,
        arms: ['baseline'],
        models: ['gpt-6.1-sol', 'gpt-6-luna'],
      }),
    ).toEqual([]);
    expect(
      issuesOf({ agent: 'codex', dryRunArm: 'baseline', profile: BASELINE_PROFILE, model: 'gpt-6-luna' }),
    ).toEqual([]);
  });

  it("accepts dl-025's campaign on Terra and its dry runs of the three arms (task-105)", () => {
    expect(
      issuesOf({
        agent: 'codex',
        preset: HVD,
        arms: ['baseline', 'baseline-docs', 'wingfoil'],
        models: ['gpt-5.6-terra'],
      }),
    ).toEqual([]);
    for (const arm of ['baseline', 'baseline-docs', 'wingfoil']) {
      expect(
        issuesOf({ agent: 'codex', dryRunArm: arm, profile: TERRA_PROFILE, model: 'gpt-5.6-terra' }),
        arm,
      ).toEqual([]);
    }
  });

  it('refuses any Codex session after 2026-11-13', () => {
    expect(
      issuesOf(
        { agent: 'codex', dryRunArm: 'baseline', profile: BASELINE_PROFILE, model: 'gpt-6.1-sol' },
        after,
      ),
    ).toEqual([{ path: 'agent', message: "codex's credential is in scope until 2026-11-13 only (dl-024)" }]);
  });

  it('refuses another preset, an arm or a model outside its preset, naming the decision', () => {
    expect(issuesOf({ agent: 'codex', arms: ['baseline'], models: ['gpt-6.1-sol'] })).toEqual([
      { path: 'extends', message: `a codex campaign must extend ${BASELINE} or ${HVD} (dl-024, dl-025)` },
    ]);
    expect(
      issuesOf({ agent: 'codex', preset: BASELINE, arms: ['baseline', 'wingfoil'], models: ['gpt-6.1-sol'] }),
    ).toEqual([{ path: 'arms', message: `a codex campaign of ${BASELINE} runs baseline only (dl-024)` }]);
    expect(
      issuesOf({ agent: 'codex', preset: HVD, arms: ['baseline', 'speckit'], models: ['gpt-5.6-terra'] }),
    ).toEqual([
      {
        path: 'arms',
        message: `a codex campaign of ${HVD} runs baseline, baseline-docs, wingfoil only (dl-025)`,
      },
    ]);
    expect(
      issuesOf({ agent: 'codex', preset: HVD, arms: ['baseline', 'wingfoil'], models: ['gpt-6.1-sol'] }),
    ).toEqual([{ path: 'models', message: `a codex campaign of ${HVD} runs gpt-5.6-terra only (dl-025)` }]);
  });

  it("refuses a Codex dry run from another profile, or of an arm or a model its profile's campaign does not run", () => {
    expect(
      issuesOf({
        agent: 'codex',
        dryRunArm: 'baseline',
        profile: 'campaigns/x-codex-s3-codex.dry-run.yaml',
        model: 'gpt-6.1-sol',
      }),
    ).toEqual([
      {
        path: 'profile',
        message: `a codex dry run reads ${BASELINE_PROFILE} or ${TERRA_PROFILE} or campaigns/wingfoil-step-a-spike.dry-run.yaml (dl-024, dl-025, dl-027)`,
      },
    ]);
    expect(
      issuesOf({
        agent: 'codex',
        dryRunArm: 'baseline',
        profile: 'spikes/x/codex-baseline.dry-run.yaml',
        model: 'gpt-6.1-sol',
      }),
    ).toEqual([
      {
        path: 'profile',
        message: `a codex dry run reads ${BASELINE_PROFILE} or ${TERRA_PROFILE} or campaigns/wingfoil-step-a-spike.dry-run.yaml (dl-024, dl-025, dl-027)`,
      },
    ]);
    expect(
      issuesOf({ agent: 'codex', dryRunArm: 'wingfoil', profile: BASELINE_PROFILE, model: 'gpt-6.1-sol' }),
    ).toEqual([
      { path: 'arm', message: `a codex dry run of ${BASELINE_PROFILE} runs baseline only (dl-024)` },
    ]);
    expect(
      issuesOf({ agent: 'codex', dryRunArm: 'wingfoil', profile: TERRA_PROFILE, model: 'gpt-6-luna' }),
    ).toEqual([
      { path: 'model', message: `a codex dry run of ${TERRA_PROFILE} runs gpt-5.6-terra only (dl-025)` },
    ]);
  });

  it('says nothing for another agent', () => {
    expect(issuesOf({ agent: 'claude-code', arms: ['baseline', 'wingfoil'], models: ['x'] }, after)).toEqual(
      [],
    );
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
      'extends: a codex campaign must extend presets/baseline-across-agents.yaml or presets/harness-vs-docs.yaml (dl-024, dl-025)',
    );
  });

  it("refuses a copy of the campaign's dry-run profile outside campaigns/, building nothing (review round 2)", async () => {
    const { root } = writeRepo();
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    mkdirSync(join(root, 'spikes', 'x'), { recursive: true });
    const copy = join(root, 'spikes', 'x', 'codex-baseline.dry-run.yaml');
    // The campaign's profile, less the digest of the repository's own baseline arm, which this fixture's differs from.
    const profile = parse(readFileSync(repoPath('campaigns/codex-baseline.dry-run.yaml'), 'utf8')) as Record<
      string,
      unknown
    >;
    delete profile.arm_digests;
    writeFileSync(copy, stringify(profile));
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', fakeAuthFile());

    const refused = await cli(
      [
        'scenario',
        'dry-run',
        'S1@1.0',
        '--arm',
        'baseline',
        '--model',
        'gpt-6.1-sol',
        '--profile',
        copy,
        '--allow-spending',
      ],
      root,
      () => Date.parse('2026-10-24T12:00:00Z'),
    );

    expect(refused).toMatchObject({ code: 1, built: 0 });
    expect(refused.stderr).toContain(
      'profile: a codex dry run reads campaigns/codex-baseline.dry-run.yaml or campaigns/codex-terra-harness-vs-docs.dry-run.yaml or campaigns/wingfoil-step-a-spike.dry-run.yaml (dl-024, dl-025, dl-027)',
    );
  });

  it("refuses a Codex campaign whose arm's MCP server Codex cannot be given, building nothing (task-105 review round 1)", async () => {
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
    writeFileSync(
      join(root, 'arms', 'baseline', 'arm.yaml'),
      'name: baseline\nsetup: setup.sh\nmanual: manual.md\nmcp: mcp.json\n',
    );
    writeFileSync(
      join(root, 'arms', 'baseline', 'mcp.json'),
      JSON.stringify({ mcpServers: { web: { type: 'http', url: 'https://example.org' } } }),
    );
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', fakeAuthFile());

    const refused = await cli(['campaign', 'run', file, '--allow-spending'], root, () =>
      Date.parse('2026-10-24T12:00:00Z'),
    );

    expect(refused).toMatchObject({ code: 1, built: 0 });
    expect(refused.stderr).toContain(
      'arms/baseline/mcp.json: web: only stdio servers with a command are rendered for Codex',
    );
  });

  it('refuses a Codex dry run of an arm whose MCP server Codex cannot be given, building nothing (task-105 review round 2)', async () => {
    const { root } = writeRepo();
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    writeFileSync(
      join(root, 'arms', 'baseline', 'arm.yaml'),
      'name: baseline\nsetup: setup.sh\nmanual: manual.md\nmcp: mcp.json\n',
    );
    writeFileSync(
      join(root, 'arms', 'baseline', 'mcp.json'),
      JSON.stringify({ mcpServers: { web: { type: 'http', url: 'https://example.org' } } }),
    );
    const profile = parse(readFileSync(repoPath('campaigns/codex-baseline.dry-run.yaml'), 'utf8')) as Record<
      string,
      unknown
    >;
    delete profile.arm_digests;
    writeFileSync(join(root, 'campaigns', 'codex-baseline.dry-run.yaml'), stringify(profile));
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', fakeAuthFile());

    const refused = await cli(
      [
        'scenario',
        'dry-run',
        'S1@1.0',
        '--arm',
        'baseline',
        '--model',
        'gpt-6.1-sol',
        '--profile',
        join(root, 'campaigns', 'codex-baseline.dry-run.yaml'),
        '--allow-spending',
      ],
      root,
      () => Date.parse('2026-10-24T12:00:00Z'),
    );

    expect(refused).toMatchObject({ code: 1, built: 0 });
    expect(refused.stderr).toContain(
      'arms/baseline/mcp.json: web: only stdio servers with a command are rendered for Codex',
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
      'profile: a codex dry run reads campaigns/codex-baseline.dry-run.yaml or campaigns/codex-terra-harness-vs-docs.dry-run.yaml or campaigns/wingfoil-step-a-spike.dry-run.yaml (dl-024, dl-025, dl-027)',
    );
  });
});
