// task-109 — WingFoil 0.3 accepts `[]` on a required field listed in `template.frontmatter.lists` (its bug-147), where
// 0.2 refused it. This repository's list fields that were required to be non-empty stay so here: a task's
// `requirements`, and a release's `waves` and `features` once it leaves `draft`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { repoPath } from '../../support/paths.js';

function frontmatters(dir: string): { file: string; fields: Record<string, unknown> }[] {
  const root = repoPath('docs', 'memory', dir);
  return readdirSync(root)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((file) => {
      const match = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(join(root, file), 'utf8'));
      return { file, fields: (parse(match?.[1] ?? '') ?? {}) as Record<string, unknown> };
    });
}

const filled = (value: unknown) => Array.isArray(value) && value.length > 0;

describe('required list fields stay non-empty (task-109)', () => {
  it("gives every task past draft at least one requirement", () => {
    const tasks = frontmatters('task').filter((task) => task.fields['status'] !== 'draft');
    expect(tasks.length).toBeGreaterThan(0);
    for (const task of tasks) expect(filled(task.fields['requirements']), task.file).toBe(true);
  });

  it('gives every release past draft its waves and features', () => {
    const releases = frontmatters('release').filter((release) => release.fields['status'] !== 'draft');
    expect(releases.length).toBeGreaterThan(0);
    for (const release of releases) {
      expect(filled(release.fields['waves']), release.file).toBe(true);
      expect(filled(release.fields['features']), release.file).toBe(true);
    }
  });
});
