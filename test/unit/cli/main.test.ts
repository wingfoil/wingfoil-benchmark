import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkCampaign, main, realPorts } from '../../../src/cli/index.js';
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
    expect(stderr).toMatch(/^usage: bench campaign validate <file>\n\s+bench campaign run <file>\n$/);
  });

  it.each([
    [[]],
    [['campaign']],
    [['campaign', 'validate']],
    [['campaign', 'validate', 'a.yaml', 'b.yaml']],
    [['campaign', 'estimate', 'a.yaml']],
    [['scenario', 'validate', 'S1@1.0']],
  ])('exits 2 with the usage on a usage error (%j)', async (argv) => {
    const { code, stdout, stderr } = await run(...argv);
    expect({ code, stdout }).toEqual({ code: 2, stdout: '' });
    expect(stderr).toMatch(/^usage: bench campaign validate <file>\n\s+bench campaign run <file>\n$/);
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

  it('refuses an agent that has no adapter yet, before anything runs', async () => {
    const { file } = writeRepo(completeCampaignYaml());
    const ports = doubles();
    const { code, stdout, stderr } = await runWith(ports, 'campaign', 'run', file);
    expect({ code, stdout }).toEqual({ code: 1, stdout: '' });
    expect(stderr).toBe("agent: 'claude-code' is not available yet: W1 runs the scripted fake agent\n");
    expect(ports.recorded.builds).toEqual([]);
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

  it('exits 1 when a run fails, and says which', async () => {
    const { file } = writeRepo(fakeCampaign(), ['S1@1.0']);
    const ports = doubles({
      onStep: () => {
        throw new Error('the agent gave up');
      },
    });
    const { code, stdout } = await runWith(ports, 'campaign', 'run', file);
    expect(code).toBe(1);
    expect(stdout).toMatch(/0 runs completed, 1 failed\n$/);
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

  it('asks for the fake agent script when the variable is not set', () => {
    const result = withScript(undefined, () => realPorts());
    expect(result.ok ? [] : result.issues).toEqual([
      { path: variable, message: "is not set: it holds the fake agent's script" },
    ]);
  });

  it('reports a script that cannot be read', () => {
    const result = withScript(join(tempDir('bench-script-'), 'missing.json'), () => realPorts());
    expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual(['missing.json']);
  });

  it('builds the Docker, git and agent ports from a valid script', () => {
    const file = join(tempDir('bench-script-'), 'script.json');
    writeFileSync(file, JSON.stringify({ T0: { '1': ['true'] } }));
    const result = withScript(file, () => realPorts());
    expect(result.ok && Object.keys(result.value).sort()).toEqual(['agent', 'docker', 'git']);
  });
});
