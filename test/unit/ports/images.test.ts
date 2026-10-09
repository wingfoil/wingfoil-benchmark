import { describe, expect, it } from 'vitest';

import { dockerImagesCli } from '../../../src/core/index.js';
import type { ProcessPort, ProcessResult } from '../../../src/core/index.js';

function recorder(results: ProcessResult[] = []): ProcessPort & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    run: (command, args) => {
      calls.push([command, ...args]);
      return Promise.resolve(results.shift() ?? { code: 0, stdout: '', stderr: '' });
    },
  };
}

const ok = (stdout = ''): ProcessResult => ({ code: 0, stdout, stderr: '' });

describe('the image port', () => {
  it('lists every tagged image with its id and size, and leaves out untagged ones', async () => {
    const process = recorder([
      ok(
        'dry-0123456789ab:latest\tsha256:aaa\t1.27GB\n' +
          '<none>:<none>\tsha256:bbb\t10MB\n' +
          'bench-score:abcdef012345\tsha256:ccc\t900MB\n',
      ),
    ]);
    expect(await dockerImagesCli(process).list()).toEqual([
      { reference: 'dry-0123456789ab:latest', id: 'sha256:aaa', size: '1.27GB' },
      { reference: 'bench-score:abcdef012345', id: 'sha256:ccc', size: '900MB' },
    ]);
    expect(process.calls).toEqual([
      ['docker', 'images', '--no-trunc', '--format', '{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}'],
    ]);
  });

  it("reads every container's name, image id and state", async () => {
    const process = recorder([
      ok('c1\nc2\n'),
      ok('/bench-0123456789ab-1-x\tsha256:aaa\ttrue\n/other\tsha256:ddd\tfalse\n'),
    ]);
    expect(await dockerImagesCli(process).containers()).toEqual([
      { name: 'bench-0123456789ab-1-x', imageId: 'sha256:aaa', running: true },
      { name: 'other', imageId: 'sha256:ddd', running: false },
    ]);
    expect(process.calls).toEqual([
      ['docker', 'ps', '--all', '--quiet', '--no-trunc'],
      ['docker', 'inspect', '--format', '{{.Name}}\t{{.Image}}\t{{.State.Running}}', 'c1', 'c2'],
    ]);
  });

  it('skips a container removed between the listing and the inspection, and reads the others (bug-017)', async () => {
    const process = recorder([
      ok('c1\nc2\nc3\n'),
      {
        code: 1,
        stdout: '/kept\tsha256:aaa\ttrue\n/other\tsha256:ddd\tfalse\n',
        stderr: 'error: no such object: c2\n',
      },
    ]);
    expect(await dockerImagesCli(process).containers()).toEqual([
      { name: 'kept', imageId: 'sha256:aaa', running: true },
      { name: 'other', imageId: 'sha256:ddd', running: false },
    ]);
  });

  it('still fails on any other inspection error', async () => {
    const process = recorder([
      ok('c1\n'),
      { code: 1, stdout: '', stderr: 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock\n' },
    ]);
    await expect(dockerImagesCli(process).containers()).rejects.toThrow(
      'Cannot connect to the Docker daemon',
    );
    // A missing object that was never listed is no removal: it is a failure too.
    const strange = recorder([ok('c1\n'), { code: 1, stdout: '', stderr: 'error: no such object: zz\n' }]);
    await expect(dockerImagesCli(strange).containers()).rejects.toThrow('no such object: zz');
  });

  it('asks nothing more when there is no container', async () => {
    const process = recorder([ok('')]);
    expect(await dockerImagesCli(process).containers()).toEqual([]);
    expect(process.calls).toHaveLength(1);
  });

  it('removes an image by reference, never forcing it', async () => {
    const process = recorder([ok()]);
    await dockerImagesCli(process).remove('dry-0123456789ab:latest');
    expect(process.calls).toEqual([['docker', 'image', 'rm', 'dry-0123456789ab:latest']]);
  });

  it("throws Docker's own refusal", async () => {
    const process = recorder([{ code: 1, stdout: '', stderr: 'image is being used by running container' }]);
    await expect(dockerImagesCli(process).remove('dry-0123456789ab:latest')).rejects.toThrow(
      /image is being used by running container/,
    );
  });
});
