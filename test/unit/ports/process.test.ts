import { describe, expect, it } from 'vitest';

import { gitCli, processFailure, systemProcess } from '../../../src/core/index.js';
import type { ProcessPort } from '../../../src/core/index.js';

describe('the system process port', () => {
  it('reports what a command wrote and the code it ended with', async () => {
    const result = await systemProcess.run(process.execPath, [
      '-e',
      'console.log("out"); console.error("err")',
    ]);
    expect(result).toEqual({ code: 0, stdout: 'out\n', stderr: 'err\n' });
  });

  it('reports a non-zero exit code as data, not as an exception', async () => {
    const result = await systemProcess.run(process.execPath, ['-e', 'process.exit(3)']);
    expect(result.code).toBe(3);
  });

  it('reports a command that cannot be started as a failure', async () => {
    const result = await systemProcess.run('bench-no-such-command', []);
    expect(result.code).toBe(1);
  });

  it('adds the variables it is given to the environment', async () => {
    const result = await systemProcess.run(
      process.execPath,
      ['-e', 'process.stdout.write(process.env.BENCH_PROBE ?? "")'],
      {
        env: { BENCH_PROBE: 'set' },
      },
    );
    expect(result.stdout).toBe('set');
  });

  it('removes a variable it is asked to unset', async () => {
    process.env.BENCH_PROBE_REMOVED = 'from the host';
    try {
      const result = await systemProcess.run(
        process.execPath,
        ['-e', 'process.stdout.write(String("BENCH_PROBE_REMOVED" in process.env))'],
        { env: { BENCH_PROBE_REMOVED: undefined } },
      );
      expect(result.stdout).toBe('false');
    } finally {
      Reflect.deleteProperty(process.env, 'BENCH_PROBE_REMOVED');
    }
  });

  it('runs in the directory it is given', async () => {
    const result = await systemProcess.run(process.execPath, ['-e', 'process.stdout.write(process.cwd())'], {
      cwd: '/tmp',
    });
    expect(result.stdout).toBe('/tmp');
  });
});

describe('processFailure', () => {
  it('names the command and what it said', () => {
    const error = processFailure('docker', ['start', 'x'], { code: 2, stdout: '', stderr: 'boom\n' });
    expect(error.message).toBe('docker start x failed with code 2:\nboom');
  });

  it('falls back to the standard output when there is no error output', () => {
    const error = processFailure('git', ['init'], { code: 1, stdout: 'bad\n', stderr: '' });
    expect(error.message).toMatch(/bad$/);
  });
});

describe('the git port, when git fails', () => {
  it('raises the command and its error output', async () => {
    const port: ProcessPort = {
      run: () => Promise.resolve({ code: 128, stdout: '', stderr: 'not a repository' }),
    };
    await expect(gitCli(port).commitAll('/w', 'seed')).rejects.toThrow(
      /git .*add --all failed with code 128/s,
    );
  });
});
