import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseConfigureArguments } from '../../../src/cli/configure.js';
import { checkConfigure } from '../../../src/runner/configure.js';
import {
  benchConfigure,
  configurePorts,
  configureRepo,
  writeFiles,
} from '../../support/configure-fixture.js';
import { writeArmAt } from '../../support/arm-fixture.js';

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
