import { describe, expect, it } from 'vitest';

import { dockerCli, gitCli } from '../../../src/core/index.js';
import type { ProcessPort, ProcessResult } from '../../../src/core/index.js';

/** A process port that records its calls and answers with scripted results. */
interface Call {
  command: string;
  args: string[];
  env?: Readonly<Record<string, string | undefined>>;
  timeoutMs?: number;
}

function recorder(results: ProcessResult[] = []): ProcessPort & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    run: (command, args, options) => {
      calls.push({
        command,
        args: [...args],
        ...(options?.env ? { env: options.env } : {}),
        ...(options?.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      });
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

  it("copies a host path into the container, outside the workspace's mount (REQ-RUN-03)", async () => {
    const process = recorder([ok()]);
    await dockerCli(process).copyTo('c0ffee', '/repo/arms/wingfoil', '/home/node/arm');
    expect(process.calls[0]?.args).toEqual(['cp', '/repo/arms/wingfoil', 'c0ffee:/home/node/arm']);
  });

  it('fails with the command and its error output when a copy fails', async () => {
    const process = recorder([{ code: 1, stdout: '', stderr: 'no such container' }]);
    await expect(dockerCli(process).copyTo('c0ffee', '/a', '/b')).rejects.toThrow(/no such container/);
  });

  it('runs a one-off container with one bind mount, removed when it ends', async () => {
    const process = recorder([{ code: 0, stdout: 'built\n', stderr: '' }]);
    const result = await dockerCli(process).runOnce({
      image: 'abc123',
      user: 'node',
      mount: { source: '/repo/.cache/build', target: '/build' },
      command: ['bash', '-c', 'npm pack'],
    });
    expect(result).toEqual({ code: 0, stdout: 'built\n', stderr: '' });
    expect(process.calls[0]?.args).toEqual([
      'run',
      '--rm',
      '--user',
      'node',
      '--mount',
      'type=bind,source=/repo/.cache/build,target=/build',
      'abc123',
      'bash',
      '-c',
      'npm pack',
    ]);
  });

  it('refuses a build path that would break the mount specification', () => {
    const request = {
      image: 'abc',
      user: 'node',
      mount: { source: '/a,b', target: '/build' },
      command: ['true'],
    };
    expect(() => dockerCli(recorder()).runOnce(request)).toThrow(/cannot hold a comma or an equals sign/);
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

  it('lists the containers whose name starts with a prefix, within a time limit (bug-003)', async () => {
    // Docker's name filter matches anywhere in a name, so the port keeps only true prefixes.
    const process = recorder([
      ok('bench-abc-1-S1-x\texited\nother-bench-abc-1\trunning\nbench-abc-2-S1-y\trunning\n\n'),
    ]);

    const containers = await dockerCli(process).containersNamed('bench-abc-');

    // With its state: a running one may belong to another invocation of the same campaign.
    expect(containers).toEqual([
      { name: 'bench-abc-1-S1-x', running: false },
      { name: 'bench-abc-2-S1-y', running: true },
    ]);
    expect(process.calls).toEqual([
      {
        command: 'docker',
        args: ['ps', '--all', '--filter', 'name=bench-abc-', '--format', '{{.Names}}\t{{.State}}'],
        timeoutMs: 30_000,
      },
    ]);
  });

  it('says what it was waiting for when listing containers times out', async () => {
    const process = recorder([{ code: 1, stdout: '', stderr: '', timedOut: true }]);
    await expect(dockerCli(process).containersNamed('bench-abc-')).rejects.toThrow(
      'docker ps did not answer within 30 s while looking for containers left by earlier runs of this campaign',
    );
  });

  it("fails with docker's own message when listing containers fails", async () => {
    const process = recorder([{ code: 1, stdout: '', stderr: 'Cannot connect to the Docker daemon' }]);
    await expect(dockerCli(process).containersNamed('bench-abc-')).rejects.toThrow(/Cannot connect/);
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

  it('commits a step that changed nothing, so that step numbering never skips (REQ-RUN-05)', async () => {
    const process = recorder([ok(), ok()]);
    await gitCli(process).commitAll('/repo/runs/w', 'step 03', { allowEmpty: true });
    expect(process.calls.map((call) => command(call.args))).toEqual([
      ['-C', '/repo/runs/w', 'add', '--all'],
      ['-C', '/repo/runs/w', 'commit', '--quiet', '--allow-empty', '--message', 'step 03'],
    ]);
  });

  it('reads the patch of a commit, so that every step leaves a snapshot', async () => {
    const process = recorder([ok('diff --git a/x b/x\n')]);
    const patch = await gitCli(process).patchOf('/repo/runs/w', 'HEAD');
    expect(command(process.calls[0]?.args ?? [])).toEqual([
      '-C',
      '/repo/runs/w',
      'show',
      '--format=',
      '--patch',
      'HEAD',
    ]);
    expect(patch).toBe('diff --git a/x b/x\n');
  });

  it("writes an identity into the repository's own configuration (adr-003 decision 6)", async () => {
    const process = recorder([ok(), ok()]);
    await gitCli(process).configureIdentity(
      '/repo/runs/w',
      'Benchmark Approver',
      'approver@benchmark.localhost',
    );
    expect(process.calls.map((call) => command(call.args))).toEqual([
      ['-C', '/repo/runs/w', 'config', 'user.name', 'Benchmark Approver'],
      ['-C', '/repo/runs/w', 'config', 'user.email', 'approver@benchmark.localhost'],
    ]);
  });

  it('resolves a revision to the full SHA of a commit, or says there is none', async () => {
    const process = recorder([
      ok('3df305ea198d7e2ca0da73bfb12b14af865e9922\n'),
      { code: 128, stdout: '', stderr: 'fatal' },
    ]);
    const git = gitCli(process);
    expect(await git.resolveCommit('/clone', '3df305e')).toBe('3df305ea198d7e2ca0da73bfb12b14af865e9922');
    expect(command(process.calls[0]?.args ?? [])).toEqual([
      '-C',
      '/clone',
      'rev-parse',
      '--verify',
      '--quiet',
      '3df305e^{commit}',
    ]);
    expect(await git.resolveCommit('/clone', 'deadbee')).toBeUndefined();
  });

  it('archives a commit as a tar file, reading nothing but the object store', async () => {
    const process = recorder([ok()]);
    await gitCli(process).archive('/clone', '3df305ea198d7e2ca0da73bfb12b14af865e9922', '/build/src.tar');
    expect(command(process.calls[0]?.args ?? [])).toEqual([
      '-C',
      '/clone',
      'archive',
      '--format=tar',
      '--output=/build/src.tar',
      '3df305ea198d7e2ca0da73bfb12b14af865e9922',
    ]);
  });

  it('names the commit a repository is at', async () => {
    const process = recorder([ok('3df305ea198d7e2ca0da73bfb12b14af865e9922\n')]);
    const head = await gitCli(process).head('/repo/runs/w');
    expect(command(process.calls[0]?.args ?? [])).toEqual(['-C', '/repo/runs/w', 'rev-parse', 'HEAD']);
    expect(head).toBe('3df305ea198d7e2ca0da73bfb12b14af865e9922');
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

  it("carries the agent's credential into the container's environment (REQ-RUN-15)", async () => {
    const process_ = recorder([ok('c0ffee\n')]);
    await dockerCli(process_).create({
      image: 'abc123',
      name: 'bench-abc123-1',
      workspace: '/repo/runs/abc123/1/w',
      user: 'node',
      env: { ANTHROPIC_AUTH_TOKEN: 'sk-ant-oat01-SECRET' },
    });
    const call = process_.calls[0];
    const args = call?.args ?? [];
    // The name goes on the command line; the value does not. `processFailure` renders the command
    // line into the message it throws, and that message is logged and written into run.json.
    expect(args[args.indexOf('--env') + 1]).toBe('ANTHROPIC_AUTH_TOKEN');
    expect(args.join(' ')).not.toContain('sk-ant-oat01-SECRET');
    // The value reaches the docker process itself, which is how the container gets it.
    expect(call?.env).toEqual({ ANTHROPIC_AUTH_TOKEN: 'sk-ant-oat01-SECRET' });
    // It goes in at creation and nowhere else: the workspace mount is still the only mount.
    expect(args.filter((argument) => argument === '--mount')).toHaveLength(1);
  });

  it('keeps the credential out of the message it throws when create fails (REQ-NFR-01)', async () => {
    // A name clash, a missing image or a daemon hiccup is an ordinary event, and this message is
    // logged and written into the run's record, which is committed.
    const token = 'sk-ant-oat01-SECRET';
    const process_ = recorder([{ code: 125, stdout: '', stderr: 'name is already in use' }]);
    let message = '';
    try {
      await dockerCli(process_).create({
        image: 'abc123',
        name: 'bench-abc123-1',
        workspace: '/repo/runs/w',
        user: 'node',
        env: { ANTHROPIC_AUTH_TOKEN: token },
      });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/name is already in use/);
    expect(message).not.toContain(token);
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
