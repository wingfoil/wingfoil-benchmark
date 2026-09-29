import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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

  it("pins the TypeScript the AST checks parse with, the repository's own (task-037, REQ-SCO-05)", () => {
    const pinned = JSON.parse(readFileSync(repoPath('package.json'), 'utf8')) as {
      devDependencies: { typescript: string };
    };
    expect(scoringImage(REPO_ROOT).typescript).toBe('6.0.3');
    expect(scoringImage(REPO_ROOT).typescript).toBe(pinned.devDependencies.typescript);
    expect(existsSync(repoPath('docker/score-image/ast-checks.mjs'))).toBe(true);
  });

  it("pins M-Q2's tools, the lint ones at the repository's own versions (task-041, REQ-SCO-04)", () => {
    const pinned = JSON.parse(readFileSync(repoPath('package.json'), 'utf8')) as {
      devDependencies: Record<string, string>;
    };
    const image = scoringImage(REPO_ROOT);
    expect([image.eslint, image.typescriptEslint, image.jscpd, image.c8]).toEqual([
      pinned.devDependencies.eslint,
      pinned.devDependencies['typescript-eslint'],
      pinned.devDependencies.jscpd,
      pinned.devDependencies.c8,
    ]);
    expect(image.jscpd).toBe('5.3.3');
    expect(image.c8).toBe('12.0.0');
    for (const file of ['quality.mjs', 'eslint.config.mjs']) {
      expect(existsSync(repoPath(`docker/score-image/${file}`))).toBe(true);
    }
    expect(readFileSync(repoPath('docker/score-image/Dockerfile'), 'utf8')).toMatch(
      /COPY .*quality\.mjs.*eslint\.config\.mjs/,
    );
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
