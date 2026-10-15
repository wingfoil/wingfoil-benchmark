import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { campaignRequirements } from '../../../src/cli/preflight.js';
import { checkSpending, portsFor } from '../../../src/cli/shared.js';
import { checkCampaign } from '../../../src/runner/index.js';
import type { CheckedCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { tempDir } from '../../support/scenario-fixture.js';

const CODEX_AGENT = { name: 'codex', version: '0.162.1', effort: { 'gpt-6.1-sol': 'medium' } };

function codexCampaign(): CheckedCampaign {
  const checked = checkCampaign(
    writeRepo({ ...completeCampaignYaml(), agent: CODEX_AGENT, models: { default: 'gpt-6.1-sol' } }).file,
  );
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return checked.value;
}

/** An auth.json outside any git checkout, mode 600, holding two fake token values. */
function authFile(mode = 0o600): string {
  const file = join(tempDir('bench-codex-auth-'), 'auth.json');
  writeFileSync(
    file,
    JSON.stringify({
      tokens: { access_token: 'at-fake-value-0000001', refresh_token: 'rt-fake-value-0000002' },
    }),
  );
  chmodSync(file, mode);
  return file;
}

afterEach(() => vi.unstubAllEnvs());

describe("Codex's credential file in the preflight (REQ-RUN-15 as amended in 1.32, dl-019 bound 7)", () => {
  it('asks a Codex campaign for BENCH_CODEX_AUTH_FILE, and not for the Claude token', () => {
    const [first] = campaignRequirements(codexCampaign(), {});
    expect(first).toEqual({
      variable: 'BENCH_CODEX_AUTH_FILE',
      kind: 'Codex credential file',
      neededBy: 'run',
      state: 'missing',
    });
    expect(campaignRequirements(codexCampaign(), {}).map((r) => r.variable)).not.toContain(
      'BENCH_AGENT_TOKEN_FILE',
    );
  });

  it('says set for a regular file of mode 600 outside every git checkout', () => {
    const [first] = campaignRequirements(codexCampaign(), { BENCH_CODEX_AUTH_FILE: authFile() });
    expect(first?.state).toBe('set');
  });

  it('says invalid for a file others can read', () => {
    const file = authFile(0o644);
    expect(campaignRequirements(codexCampaign(), { BENCH_CODEX_AUTH_FILE: file })[0]).toEqual(
      expect.objectContaining({ state: 'invalid', problem: `${file} must be mode 600, not 644` }),
    );
  });

  it("says invalid for a file inside a git checkout: the repository, a worktree or a run's workspace", () => {
    const checkout = tempDir('bench-codex-checkout-');
    mkdirSync(join(checkout, '.git'));
    mkdirSync(join(checkout, 'runs', 'w'), { recursive: true });
    const file = join(checkout, 'runs', 'w', 'auth.json');
    writeFileSync(file, '{}');
    chmodSync(file, 0o600);
    // A linked worktree's .git is a file: the same refusal.
    const worktree = tempDir('bench-codex-worktree-');
    writeFileSync(join(worktree, '.git'), 'gitdir: /elsewhere\n');
    const inWorktree = join(worktree, 'auth.json');
    writeFileSync(inWorktree, '{}');
    chmodSync(inWorktree, 0o600);

    for (const path of [file, inWorktree])
      expect(campaignRequirements(codexCampaign(), { BENCH_CODEX_AUTH_FILE: path })[0]).toEqual(
        expect.objectContaining({ state: 'invalid', problem: `${path} is inside a git checkout` }),
      );
  });

  it('says invalid for a directory', () => {
    const dir = tempDir('bench-codex-dir-');
    expect(campaignRequirements(codexCampaign(), { BENCH_CODEX_AUTH_FILE: dir })[0]).toEqual(
      expect.objectContaining({ state: 'invalid', problem: `${dir} is not a readable file` }),
    );
  });
});

describe("Codex's credential for a run (REQ-RUN-15, REQ-NFR-01 as amended in 1.32)", () => {
  it('gives the runner the file to mount and its values to scrub, and no environment credential', () => {
    const file = authFile();
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', file);
    const spending = checkSpending(codexCampaign().campaign.spec, {
      allowSpending: true,
      builds: [],
      refusal: { path: 'x', message: 'y' },
    });

    expect(spending.ok).toBe(true);
    if (!spending.ok) return;
    expect(spending.value.credentialFile).toBe(file);
    expect(spending.value.credential).toBeUndefined();
    expect([...(spending.value.secrets ?? [])].sort()).toEqual([
      'at-fake-value-0000001',
      'rt-fake-value-0000002',
    ]);
  });

  it('refuses a run whose credential file is missing or invalid, naming the variable only', () => {
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', authFile(0o644));
    const spending = checkSpending(codexCampaign().campaign.spec, {
      allowSpending: true,
      builds: [],
      refusal: { path: 'x', message: 'y' },
    });
    expect(spending.ok ? [] : spending.issues.map((issue) => issue.path)).toEqual(['BENCH_CODEX_AUTH_FILE']);
  });

  it("runs Codex's adapter behind the port", async () => {
    const ports = portsFor(codexCampaign().campaign.spec, undefined, authFile());

    expect(ports.ok).toBe(true);
    if (!ports.ok) return;
    const commands: string[][] = [];
    await ports.value.agent.runStep({
      scenarioId: 'S3',
      step: 1,
      prompt: 'p',
      model: 'gpt-6.1-sol',
      sessionId: 's',
      remainingCostUsd: 1,
      run: (command) => {
        commands.push([...command]);
        return Promise.resolve({ code: 0, stdout: '', stderr: '' });
      },
    });
    expect(commands[0]?.slice(0, 2)).toEqual(['codex', 'exec']);
  });
});
