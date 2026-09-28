import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { agentCredential, checkCampaign, main, realPorts } from '../../../src/cli/index.js';
import { doubles } from '../../support/runner-doubles.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

async function run(...argv: string[]) {
  return runWith(undefined, ...argv);
}

/** Runs the command line against the given ports, so no Docker, git or agent is needed. */
async function runWith(ports: ReturnType<typeof doubles> | undefined, ...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const io = { stdout: (text: string) => (stdout += text), stderr: (text: string) => (stderr += text) };
  const code = await main(argv, io, ports && { docker: ports.docker, git: ports.git, agent: ports.agent });
  return { code, stdout, stderr };
}

describe('bench campaign validate', () => {
  it('prints the identity of a valid campaign and exits 0', async () => {
    const { file } = writeRepo();
    const { code, stdout, stderr } = await run('campaign', 'validate', file);
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(stdout).toMatch(/^campaign [0-9a-f]{12} is valid \(4 scenarios, 3 arms\)\n$/);
  });

  it('uses the singular for one scenario and one arm', async () => {
    const { stdout } = await run('campaign', 'validate', repoPath('test/fixtures/campaigns/smoke.yaml'));
    expect(stdout).toMatch(/ is valid \(1 scenario, 1 arm\)\n$/);
  });

  it('prints one line per issue and exits 1 on an invalid campaign', async () => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = { wingfoil: { tool: 'wingfoil', version: 'latest' } };
    yaml.arms = ['wingfoil'];
    const { code, stdout, stderr } = await run('campaign', 'validate', writeRepo(yaml).file);
    expect({ code, stdout }).toEqual({ code: 1, stdout: '' });
    expect(stderr.trimEnd().split('\n')).toEqual([
      "harnesses.wingfoil.version: 'latest' is not pinned: use a released version or a commit SHA",
      'arms: must include the baseline arm',
    ]);
  });

  it('prints the usage on stdout and exits 0 when asked for help', async () => {
    const { code, stdout, stderr } = await run('--help');
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(stdout).toMatch(/^usage: bench campaign validate <file>\n/);
  });

  it.each([
    [['campaign', 'validate', '--help']],
    [['campaign', 'validate', '']],
    [['campaign', 'validate', '-']],
  ])('treats a flag or an empty file name as a usage error (%j)', async (argv) => {
    const { code, stderr } = await run(...argv);
    expect(code).toBe(2);
    expect(stderr).toMatch(
      /^usage: bench campaign validate <file>\n\s+bench campaign run <file> \[--allow-spending\]\n\s+bench scenario validate <id>@<version> \[--holdout <path>\]\n$/,
    );
  });

  it.each([
    [[]],
    [['campaign']],
    [['campaign', 'validate']],
    [['campaign', 'validate', 'a.yaml', 'b.yaml']],
    [['campaign', 'estimate', 'a.yaml']],
    // `scenario validate` exists since task-016; a scenario verb that does not is still a usage error.
    [['scenario', 'estimate', 'S1@1.0']],
  ])('exits 2 with the usage on a usage error (%j)', async (argv) => {
    const { code, stdout, stderr } = await run(...argv);
    expect({ code, stdout }).toEqual({ code: 2, stdout: '' });
    expect(stderr).toMatch(
      /^usage: bench campaign validate <file>\n\s+bench campaign run <file> \[--allow-spending\]\n\s+bench scenario validate <id>@<version> \[--holdout <path>\]\n$/,
    );
  });
});

describe('bench campaign run', () => {
  function fakeCampaign(): Record<string, unknown> {
    return {
      ...completeCampaignYaml(),
      harnesses: {},
      arms: ['baseline'],
      scenarios: [{ id: 'S1', version: '1.0' }],
      repetitions: { S1: 1 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
    };
  }

  it('does not pretend the spending flag means anything to validate', async () => {
    const { file } = writeRepo(completeCampaignYaml());
    let stderr = '';
    const code = await main(['campaign', 'validate', file, '--allow-spending'], {
      stdout: () => undefined,
      stderr: (text) => (stderr += text),
    });
    expect(code).toBe(2);
    expect(stderr).toMatch(/^usage: bench/);
  });

  it('needs BENCH_WINGFOIL_REPO for a campaign with a wingfoil harness, before anything is built', async () => {
    const yaml = {
      ...fakeCampaign(),
      arms: ['baseline', 'wingfoil'],
      harnesses: { wingfoil: { tool: 'wingfoil', version: '3df305e' } },
    };
    const { file } = writeRepo(yaml, ['S1@1.0']);
    const previous = process.env.BENCH_WINGFOIL_REPO;
    delete process.env.BENCH_WINGFOIL_REPO;
    try {
      const ports = doubles();
      const { code, stderr } = await runWith(ports, 'campaign', 'run', file);
      expect(code).toBe(1);
      expect(stderr).toMatch(/^BENCH_WINGFOIL_REPO: is not set: it names the local WingFoil clone/);
      expect(ports.recorded.builds).toEqual([]);

      process.env.BENCH_WINGFOIL_REPO = '/clones/wingfoil';
      const next = doubles();
      await runWith(next, 'campaign', 'run', file);
      expect(next.recorded.gitCalls[0]).toBe('resolve /clones/wingfoil 3df305e');
    } finally {
      if (previous === undefined) delete process.env.BENCH_WINGFOIL_REPO;
      else process.env.BENCH_WINGFOIL_REPO = previous;
    }
  });

  it('refuses to spend before anything runs, not after the image is built', async () => {
    const { file } = writeRepo(completeCampaignYaml());
    const ports = doubles();
    const { code, stdout, stderr } = await runWith(ports, 'campaign', 'run', file);
    expect({ code, stdout }).toEqual({ code: 1, stdout: '' });
    expect(stderr).toMatch(/spends real money/);
    // Nothing was built and no container was created: the refusal comes first.
    expect(ports.recorded.builds).toEqual([]);
    expect(ports.recorded.creates).toEqual([]);
  });

  it('runs a real agent once the opt-in is given, and hands its container the credential', async () => {
    const token = 'sk-ant-oat01-SECRET';
    const tokenFile = join(tempDir('bench-token-'), 'token');
    // Written the way a paste leaves it, so the stripping is part of what this pins.
    writeFileSync(tokenFile, `${token}\n`);
    const { file } = writeRepo(completeCampaignYaml());
    const ports = doubles();
    const previous = process.env.BENCH_AGENT_TOKEN_FILE;
    process.env.BENCH_AGENT_TOKEN_FILE = tokenFile;
    // The complete campaign pins a WingFoil harness, which is built from a clone (REQ-RUN-14).
    const previousRepo = process.env.BENCH_WINGFOIL_REPO;
    process.env.BENCH_WINGFOIL_REPO = '/clones/wingfoil';
    try {
      const { code } = await runWith(ports, 'campaign', 'run', file, '--allow-spending');
      expect(code).toBe(0);
      expect(ports.recorded.builds).toHaveLength(1);
      // The credential reaches the container, stripped, under the variable the spike proved works.
      // The credential, and the runner's own setting that turns the agent's auto-memory off (bug-006).
      expect(ports.recorded.creates[0]?.env).toEqual({
        CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
        ANTHROPIC_AUTH_TOKEN: token,
      });
    } finally {
      if (previous === undefined) Reflect.deleteProperty(process.env, 'BENCH_AGENT_TOKEN_FILE');
      else process.env.BENCH_AGENT_TOKEN_FILE = previous;
      if (previousRepo === undefined) Reflect.deleteProperty(process.env, 'BENCH_WINGFOIL_REPO');
      else process.env.BENCH_WINGFOIL_REPO = previousRepo;
    }
  });

  it('asks for the fake agent script when it runs without injected ports', async () => {
    const previous = process.env.BENCH_FAKE_SCRIPT;
    delete process.env.BENCH_FAKE_SCRIPT;
    try {
      const { file } = writeRepo(fakeCampaign(), ['S1@1.0']);
      const { code, stderr } = await run('campaign', 'run', file);
      expect(code).toBe(1);
      expect(stderr).toMatch(/^BENCH_FAKE_SCRIPT: is not set/);
    } finally {
      if (previous !== undefined) process.env.BENCH_FAKE_SCRIPT = previous;
    }
  });

  it('refuses an invalid campaign with one line per issue', async () => {
    const yaml = fakeCampaign();
    yaml.arms = ['wingfoil'];
    const { code, stderr } = await runWith(doubles(), 'campaign', 'run', writeRepo(yaml, ['S1@1.0']).file);
    expect({ code, stderr }).toEqual({ code: 1, stderr: 'arms: must include the baseline arm\n' });
  });

  it('runs the campaign and reports where its execution was stored', async () => {
    const { file } = writeRepo(fakeCampaign(), ['S1@1.0']);
    const ports = doubles();
    const { code, stdout, stderr } = await runWith(ports, 'campaign', 'run', file);
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(stdout).toMatch(/^campaign [0-9a-f]{12}, execution 1\n/);
    expect(stdout).toMatch(/run S1@1\.0\/baseline\/fake-model\/r1\n/);
    expect(stdout).toMatch(/1 run completed, 0 failed\n$/);
    expect(ports.recorded.creates).toHaveLength(1);
  });

  it('reports a campaign that cannot start at all, instead of crashing', async () => {
    const { file } = writeRepo(fakeCampaign(), ['S1@1.0']);
    const ports = doubles();
    const docker = {
      ...ports.docker,
      build: () => Promise.reject(new Error('Cannot connect to the Docker daemon')),
    };
    const { code, stderr } = await runWith({ ...ports, docker }, 'campaign', 'run', file);
    expect(code).toBe(1);
    expect(stderr).toMatch(/^campaign: Cannot connect to the Docker daemon\n$/);
  });

  it('exits 1 when a run fails, and says which', async () => {
    const { file } = writeRepo(fakeCampaign(), ['S1@1.0']);
    const ports = doubles({
      onStep: () => {
        throw new Error('the agent gave up');
      },
    });
    const { code, stdout, stderr } = await runWith(ports, 'campaign', 'run', file);
    expect(code).toBe(1);
    expect(stdout).toMatch(/0 runs completed, 1 failed\n$/);
    expect(stderr).toMatch(/^run S1@1\.0\/baseline\/fake-model\/r1 failed: the agent gave up\n$/);
  });
});

describe('checkCampaign', () => {
  it('loads every scenario the campaign names, in order', () => {
    const { root, file } = writeRepo();
    const result = checkCampaign(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scenarios.map((s) => s.dir)).toEqual(
      ['S1', 'S2', 'S3', 'S8'].map((id) => `${root}/scenarios/${id}/1.0`),
    );
  });

  it('reports scenarios that do not load, naming the entry and the scenario', () => {
    const result = checkCampaign(writeRepo(completeCampaignYaml(), ['S1@1.0', 'S2@1.0', 'S8@1.0']).file);
    expect(result.ok ? [] : result.issues).toEqual([
      { path: 'scenarios[2]', message: expect.stringMatching(/^S3@1\.0: scenario\.yaml not found/) },
    ]);
  });

  it('reports an invalid campaign without loading scenarios', () => {
    const yaml = completeCampaignYaml();
    yaml.arms = ['wingfoil'];
    const result = checkCampaign(writeRepo(yaml, []).file);
    expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual(['arms']);
  });
});

describe('realPorts', () => {
  const variable = 'BENCH_FAKE_SCRIPT';

  /** A checked campaign, which `realPorts` needs for the campaign's currency rate. */
  function campaign() {
    const yaml = completeCampaignYaml();
    yaml.harnesses = {};
    yaml.arms = ['baseline'];
    yaml.scenarios = [{ id: 'S1', version: '1.0' }];
    yaml.repetitions = { S1: 1 };
    yaml.agent = { name: 'fake', version: '1.0.0' };
    yaml.models = { default: 'fake-model' };
    const checked = checkCampaign(writeRepo(yaml, ['S1@1.0']).file);
    if (!checked.ok) throw new Error('the fixture campaign must be valid');
    return checked.value;
  }

  function withScript<T>(value: string | undefined, body: () => T): T {
    const previous = process.env[variable];
    if (value === undefined) Reflect.deleteProperty(process.env, variable);
    else process.env[variable] = value;
    try {
      return body();
    } finally {
      if (previous === undefined) Reflect.deleteProperty(process.env, variable);
      else process.env[variable] = previous;
    }
  }

  it('refuses to spend without an explicit opt-in, naming the ceiling it would run against', async () => {
    const yaml = completeCampaignYaml();
    yaml.agent = { name: 'claude-code', version: '2.1.280' };
    const { file } = writeRepo(yaml);
    let stderr = '';

    const code = await main(['campaign', 'run', file], {
      stdout: () => undefined,
      stderr: (text) => (stderr += text),
    });

    expect(code).toBe(1);
    // It names the money, not the flag alone: whoever runs it should see what they would authorise.
    expect(stderr).toMatch(/--allow-spending/);
    expect(stderr).toMatch(/100/);
  });

  it("asks for the file holding the agent's token when the variable is not set", async () => {
    const yaml = completeCampaignYaml();
    const { file } = writeRepo(yaml);
    const previous = process.env.BENCH_AGENT_TOKEN_FILE;
    Reflect.deleteProperty(process.env, 'BENCH_AGENT_TOKEN_FILE');
    let stderr = '';
    try {
      const code = await main(['campaign', 'run', file, '--allow-spending'], {
        stdout: () => undefined,
        stderr: (text) => (stderr += text),
      });
      expect(code).toBe(1);
      expect(stderr).toMatch(/BENCH_AGENT_TOKEN_FILE: is not set/);
    } finally {
      if (previous !== undefined) process.env.BENCH_AGENT_TOKEN_FILE = previous;
    }
  });

  it('asks for the fake agent script when the variable is not set', () => {
    const result = withScript(undefined, () => realPorts(campaign()));
    expect(result.ok ? [] : result.issues).toEqual([
      { path: variable, message: "is not set: it holds the fake agent's script" },
    ]);
  });

  it('reports a script that cannot be read', () => {
    const result = withScript(join(tempDir('bench-script-'), 'missing.json'), () => realPorts(campaign()));
    expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual(['missing.json']);
  });

  it('builds the Claude Code adapter when the campaign pins it, with the credential it must scrub', () => {
    const yaml = completeCampaignYaml();
    const checked = checkCampaign(writeRepo(yaml).file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    const result = realPorts(checked.value, { ANTHROPIC_AUTH_TOKEN: 'sk-ant-oat01-SECRET' });

    // No fake script is read: the campaign pins a real agent, so the script variable is irrelevant.
    expect(result.ok && Object.keys(result.value).sort()).toEqual(['agent', 'docker', 'git']);
  });

  it('gives the adapter the credential it must scrub, not an empty one', async () => {
    const token = 'sk-ant-oat01-SECRET';
    const checked = checkCampaign(writeRepo(completeCampaignYaml()).file);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const ports = realPorts(checked.value, { ANTHROPIC_AUTH_TOKEN: token });
    expect(ports.ok).toBe(true);
    if (!ports.ok) return;

    // A session whose output happens to echo the token back: the adapter holds the token for
    // exactly this, and an adapter built with an empty one would store the secret verbatim.
    const outcome = await ports.value.agent.runStep({
      scenarioId: 'S1',
      step: 1,
      prompt: 'x',
      model: 'claude-sonnet-5',
      sessionId: 'session-1',
      remainingCostUsd: 1,
      run: () =>
        Promise.resolve({
          code: 0,
          stdout: `{"type":"result","is_error":false,"terminal_reason":"completed","leaked":"${token}"}`,
          stderr: '',
        }),
    });

    expect(outcome.transcript.join('')).not.toContain(token);
    expect(outcome.transcript.join('')).toContain('[redacted]');
  });

  it("reads the agent's credential from the file the operator names", () => {
    const file = join(tempDir('bench-token-'), 'token');
    writeFileSync(file, 'sk-ant-oat01-AAAA\n');
    const previous = process.env.BENCH_AGENT_TOKEN_FILE;
    process.env.BENCH_AGENT_TOKEN_FILE = file;
    try {
      const result = agentCredential();
      expect(result.ok && result.value).toEqual({ ANTHROPIC_AUTH_TOKEN: 'sk-ant-oat01-AAAA' });
    } finally {
      if (previous === undefined) Reflect.deleteProperty(process.env, 'BENCH_AGENT_TOKEN_FILE');
      else process.env.BENCH_AGENT_TOKEN_FILE = previous;
    }
  });

  it('reports a token file it cannot read, before any container is created', () => {
    const previous = process.env.BENCH_AGENT_TOKEN_FILE;
    process.env.BENCH_AGENT_TOKEN_FILE = join(tempDir('bench-token-'), 'missing');
    try {
      const result = agentCredential();
      expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual(['missing']);
    } finally {
      if (previous === undefined) Reflect.deleteProperty(process.env, 'BENCH_AGENT_TOKEN_FILE');
      else process.env.BENCH_AGENT_TOKEN_FILE = previous;
    }
  });

  it('builds the Docker, git and agent ports from a valid script', () => {
    const file = join(tempDir('bench-script-'), 'script.json');
    writeFileSync(file, JSON.stringify({ T0: { '1': { commands: ['true'] } } }));
    const result = withScript(file, () => realPorts(campaign()));
    expect(result.ok && Object.keys(result.value).sort()).toEqual(['agent', 'docker', 'git']);
  });
});
