// task-179 — no tracked test or script names a sibling project's folder: the WingFoil clone and the hold-out move
// (the hold-out with this repository, the clone later and apart), and only the git-ignored local file changes then.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { repoPath } from '../../support/paths.js';

/** The folder names the code guessed before task-179, built so that this file does not hold them. */
const OLD_NAMES = ['WingFoil' + '2', 'WingFoil' + '2-Benchmark-HoldOut'];

describe('the sibling repositories are named only by the local setting (task-179)', () => {
  it('commits an example of the local file with placeholders only, and ignores the file itself', () => {
    const example = parse(readFileSync(repoPath('config', 'siblings.local.example.yaml'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(Object.keys(example).sort()).toEqual(['holdout', 'wingfoil']);
    for (const value of Object.values(example)) {
      expect(typeof value).toBe('string');
      expect(String(value), 'a placeholder, not a machine path').not.toMatch(/^\/(home|Users)\//);
    }
    const ignored = execFileSync('git', ['-C', repoPath(), 'check-ignore', 'config/siblings.local.yaml'], {
      encoding: 'utf8',
    });
    expect(ignored.trim()).toBe('config/siblings.local.yaml');
  });

  it('names no old sibling folder in a tracked test or script', () => {
    // The runner's common files are copied from its package and checked by its own digest; a closed spike is a record.
    const files = execFileSync('git', ['-C', repoPath(), 'ls-files', 'test', 'scripts'], { encoding: 'utf8' })
      .split('\n')
      .filter((file) => file !== '' && !/^scripts\/(runner|checks|lib|setup)\//.test(file));
    const hits = files.filter((file) => {
      const text = readFileSync(repoPath(file), 'utf8');
      return OLD_NAMES.some((name) => new RegExp(`(?<![\\w.-])${name}(?![\\w-])`).test(text));
    });
    expect(hits).toEqual([]);
  });
});
