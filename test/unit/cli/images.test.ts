import { describe, expect, it } from 'vitest';

import { main } from '../../../src/cli/index.js';
import { pruneCandidates } from '../../../src/cli/images.js';
import type { ContainerInfo, ImageInfo, ImagePort } from '../../../src/core/index.js';
import { scoringImage } from '../../../src/scoring/index.js';

const CURRENT = scoringImage().tag;

const IMAGES: ImageInfo[] = [
  { reference: 'dry-0123456789ab:latest', id: 'sha256:d1', size: '1.27GB' },
  { reference: 'dry-111111111111:latest', id: 'sha256:d2', size: '1.27GB' },
  { reference: 'c82a5e74885b:latest', id: 'sha256:c1', size: '1.30GB' },
  { reference: 'bench-score:000000000000', id: 'sha256:s1', size: '900MB' },
  { reference: CURRENT, id: 'sha256:s2', size: '900MB' },
  {
    reference: '0123456789ab.dkr.ecr.eu-west-3.amazonaws.com/robypomper-tests:latest',
    id: 'sha256:e1',
    size: '1GB',
  },
  { reference: 'bench-spike-task-004:latest', id: 'sha256:p1', size: '1GB' },
  { reference: 'dry-0123456789ab:v2', id: 'sha256:d3', size: '1GB' },
  { reference: 'busybox:1.32', id: 'sha256:b1', size: '1MB' },
];

describe('which images a prune removes', () => {
  it("takes only the benchmark's own references, anchored, and keeps the current scoring image and those in use", () => {
    const used: ContainerInfo[] = [{ name: 'someone', imageId: 'sha256:d2', running: false }];
    expect(pruneCandidates(IMAGES, used, CURRENT)).toEqual({
      remove: [IMAGES[0], IMAGES[2], IMAGES[3]],
      kept: [
        { image: IMAGES[1], reason: 'used by container someone' },
        { image: IMAGES[4], reason: 'the current scoring image' },
      ],
    });
  });
});

/** An image port double: the images and containers it is given, and the removals it was asked for. */
function fakeImages(images: ImageInfo[], containers: ContainerInfo[] = [], refuse: string[] = []) {
  const removed: string[] = [];
  const port: ImagePort = {
    list: () => Promise.resolve(images),
    containers: () => Promise.resolve(containers),
    remove: (reference) => {
      if (refuse.includes(reference))
        return Promise.reject(new Error(`conflict: unable to remove ${reference}`));
      removed.push(reference);
      return Promise.resolve();
    },
  };
  return { port, removed };
}

async function prune(images: ReturnType<typeof fakeImages>, ...args: string[]) {
  let stdout = '';
  let stderr = '';
  const io = { stdout: (text: string) => (stdout += text), stderr: (text: string) => (stderr += text) };
  const code = await main(['images', 'prune', ...args], io, { images: images.port } as never);
  return { code, stdout, stderr };
}

describe('bench images prune', () => {
  it("--dry-run lists only the benchmark's own images, never the current scoring image, and removes nothing", async () => {
    const images = fakeImages(IMAGES);
    const { code, stdout, stderr } = await prune(images, '--dry-run');
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(stdout.trimEnd().split('\n')).toEqual([
      'would remove dry-0123456789ab:latest (1.27GB)',
      'would remove dry-111111111111:latest (1.27GB)',
      'would remove c82a5e74885b:latest (1.30GB)',
      'would remove bench-score:000000000000 (900MB)',
      `kept ${CURRENT} (the current scoring image)`,
      'would remove 4 images',
    ]);
    expect(images.removed).toEqual([]);
  });

  it('removes them and prints what it removed', async () => {
    const images = fakeImages(IMAGES);
    const { code, stdout } = await prune(images);
    expect(code).toBe(0);
    expect(images.removed).toEqual([
      'dry-0123456789ab:latest',
      'dry-111111111111:latest',
      'c82a5e74885b:latest',
      'bench-score:000000000000',
    ]);
    expect(stdout).toMatch(/^removed dry-0123456789ab:latest \(1\.27GB\)\n/);
    expect(stdout).toMatch(/\nremoved 4 images\n$/);
  });

  it('reports a removal Docker refuses, goes on with the others, and exits 1', async () => {
    const images = fakeImages(IMAGES, [], ['c82a5e74885b:latest']);
    const { code, stdout, stderr } = await prune(images);
    expect(code).toBe(1);
    expect(images.removed).toHaveLength(3);
    expect(stderr).toBe('c82a5e74885b:latest: conflict: unable to remove c82a5e74885b:latest\n');
    expect(stdout).toMatch(/\nremoved 3 images\n$/);
  });

  it('refuses to prune anything while a benchmark container is running', async () => {
    const images = fakeImages(IMAGES, [
      { name: 'bench-c82a5e74885b-2-x', imageId: 'sha256:c1', running: true },
    ]);
    const { code, stdout, stderr } = await prune(images);
    expect({ code, stdout }).toEqual({ code: 1, stdout: '' });
    expect(stderr).toBe(
      'images: not pruned: the benchmark container bench-c82a5e74885b-2-x is running; a run in progress needs its image\n',
    );
    expect(images.removed).toEqual([]);
  });

  it("prunes while a container that is not the benchmark's runs, keeping that container's image", async () => {
    const images = fakeImages(IMAGES, [{ name: 'someone-else', imageId: 'sha256:c1', running: true }]);
    const { code, stdout } = await prune(images, '--dry-run');
    expect(code).toBe(0);
    expect(stdout).toContain('kept c82a5e74885b:latest (used by container someone-else)\n');
    expect(stdout).toMatch(/\nwould remove 3 images\n$/);
  });

  it('reports a Docker that cannot list, and prunes nothing', async () => {
    const port: ImagePort = {
      list: () => Promise.reject(new Error('Cannot connect to the Docker daemon')),
      containers: () => Promise.resolve([]),
      remove: () => Promise.reject(new Error('never called')),
    };
    let stderr = '';
    const code = await main(
      ['images', 'prune'],
      { stdout: () => undefined, stderr: (text) => (stderr += text) },
      { images: port } as never,
    );
    expect(code).toBe(1);
    expect(stderr).toBe('images: Cannot connect to the Docker daemon\n');
  });

  it('is a usage error with anything else', async () => {
    for (const argv of [['images'], ['images', 'list'], ['images', 'prune', '--force']]) {
      let stderr = '';
      const code = await main(argv, { stdout: () => undefined, stderr: (text) => (stderr += text) });
      expect(code).toBe(2);
      expect(stderr).toMatch(/bench images prune \[--dry-run\]/);
    }
  });
});
