import { cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { scoringImage } from '../../../src/scoring/index.js';
import { REPO_ROOT, repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

describe('scoringImage (REQ-SCO-01, REQ-SCO-02)', () => {
  it('is docker/score-image, tagged by its content, with the tsx its package pins', () => {
    const image = scoringImage(REPO_ROOT);
    expect(image.dockerfile).toBe(repoPath('docker/score-image/Dockerfile'));
    expect(image.context).toBe(repoPath('docker/score-image'));
    expect(image.tag).toMatch(/^bench-score:[0-9a-f]{12}$/);
    expect(image.tsx).toBe('4.23.15');
  });

  it('changes its tag when anything in its directory changes, the reporter included', () => {
    const copy = tempDir('bench-package-');
    cpSync(repoPath('docker/score-image'), join(copy, 'docker', 'score-image'), { recursive: true });
    const before = scoringImage(copy).tag;
    writeFileSync(join(copy, 'docker', 'score-image', 'reporter.mjs'), '// changed\n', { flag: 'a' });
    expect(scoringImage(copy).tag).not.toBe(before);
    expect(scoringImage(REPO_ROOT).tag).toBe(before);
  });
});
