import {
  chmodSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stringify } from 'yaml';

import { main } from '../../../src/cli/index.js';
import { campaignRequirements } from '../../../src/cli/preflight.js';
import { checkSpending, portsFor } from '../../../src/cli/shared.js';
import { checkCampaign } from '../../../src/runner/index.js';
import type { CheckedCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { priceCampaign } from '../../support/dry-run-fixture.js';
import { doubles } from '../../support/runner-doubles.js';
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
    writeFileSync(join(checkout, '.git', 'HEAD'), 'ref: refs/heads/main\n');
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

  it('says invalid for a link outside every checkout to a file inside one: the file is where it really is', () => {
    const checkout = tempDir('bench-codex-checkout-');
    mkdirSync(join(checkout, '.git'));
    writeFileSync(join(checkout, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    const inside = join(checkout, 'auth.json');
    writeFileSync(inside, '{}');
    chmodSync(inside, 0o600);
    const link = join(tempDir('bench-codex-link-'), 'auth.json');
    symlinkSync(inside, link);

    expect(campaignRequirements(codexCampaign(), { BENCH_CODEX_AUTH_FILE: link })[0]).toEqual(
      expect.objectContaining({ state: 'invalid', problem: `${link} is inside a git checkout` }),
    );
  });

  it('says invalid for a file whose directory others can enter (dl-019 bound 2: mode 700)', () => {
    const file = authFile();
    const dir = join(file, '..');
    chmodSync(dir, 0o755);
    expect(campaignRequirements(codexCampaign(), { BENCH_CODEX_AUTH_FILE: file })[0]).toEqual(
      expect.objectContaining({
        state: 'invalid',
        problem: `${file} must be in a directory of mode 700, not 755`,
      }),
    );
  });

  it('takes an empty .git, or a .git file with no gitdir, for no checkout (bug-022)', () => {
    for (const make of [
      (dir: string) => mkdirSync(join(dir, '.git')),
      (dir: string) => writeFileSync(join(dir, '.git'), 'not a worktree\n'),
    ]) {
      const outer = tempDir('bench-codex-stray-');
      make(outer);
      const dir = join(outer, 'credential');
      mkdirSync(dir, { mode: 0o700 });
      const file = join(dir, 'auth.json');
      writeFileSync(file, '{}');
      chmodSync(file, 0o600);
      expect(campaignRequirements(codexCampaign(), { BENCH_CODEX_AUTH_FILE: file })[0]?.state).toBe('set');
    }
  });

  it('takes a .git directory holding HEAD, or a .git file naming its gitdir, for a checkout (bug-022)', () => {
    const repo = tempDir('bench-codex-repo-');
    mkdirSync(join(repo, '.git'));
    writeFileSync(join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    const worktree = tempDir('bench-codex-wt-');
    writeFileSync(join(worktree, '.git'), 'gitdir: /elsewhere/.git/worktrees/x\n');
    for (const root of [repo, worktree]) {
      const file = join(root, 'auth.json');
      writeFileSync(file, '{}');
      chmodSync(file, 0o600);
      expect(campaignRequirements(codexCampaign(), { BENCH_CODEX_AUTH_FILE: file })[0]).toEqual(
        expect.objectContaining({ state: 'invalid', problem: `${file} is inside a git checkout` }),
      );
    }
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

  it('gives the runner the real path of a linked credential, which is what Docker mounts and reports (review 2)', () => {
    const file = authFile();
    const link = join(tempDir('bench-codex-link-'), 'auth.json');
    symlinkSync(file, link);
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', link);
    const spending = checkSpending(codexCampaign().campaign.spec, {
      allowSpending: true,
      builds: [],
      refusal: { path: 'x', message: 'y' },
    });
    expect(spending.ok && spending.value.credentialFile).toBe(realpathSync(file));
  });

  it('refuses a run whose credential holds no value to scrub, such as the placeholder before the login', () => {
    const file = authFile();
    writeFileSync(file, '{}');
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', file);
    const spending = checkSpending(codexCampaign().campaign.spec, {
      allowSpending: true,
      builds: [],
      refusal: { path: 'x', message: 'y' },
    });
    expect(spending.ok ? [] : spending.issues.map((issue) => `${issue.path}: ${issue.message}`)).toEqual([
      'BENCH_CODEX_AUTH_FILE: holds no credential value: log in first (dl-019 bound 3)',
    ]);
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

describe('bench campaign run with Codex (review 2)', () => {
  it('scrubs what it stores with the credential as a refresh during the run left it', async () => {
    const pins = {
      ...completeCampaignYaml(),
      harnesses: {},
      arms: ['baseline'],
      scenarios: [{ id: 'S1', version: '1.0' }],
      repetitions: { S1: 1 },
      agent: CODEX_AGENT,
      models: { default: 'gpt-6.1-sol' },
    };
    const { file } = writeRepo(pins, ['S1@1.0']);
    // dl-024: a Codex campaign extends presets/baseline-across-agents.yaml (task-102).
    mkdirSync(join(dirname(file), 'presets'));
    writeFileSync(
      join(dirname(file), 'presets', 'baseline-across-agents.yaml'),
      stringify({ description: 'the baseline arm only', ...pins }),
    );
    writeFileSync(file, stringify({ extends: 'presets/baseline-across-agents.yaml' }));
    priceCampaign(file);
    const auth = authFile();
    vi.stubEnv('BENCH_CODEX_AUTH_FILE', auth);
    const refreshed = 'at-refreshed-by-codex-0000003';
    let stepped = false;
    const ports = doubles({
      // Codex refreshes its credential while the step runs; the step's patch then holds the new value.
      onStep: () => {
        writeFileSync(auth, JSON.stringify({ tokens: { access_token: refreshed } }));
        stepped = true;
      },
      patchOf: () => (stepped ? `+token=${refreshed}\n` : '+setup\n'),
    });
    let output = '';
    const io = {
      stdout: (text: string) => (output += text),
      stderr: (text: string) => (output += text),
      // dl-024's scope, read against a fixed day so that the test is not dated (review round 1).
      now: () => Date.parse('2026-10-24T12:00:00Z'),
    };

    const code = await main(['campaign', 'run', file, '--allow-spending'], io, {
      docker: ports.docker,
      git: ports.git,
      agent: ports.agent,
    });

    expect({ code, output }).toEqual({
      code: 0,
      output: expect.stringContaining('1 run completed, 0 failed'),
    });
    const results = join(file, '..', '..', 'results');
    const patches = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? patches(join(dir, entry.name))
          : entry.name === 'diff.patch'
            ? [readFileSync(join(dir, entry.name), 'utf8')]
            : [],
      );
    const stored = patches(results).join('');
    expect(stored).toContain('[redacted]');
    expect(stored).not.toContain(refreshed);
  });
});
