import { chmodSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseConfigureArguments } from '../../../src/cli/configure.js';
import { checkConfigure, runConfigure } from '../../../src/runner/configure.js';
import {
  benchConfigure,
  configurePorts,
  configureRepo,
  writeFiles,
} from '../../support/configure-fixture.js';
import { writeArmAt } from '../../support/arm-fixture.js';
import { configuredRecord, writeConfiguration } from '../../support/configured-fixture.js';

beforeEach(() => {
  vi.stubEnv('BENCH_WINGFOIL_REPO', '/clones/wingfoil');
  vi.stubEnv('BENCH_SPECKIT_REPO', '/clones/spec-kit');
  vi.stubEnv('BENCH_HOLDOUT_PATH', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("bench scenario configure's arguments (REQ-CLI-14, task-141)", () => {
  it('reads the version, the arm and the two flags, in any order', () => {
    expect(parseConfigureArguments(['S1@1.1', '--arm', 'wingfoil'])).toEqual({
      id: 'S1',
      version: '1.1',
      arm: 'wingfoil',
      allowSpending: false,
      replace: false,
    });
    expect(parseConfigureArguments(['S1@1.1', '--replace', '--allow-spending', '--arm', 'speckit'])).toEqual({
      id: 'S1',
      version: '1.1',
      arm: 'speckit',
      allowSpending: true,
      replace: true,
    });
  });

  it.each([
    [[]],
    [['S1']],
    [['S1@1.1']],
    [['S1@1.1', '--arm']],
    [['S1@1.1', '--arm', '--replace']],
    [['S1@1.1', '--arm', 'wingfoil', '--arm', 'speckit']],
    [['S1@1.1', '--arm', 'wingfoil', '--replace', '--replace']],
    [['S1@1.1', '--arm', 'wingfoil', '--model', 'x']],
    [['S1@1.1', '--arm', 'wingfoil', 'extra']],
  ])('refuses %j as a usage error', (argv) => {
    expect(parseConfigureArguments(argv)).toBeUndefined();
  });

  it('exits 2 on a usage error, with the usage that names the command', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const result = await benchConfigure(root, ['S1@1.1'], configurePorts('wingfoil'));
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      'bench scenario configure <id>@<version> --arm <harness> [--allow-spending] [--replace]',
    );
  });
});

describe("bench scenario configure's refusals before any session (REQ-RUN-20, task-141)", () => {
  const request = { id: 'S1', version: '1.1', arm: 'wingfoil', replace: false };

  it('refuses an arm that is not a harness arm', () => {
    const root = configureRepo(['S1@1.1'], ['baseline']);
    const checked = checkConfigure({ ...request, arm: 'baseline' }, root);
    expect(checked.ok ? [] : checked.issues).toEqual([
      {
        path: '--arm',
        message: 'baseline is not a harness arm: it requires no harness, and has nothing to configure',
      },
    ]);
  });

  it('refuses a harness arm with no configuration places', () => {
    const root = configureRepo(['S1@1.1'], []);
    writeArmAt(
      join(root, 'arms'),
      'wingfoil',
      { name: 'wingfoil', setup: 'setup.sh', manual: 'manual.md', requires: 'wingfoil', telemetry_off: [] },
      ['setup.sh', 'manual.md'],
    );
    const checked = checkConfigure(request, root);
    expect(checked.ok ? [] : checked.issues).toEqual([
      { path: '--arm', message: 'wingfoil declares no configuration places (REQ-FMT-05 as amended in 1.50)' },
    ]);
  });

  it('refuses an arm whose harness the profile does not pin', () => {
    const root = configureRepo(['S1@1.1'], ['openspec']);
    const file = join(root, 'configuring', 'profile.yaml');
    const profile = parse(readFileSync(file, 'utf8')) as { harnesses: Record<string, unknown> };
    delete profile.harnesses.openspec;
    writeFileSync(file, stringify(profile));
    const checked = checkConfigure({ ...request, arm: 'openspec' }, root);
    expect(checked.ok ? [] : checked.issues).toEqual([
      { path: 'harnesses.openspec', message: "is required: the arm requires the harness 'openspec'" },
    ]);
  });

  it('refuses an arm that does not exist, and a scenario version that does not load', () => {
    const root = configureRepo(['S1@1.1'], []);
    const missing = checkConfigure(request, root);
    expect(missing.ok ? [] : missing.issues.map((issue) => issue.path)).toEqual(['--arm']);
    const unknown = checkConfigure({ ...request, version: '1.9' }, root);
    expect(unknown.ok).toBe(false);
  });

  it("refuses a profile whose model has no pinned effort, as a dry run's (dl-015)", async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil'], 'claude-code');
    const file = join(root, 'configuring', 'profile.yaml');
    const profile = parse(readFileSync(file, 'utf8')) as { agent: Record<string, unknown> };
    delete profile.agent.effort;
    writeFileSync(file, stringify(profile));
    const ports = configurePorts('wingfoil');
    const result = await benchConfigure(root, ['S1@1.1', '--arm', 'wingfoil', '--allow-spending'], ports);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('effort');
    expect(ports.recorded.creates).toEqual([]);
  });

  it('checks the leftover workspace of a session that wrote no record, and refuses it', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    writeFiles(join(root, 'runs', 'configuring', 'S1@1.1', 'wingfoil', '1'), {
      'workspace/README.md': 'x\n',
    });
    const ports = configurePorts('wingfoil');
    const result = await benchConfigure(root, ['S1@1.1', '--arm', 'wingfoil', '--allow-spending'], ports);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('runs/configuring/S1@1.1/wingfoil/1');
    expect(ports.recorded.creates).toEqual([]);
  });
});

describe("the configuring profile's consistency (REQ-RUN-20, task-140's review round 1)", () => {
  it('builds the image a campaign with the same agent builds, and prints the ceiling before the session', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    let printedBefore = '';
    let stdout = '';
    const ports = configurePorts('wingfoil', {
      session: (workspace) => {
        printedBefore = stdout;
        writeFiles(workspace, { '.wingfoil/directives/custom/r9.md': '# Rule\n' });
      },
    });
    const { main } = await import('../../../src/cli/index.js');
    const code = await main(
      ['scenario', 'configure', 'S1@1.1', '--arm', 'wingfoil', '--allow-spending'],
      { stdout: (text) => (stdout += text), stderr: () => undefined },
      ports,
      root,
    );

    expect(code).toBe(0);
    expect(ports.recorded.buildRequests).toHaveLength(1);
    expect(ports.recorded.buildRequests[0]?.dockerfile).toMatch(/docker\/run-image\/Dockerfile$/);
    expect(ports.recorded.buildRequests[0]?.buildArgs).toEqual({
      AGENT_NAME: 'fake',
      AGENT_VERSION: '1.0.0',
    });
    expect(printedBefore).toContain(
      'configure S1@1.1 for wingfoil on fake-model: the session may spend up to 5 EUR',
    );
    expect(stdout).toMatch(/configure S1@1\.1 for wingfoil: written, 0\.0000 EUR/);
    expect(stdout).toContain('scenarios/S1/1.1/configured/wingfoil-configured.json');
  });
});

describe("the records' clock (task-141)", () => {
  it("refuses a session whose version's newest record is dated after the clock, before anything is built", () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const dir = join(root, 'scenarios', 'S1', '1.1');
    writeConfiguration(dir, 'wingfoil-configured', { '.wingfoil/directives/custom/r9.md': '# R\n' });
    const checked = checkConfigure(
      { id: 'S1', version: '1.1', arm: 'wingfoil', replace: true },
      root,
      undefined,
      () => Date.parse('2026-11-08T09:00:00Z'),
    );
    expect(checked.ok ? [] : checked.issues).toEqual([
      {
        path: 'configure',
        message:
          'the newest record of wingfoil-configured is dated 2026-11-08T10:00:00Z, ' +
          "after this machine's clock: check the clock",
      },
    ]);
    expect(
      checkConfigure({ id: 'S1', version: '1.1', arm: 'wingfoil', replace: true }, root, undefined, () =>
        Date.parse('2026-11-08T10:00:00Z'),
      ).ok,
    ).toBe(true);
  });
});

describe('the configuring session: review round 1 (task-141)', () => {
  const RULE = { '.wingfoil/directives/custom/r9.md': '# Rule\n' };
  const usage = (costEur: number) => ({
    inputTokens: 1,
    outputTokens: 1,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUsd: costEur,
    costEur,
    turns: 1,
    durationMs: 1,
  });
  const records = (root: string) =>
    JSON.parse(
      readFileSync(join(root, 'scenarios', 'S1', '1.1', 'configured', 'wingfoil-configured.json'), 'utf8'),
    ) as Record<string, unknown>[];

  async function session(
    root: string,
    ports: ReturnType<typeof configurePorts>,
    options: Partial<Parameters<typeof runConfigure>[1]> = {},
    replace = false,
  ) {
    const checked = checkConfigure({ id: 'S1', version: '1.1', arm: 'wingfoil', replace }, root);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    return {
      checked: checked.value,
      summary: await runConfigure(checked.value, {
        ...ports,
        harnessSources: { wingfoil: '/clones/wingfoil' },
        ...options,
      }),
    };
  }

  it('scrubs the credential from the transcript, the patch and the reason, and refuses a file holding it', async () => {
    const secret = 's3cr3t-token-value';
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const ports = configurePorts('wingfoil', {
      session: (workspace) => writeFiles(workspace, { '.wingfoil/directives/custom/r9.md': `# ${secret}\n` }),
      doubles: { transcriptOf: () => [`{"said":"${secret}"}`] },
    });
    const { summary } = await session(root, ports, { secrets: [secret] });

    expect(summary.record).toMatchObject({
      outcome: 'refused',
      reason: expect.stringContaining('holds a credential'),
    });
    expect(readFileSync(summary.transcript, 'utf8')).not.toContain(secret);
    expect(JSON.stringify(records(root))).not.toContain(secret);
    expect(existsSync(join(root, 'scenarios', 'S1', '1.1', 'arms', 'wingfoil-configured'))).toBe(false);

    const clean = configureRepo(['S1@1.1'], ['wingfoil']);
    const writing = configurePorts('wingfoil', {
      session: (workspace) => writeFiles(workspace, RULE),
      doubles: { patchOf: () => `+ ${secret}\n` },
    });
    await session(clean, writing, { secrets: [secret] });
    const patch = readFileSync(
      join(clean, 'scenarios', 'S1', '1.1', 'configured', 'wingfoil-configured.patch'),
      'utf8',
    );
    expect(patch).not.toContain(secret);
  });

  it('keeps the reported usage when something fails after the session returned', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const ports = configurePorts('wingfoil', {
      session: (workspace) => writeFiles(workspace, RULE),
      doubles: { usageOf: () => usage(0.09) },
    });
    const { summary } = await session(root, {
      ...ports,
      git: { ...ports.git, changesBetween: () => Promise.reject(new Error('git broke')) },
    });
    expect(summary.record).toMatchObject({ outcome: 'failed', cost_eur: 0.09, reason: 'git broke' });
    expect(summary.record).not.toHaveProperty('cost_reported');
  });

  it('records a failed session at its reported cost, and an interrupted one at its bound', async () => {
    const failing = configureRepo(['S1@1.1'], ['wingfoil']);
    const failed = await session(
      failing,
      configurePorts('wingfoil', {
        doubles: { usageOf: () => usage(0.2), errorOf: () => 'the agent crashed' },
      }),
    );
    expect(failed.summary.record).toMatchObject({
      outcome: 'failed',
      cost_eur: 0.2,
      reason: 'the agent crashed',
    });

    const stopping = configureRepo(['S1@1.1'], ['wingfoil']);
    const controller = new AbortController();
    const interrupted = await session(
      stopping,
      configurePorts('wingfoil', { session: () => controller.abort() }),
      { signal: controller.signal },
    );
    expect(interrupted.summary.record).toMatchObject({
      outcome: 'interrupted',
      cost_eur: 5,
      cost_reported: false,
    });
  });

  it('fails a session that completed with no reported cost, and refuses one that changed nothing', async () => {
    const unknown = configureRepo(['S1@1.1'], ['wingfoil']);
    const ports = configurePorts('wingfoil', { session: (workspace) => writeFiles(workspace, RULE) });
    const costUnknown = {
      ...ports,
      agent: {
        ...ports.agent,
        runStep: async (request: Parameters<typeof ports.agent.runStep>[0]) => ({
          ...(await ports.agent.runStep(request)),
          costUnknown: true as const,
        }),
      },
    };
    const first = await session(unknown, costUnknown);
    expect(first.summary.record).toMatchObject({ outcome: 'failed', cost_eur: 5, cost_reported: false });

    const idle = configureRepo(['S1@1.1'], ['wingfoil']);
    const second = await session(idle, configurePorts('wingfoil'));
    expect(second.summary.record).toMatchObject({
      outcome: 'refused',
      reason: 'the session added or changed no configuration file',
    });
  });

  it('writes no record when the setup fails, and leaves nothing that refuses the next session', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const ports = configurePorts('wingfoil', {
      doubles: {
        execResultOf: (command) =>
          command[0] === 'bash' ? { code: 3, stdout: '', stderr: 'no tool\n' } : undefined,
      },
    });
    const result = await benchConfigure(root, ['S1@1.1', '--arm', 'wingfoil', '--allow-spending'], ports);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('the setup of arm wingfoil failed with code 3');
    expect(ports.recorded.steps).toEqual([]);
    expect(existsSync(join(root, 'scenarios', 'S1', '1.1', 'configured'))).toBe(false);
    expect(existsSync(join(root, 'runs', 'configuring', 'S1@1.1', 'wingfoil', '1'))).toBe(false);
    expect(checkConfigure({ id: 'S1', version: '1.1', arm: 'wingfoil', replace: false }, root).ok).toBe(true);
  });

  it('replaces a configuration with --replace, keeps both records, and keeps an executable bit', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const dir = join(root, 'scenarios', 'S1', '1.1');
    writeConfiguration(dir, 'wingfoil-configured', RULE, [
      configuredRecord(RULE, { date: '2026-11-01T10:00:00Z' }),
    ]);
    const ports = configurePorts('wingfoil', {
      session: (workspace) => {
        writeFiles(workspace, { '.wingfoil/hooks/check.sh': '#!/bin/sh\nexit 0\n' });
        chmodSync(join(workspace, '.wingfoil', 'hooks', 'check.sh'), 0o755);
      },
    });
    const { summary } = await session(root, ports, {}, true);

    expect(summary.record.outcome).toBe('written');
    expect(records(root).map((record) => record.outcome)).toEqual(['written', 'written']);
    const configured = join(dir, 'arms', 'wingfoil-configured');
    expect(existsSync(join(configured, '.wingfoil', 'directives', 'custom', 'r9.md'))).toBe(false);
    expect(statSync(join(configured, '.wingfoil', 'hooks', 'check.sh')).mode & 0o111).not.toBe(0);
    expect(summary.loadIssues).toEqual([]);
  });

  it('restores the manual after a failed session too', async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const ports = configurePorts('wingfoil', { doubles: { errorOf: () => 'crashed' } });
    const { checked } = await session(root, ports);
    expect(existsSync(join(checked.workDir, 'workspace', 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(checked.workDir, 'manual-aside'))).toBe(false);
  });
});

describe('the configuring session: review round 2 (task-141)', () => {
  it("removes on a failure before the session only what it made, never another invocation's directory", async () => {
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const checked = checkConfigure({ id: 'S1', version: '1.1', arm: 'wingfoil', replace: false }, root);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    // Another invocation of the same session made it after this one's check.
    writeFiles(checked.value.workDir, { 'workspace/README.md': 'live\n' });
    const ports = configurePorts('wingfoil', {
      doubles: {
        execResultOf: (command) => (command[0] === 'bash' ? { code: 3, stdout: '', stderr: '' } : undefined),
      },
    });

    await expect(
      runConfigure(checked.value, { ...ports, harnessSources: { wingfoil: '/clones/wingfoil' } }),
    ).rejects.toThrow('cannot be claimed');
    expect(readFileSync(join(checked.value.workDir, 'workspace', 'README.md'), 'utf8')).toBe('live\n');
    expect(ports.recorded.builds).toEqual([]);
  });

  it("scrubs the credential from a failed session's reason", async () => {
    const secret = 's3cr3t-token-value';
    const root = configureRepo(['S1@1.1'], ['wingfoil']);
    const checked = checkConfigure({ id: 'S1', version: '1.1', arm: 'wingfoil', replace: false }, root);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const ports = configurePorts('wingfoil', { doubles: { errorOf: () => `the agent printed ${secret}` } });

    const summary = await runConfigure(checked.value, {
      ...ports,
      harnessSources: { wingfoil: '/clones/wingfoil' },
      secrets: [secret],
    });

    expect(summary.record.outcome).toBe('failed');
    expect(summary.record.reason).toContain('the agent printed');
    expect(readFileSync(summary.recordFile, 'utf8')).not.toContain(secret);
  });
});
