import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadProfiles, rootIndex } from '../../../src/site/profiles.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** Personas §2's table, as rows of profile name and category letters. */
function personasTable(): [string, string[]][] {
  const text = readFileSync(repoPath('docs/01_vision/04_personas.md'), 'utf8');
  const section = text.slice(
    text.indexOf('## 2. Result profiles'),
    text.indexOf('\n---', text.indexOf('## 2. Result profiles')),
  );
  return section
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('| Profile') && !line.startsWith('|---'))
    .map((line) => {
      const [name, categories] = line
        .split('|')
        .slice(1, 3)
        .map((cell) => cell.trim()) as [string, string];
      return [name, [...categories.matchAll(/\b([A-G]) /g)].map((match) => match[1] as string)];
    });
}

describe('site-content/profiles.yaml (REQ-RES-08, task-085)', () => {
  it('says what personas §2 says, profile by profile', () => {
    const profiles = loadProfiles(repoPath('.'));
    if (!profiles.ok) throw new Error(JSON.stringify(profiles.issues));
    expect(profiles.value.map((profile) => [profile.name, profile.categories])).toEqual(personasTable());
    expect(profiles.value.map((profile) => profile.id)).toEqual([
      'solo-developer',
      'code-reviewer',
      'team-developer',
      'tech-lead',
      'non-technical-manager',
      'architect',
    ]);
  });

  it('refuses a file it cannot read, a category it does not know, and an id twice', () => {
    const root = tempDir('bench-profiles-');
    mkdirSync(join(root, 'site-content'));
    const issues = (text: string) => {
      writeFileSync(join(root, 'site-content', 'profiles.yaml'), text);
      const loaded = loadProfiles(root);
      return loaded.ok ? [] : loaded.issues.map((issue) => issue.path);
    };
    expect(issues('profiles: [')).toEqual(['site-content/profiles.yaml']);
    expect(issues('profiles:\n  - { id: a, name: A, categories: [Z] }\n')).toEqual([
      'site-content/profiles.yaml',
    ]);
    expect(
      issues('profiles:\n  - { id: a, name: A, categories: [C] }\n  - { id: a, name: B, categories: [D] }\n'),
    ).toEqual(['site-content/profiles.yaml']);
  });
});

describe('the root index (REQ-RES-02 as amended, task-085)', () => {
  function results(root: string, target: string, record?: string) {
    mkdirSync(join(root, 'results', target), { recursive: true });
    if (record !== undefined) writeFileSync(join(root, 'results', target, 'execution.json'), record);
  }
  const ended = (date: string) => JSON.stringify({ state: 'completed', started: date, ended: date });

  it('lists every built execution, by campaign then number, with the day it ended, or that none was recorded', () => {
    const root = tempDir('bench-root-index-');
    results(root, 'fedcba987654/1', ended('2026-10-12T12:00:00.000Z'));
    results(root, 'abcdef012345/2', ended('2026-10-05T12:00:00.000Z'));
    results(root, 'abcdef012345/10', ended('2026-10-06T12:00:00.000Z'));
    results(root, 'c82a5e74885b/2');
    const index = rootIndex(root, ['fedcba987654/1', 'abcdef012345/10', 'c82a5e74885b/2', 'abcdef012345/2']);
    if (!index.ok) throw new Error(JSON.stringify(index.issues));
    const items = [...index.value.matchAll(/<li>(.*)<\/li>/g)].map((match) => match[1]);
    expect(items).toEqual([
      '<a href="abcdef012345/2/">campaign abcdef012345, execution 2</a>, ended 2026-10-05',
      '<a href="abcdef012345/10/">campaign abcdef012345, execution 10</a>, ended 2026-10-06',
      '<a href="c82a5e74885b/2/">campaign c82a5e74885b, execution 2</a>, end date not recorded',
      '<a href="fedcba987654/1/">campaign fedcba987654, execution 1</a>, ended 2026-10-12',
    ]);
    expect(index.value).not.toContain('<script');
    expect(index.value).not.toContain('http-equiv="refresh"');
  });

  it('refuses a record it cannot read, and a built execution whose results are gone', () => {
    const root = tempDir('bench-root-index-');
    results(root, 'abcdef012345/1', '{');
    const paths = (executions: string[]) => {
      const index = rootIndex(root, executions);
      return index.ok ? [] : index.issues.map((issue) => issue.path);
    };
    expect(paths(['abcdef012345/1'])).toEqual(['results/abcdef012345/1']);
    expect(paths(['fedcba987654/1'])).toEqual(['site/fedcba987654/1']);
  });
});
