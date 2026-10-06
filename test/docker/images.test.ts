import { describe, expect, it } from 'vitest';

import { dockerImagesCli, systemProcess } from '../../src/core/index.js';

// Read-only against the real daemon: it lists, and removes nothing (task-061).
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
});
