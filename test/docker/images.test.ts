import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { dockerImagesCli, systemProcess } from '../../src/core/index.js';

// Against the real daemon, removing no image (task-061): it lists, and creates and removes one container of its own.
describe('the image port against Docker', () => {
  const port = dockerImagesCli(systemProcess);

  it('lists tagged images with an id and a size, and no untagged one', async () => {
    const images = await port.list();
    for (const image of images) {
      expect(image.reference).toMatch(/^[^\s]+:[^\s]+$/);
      expect(image.reference).not.toContain('<none>');
      expect(image.id).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(image.size).not.toBe('');
    }
  });

  it("reads every container's name without its slash, and its image as an id", async () => {
    const containers = await port.containers();
    for (const container of containers) {
      expect(container.name).not.toMatch(/^\//);
      expect(container.imageId).toMatch(/^sha256:[0-9a-f]{64}$/);
    }
  });

  it("names a container's image by the same id list() gives it: the in-use check rests on it", async () => {
    // A container of its own, created and never started, from a tagged image already on the host; removed after.
    const tagged = (await port.list()).find((image) => !image.reference.startsWith('<'));
    if (tagged === undefined) return;
    const name = `images-port-test-${process.pid}`;
    execFileSync('docker', ['create', '--name', name, tagged.reference, 'true'], { stdio: 'ignore' });
    try {
      const container = (await port.containers()).find((c) => c.name === name);
      expect(container?.imageId).toBe(tagged.id);
    } finally {
      execFileSync('docker', ['rm', name], { stdio: 'ignore' });
    }
  });
});
