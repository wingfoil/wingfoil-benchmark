import { describe, expect, it } from 'vitest';

import { dockerCli, gitCli } from '../../../src/core/index.js';
import type { ProcessPort, ProcessResult } from '../../../src/core/index.js';

/** A process port that records its calls and answers with scripted results. */
interface Call {
  command: string;
  args: string[];
  env?: Readonly<Record<string, string | undefined>>;
}

function recorder(results: ProcessResult[] = []): ProcessPort & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    run: (command, args, options) => {
      calls.push({ command, args: [...args], ...(options?.env ? { env: options.env } : {}) });
      return Promise.resolve(results.shift() ?? { code: 0, stdout: '', stderr: '' });
    },
  };
}

const ok = (stdout = ''): ProcessResult => ({ code: 0, stdout, stderr: '' });

describe('the Docker port', () => {
  it('builds an image from a Dockerfile, a context and build arguments', async () => {
    const process = recorder([ok()]);
    await dockerCli(process).build({
      dockerfile: '/repo/docker/run-image/Dockerfile',
      context: '/repo/docker/run-image',
      tag: 'abc123',
      buildArgs: { AGENT_NAME: 'fake', AGENT_VERSION: '1.0.0' },
    });
    expect(process.calls).toEqual([
      {
        command: 'docker',
        args: [
          'build',
          '--file',
          '/repo/docker/run-image/Dockerfile',
          '--tag',
          'abc123',
          '--build-arg',
          'AGENT_NAME=fake',
          '--build-arg',
          'AGENT_VERSION=1.0.0',
          '/repo/docker/run-image',
        ],
      },
    ]);
  });

  it('creates a container whose only mount is the workspace', async () => {
    const process = recorder([ok('c0ffee\n')]);
    const id = await dockerCli(process).create({
      image: 'abc123',
      name: 'bench-abc123-1',
      workspace: '/repo/runs/abc123/1/w',
      user: 'node',
    });
    expect(id).toBe('c0ffee');
    expect(process.calls[0]?.args).toEqual([
      'create',
      '--name',
      'bench-abc123-1',
      '--user',
      'node',
      '--workdir',
      '/workspace',
      '--mount',
      'type=bind,source=/repo/runs/abc123/1/w,target=/workspace',
      'abc123',
      'sleep',
      'infinity',
    ]);
  });

  it('runs a command in the container and reports its outcome', async () => {
    const process = recorder([{ code: 3, stdout: 'out', stderr: 'err' }]);
    const result = await dockerCli(process).exec('c0ffee', ['sh', '-c', 'echo hi']);
    expect(result).toEqual({ code: 3, stdout: 'out', stderr: 'err' });
    expect(process.calls[0]?.args).toEqual(['exec', 'c0ffee', 'sh', '-c', 'echo hi']);
  });

  it('lists the mounts of a container', async () => {
    const process = recorder([ok('/repo/runs/abc123/1/w:/workspace\n')]);
    const mounts = await dockerCli(process).mountsOf('c0ffee');
    expect(mounts).toEqual(['/repo/runs/abc123/1/w:/workspace']);
    expect(process.calls[0]?.args[0]).toBe('inspect');
  });

  it('starts and removes a container', async () => {
    const process = recorder([ok(), ok()]);
    const docker = dockerCli(process);
    await docker.start('c0ffee');
    await docker.remove('c0ffee');
    expect(process.calls.map((call) => call.args.slice(0, 2))).toEqual([
      ['start', 'c0ffee'],
      ['rm', '--force'],
    ]);
  });

  it('fails with the command and its error output when docker fails', async () => {
    const process = recorder([{ code: 1, stdout: '', stderr: 'no such image' }]);
    await expect(dockerCli(process).start('c0ffee')).rejects.toThrow(/docker start.*no such image/s);
  });
});

describe('the git port', () => {
  /** The arguments after the `-c` settings: what git is actually asked to do, and where. */
  function command(args: readonly string[]): string[] {
    const directory = args.indexOf('-C');
    return [...args.slice(directory)];
  }

  it('initializes a repository and commits everything with the benchmark identity', async () => {
    const process = recorder([ok(), ok(), ok()]);
    const git = gitCli(process);
    await git.init('/repo/runs/w');
    await git.commitAll('/repo/runs/w', 'seed');
    expect(process.calls.map((call) => command(call.args))).toEqual([
      ['-C', '/repo/runs/w', 'init', '--quiet', '--initial-branch=main'],
      ['-C', '/repo/runs/w', 'add', '--all'],
      ['-C', '/repo/runs/w', 'commit', '--quiet', '--message', 'seed'],
    ]);
    expect(process.calls[0]?.args).toContain('user.name=WingFoil Benchmark');
    expect(process.calls[0]?.args).toContain('user.email=benchmark@localhost');
  });

  it('keeps the host git environment out of the run', async () => {
    const process = recorder([ok()]);
    await gitCli(process).init('/repo/runs/w');
    const env = process.calls[0]?.env ?? {};
    // Removed, not emptied: git refuses an empty GIT_DIR instead of ignoring it.
    for (const name of [
      'GIT_DIR',
      'GIT_COMMON_DIR',
      'GIT_WORK_TREE',
      'GIT_INDEX_FILE',
      'GIT_OBJECT_DIRECTORY',
      'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    ]) {
      expect(name in env).toBe(true);
      expect(env[name]).toBeUndefined();
    }
    expect(env).toMatchObject({
      GIT_TEMPLATE_DIR: '',
      GIT_AUTHOR_NAME: 'WingFoil Benchmark',
      GIT_AUTHOR_EMAIL: 'benchmark@localhost',
      GIT_COMMITTER_NAME: 'WingFoil Benchmark',
      GIT_COMMITTER_EMAIL: 'benchmark@localhost',
    });
  });

  it('refuses a workspace path that would break the mount specification', async () => {
    const process = recorder([ok('c0ffee\n')]);
    await expect(
      dockerCli(process).create({ image: 'abc', name: 'bench-abc', workspace: '/repo/a,b/w', user: 'node' }),
    ).rejects.toThrow(/workspace path .* comma/);
    expect(process.calls).toEqual([]);
  });

  it('keeps the host git configuration, its templates and its hooks out of the run', async () => {
    const process = recorder([ok(), ok(), ok()]);
    const git = gitCli(process);
    await git.init('/repo/runs/w');
    expect(process.calls[0]?.env).toMatchObject({ GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });
    const args = process.calls[0]?.args ?? [];
    expect(args).toContain('init.templateDir=');
    expect(args).toContain('core.hooksPath=');
    expect(args).toContain('commit.gpgsign=false');
  });
});
