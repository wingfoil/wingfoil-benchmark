import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadProfiles, rootIndexPage } from '../../../src/site/profiles.js';
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
  it('lists every built execution, sorted, with the date it ended, or that none was recorded', () => {
    const root = tempDir('bench-root-index-');
    const record = (target: string, ended: string) => {
      mkdirSync(join(root, 'results', target), { recursive: true });
      writeFileSync(
        join(root, 'results', target, 'execution.json'),
        JSON.stringify({ state: 'completed', started: ended, ended }),
      );
    };
    record('fedcba987654/1', '2026-10-12T12:00:00.000Z');
    record('abcdef012345/2', '2026-10-05T12:00:00.000Z');
    const page = rootIndexPage(root, ['fedcba987654/1', 'c82a5e74885b/2', 'abcdef012345/2']);
    const items = [...page.matchAll(/<li>(.*)<\/li>/g)].map((match) => match[1]);
    expect(items).toEqual([
      '<a href="abcdef012345/2/">campaign abcdef012345, execution 2</a>, ended 2026-10-05T12:00:00.000Z',
      '<a href="c82a5e74885b/2/">campaign c82a5e74885b, execution 2</a>, end date not recorded',
      '<a href="fedcba987654/1/">campaign fedcba987654, execution 1</a>, ended 2026-10-12T12:00:00.000Z',
    ]);
    expect(page).not.toContain('<script');
    expect(page).not.toContain('http-equiv="refresh"');
  });
});
