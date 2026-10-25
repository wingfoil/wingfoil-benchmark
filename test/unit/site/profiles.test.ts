import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
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

  /** A comparison of `newer` against `earlier`, as `bench campaign compare` writes it: the newer side's agent named. */
  function comparisonFile(root: string, newer: string, earlier: string, agent: string) {
    const dir = join(root, 'results', 'comparisons', newer.replace('/', '-'));
    mkdirSync(dir, { recursive: true });
    const pins = agent === 'claude-code' ? [] : [{ pin: 'agent.name', earlier: 'claude-code', newer: agent }];
    writeFileSync(
      join(dir, `${earlier.replace('/', '-')}.json`),
      JSON.stringify({ comparison_version: 2, pins_differ: pins }),
    );
  }

  /** The site's catalogue (REQ-RES-11, task-104): an entry per execution, `kind` and `title` as given. */
  function catalogue(root: string, entries: Record<string, Record<string, unknown>>) {
    mkdirSync(join(root, 'site-content'), { recursive: true });
    const full = Object.fromEntries(
      Object.entries(entries).map(([id, entry]) => [
        id,
        { title: `the ${id}`, release: 'v0.2', agent: 'Claude Code', arms: 'baseline, wingfoil', ...entry },
      ]),
    );
    writeFileSync(join(root, 'site-content', 'catalog.yaml'), stringify({ executions: full }));
  }

  it('groups the built executions by kind, newest first, each with its title, day, agent, arms and links (task-104)', () => {
    const root = tempDir('bench-root-index-');
    results(root, 'fedcba987654/1', ended('2026-10-12T12:00:00.000Z'));
    results(root, 'abcdef012345/2', ended('2026-10-05T12:00:00.000Z'));
    results(root, 'abcdef012345/10', ended('2026-10-06T12:00:00.000Z'));
    results(root, 'c82a5e74885b/2');
    catalogue(root, {
      'fedcba987654/1': {
        kind: 'across-agents',
        title: 'Codex baseline',
        compared_with: ['abcdef012345/10'],
      },
      'abcdef012345/2': { kind: 'reference', title: 'v0.1', erratum: 'https://example.org/errata' },
      'abcdef012345/10': { kind: 'reference', title: 'v0.2', compared_with: ['abcdef012345/2'] },
      'c82a5e74885b/2': { kind: 'bridge', title: 'the bridge' },
    });
    comparisonFile(root, 'abcdef012345/10', 'abcdef012345/2', 'claude-code');
    comparisonFile(root, 'fedcba987654/1', 'abcdef012345/10', 'codex');
    const index = rootIndex(root, ['fedcba987654/1', 'abcdef012345/10', 'c82a5e74885b/2', 'abcdef012345/2']);
    if (!index.ok) throw new Error(JSON.stringify(index.issues));

    expect([...index.value.matchAll(/<h2>(.*?)<\/h2>/g)].map((match) => match[1])).toEqual([
      'Reference campaigns',
      'Bridges',
      'Across agents',
    ]);
    expect([...index.value.matchAll(/<li>(.*)<\/li>/g)].map((match) => match[1])).toEqual([
      '<a href="abcdef012345/10/">v0.2</a>, ended 2026-10-06 · Claude Code · baseline, wingfoil · ' +
        '<a href="abcdef012345/10/compare-abcdef012345-2.html">compared with abcdef012345/2</a>',
      '<a href="abcdef012345/2/">v0.1</a>, ended 2026-10-05 · Claude Code · baseline, wingfoil · ' +
        '<a href="https://example.org/errata">erratum</a>',
      '<a href="c82a5e74885b/2/">the bridge</a>, end date not recorded · Claude Code · baseline, wingfoil',
      '<a href="fedcba987654/1/">Codex baseline</a>, ended 2026-10-12 · Claude Code · baseline, wingfoil · ' +
        '<a href="fedcba987654/1/across-agents-abcdef012345-10.html">compared across agents with abcdef012345/10</a>',
    ]);
    expect(index.value).toContain('preliminary');
    expect(index.value).toContain('T1');
    expect(index.value).not.toContain('<script');
    expect(index.value).not.toContain('http-equiv="refresh"');
  });

  it('refuses a compared_with whose comparison is not written, and links each by the agents it compares (review round 1)', () => {
    const root = tempDir('bench-root-index-');
    results(root, 'abcdef012345/1', ended('2026-10-05T12:00:00.000Z'));
    catalogue(root, { 'abcdef012345/1': { kind: 'reference', compared_with: ['fedcba987654/1'] } });
    const refused = rootIndex(root, ['abcdef012345/1']);
    expect(refused.ok ? [] : refused.issues).toEqual([
      {
        path: 'site-content/catalog.yaml',
        message:
          'abcdef012345/1 is compared_with fedcba987654/1, but results/comparisons/abcdef012345-1/fedcba987654-1.json ' +
          'is not written: run bench campaign compare fedcba987654/1 abcdef012345/1 first',
      },
    ]);
    // A reference execution compared with another agent's links an across-agents page, whatever its kind
    comparisonFile(root, 'abcdef012345/1', 'fedcba987654/1', 'codex');
    const index = rootIndex(root, ['abcdef012345/1']);
    if (!index.ok) throw new Error(JSON.stringify(index.issues));
    expect(index.value).toContain('<a href="abcdef012345/1/across-agents-fedcba987654-1.html">');
  });

  it('leaves an empty kind out (task-104)', () => {
    const root = tempDir('bench-root-index-');
    results(root, 'abcdef012345/1', ended('2026-10-05T12:00:00.000Z'));
    catalogue(root, { 'abcdef012345/1': { kind: 'reference' } });
    const index = rootIndex(root, ['abcdef012345/1']);
    if (!index.ok) throw new Error(JSON.stringify(index.issues));
    expect([...index.value.matchAll(/<h2>(.*?)<\/h2>/g)].map((match) => match[1])).toEqual([
      'Reference campaigns',
    ]);
  });

  it('refuses a built execution with no catalogue entry, an unknown kind and an erratum that is not a link (task-104)', () => {
    const root = tempDir('bench-root-index-');
    results(root, 'abcdef012345/1', ended('2026-10-05T12:00:00.000Z'));
    results(root, 'fedcba987654/1', ended('2026-10-05T12:00:00.000Z'));
    const issuesOf = (executions: string[]) => {
      const index = rootIndex(root, executions);
      return index.ok ? [] : index.issues;
    };
    catalogue(root, { 'abcdef012345/1': { kind: 'reference' } });
    expect(issuesOf(['abcdef012345/1', 'fedcba987654/1'])).toEqual([
      {
        path: 'site-content/catalog.yaml',
        message: 'has no entry for fedcba987654/1, which is built under site/',
      },
    ]);
    catalogue(root, { 'abcdef012345/1': { kind: 'spike' } });
    expect(issuesOf(['abcdef012345/1']).map((issue) => issue.path)).toEqual([
      'site-content/catalog.yaml.executions.abcdef012345/1.kind',
    ]);
    catalogue(root, { 'abcdef012345/1': { kind: 'reference', erratum: 'docs/releases/v0.2.md' } });
    expect(issuesOf(['abcdef012345/1']).map((issue) => issue.path)).toEqual([
      'site-content/catalog.yaml.executions.abcdef012345/1.erratum',
    ]);
    rmSync(join(root, 'site-content', 'catalog.yaml'));
    expect(issuesOf(['abcdef012345/1']).map((issue) => issue.path)).toEqual(['site-content/catalog.yaml']);
  });

  it('refuses a record it cannot read, and a built execution whose results are gone', () => {
    const root = tempDir('bench-root-index-');
    catalogue(
      root,
      Object.fromEntries(
        ['abcdef012345/1', 'fedcba987654/1', 'abcdef012345/2', 'abcdef012345/3'].map((id) => [
          id,
          { kind: 'reference' },
        ]),
      ),
    );
    results(root, 'abcdef012345/1', '{');
    const paths = (executions: string[]) => {
      const index = rootIndex(root, executions);
      return index.ok ? [] : index.issues.map((issue) => issue.path);
    };
    expect(paths(['abcdef012345/1'])).toEqual(['results/abcdef012345/1']);
    expect(paths(['fedcba987654/1'])).toEqual(['site/fedcba987654/1']);
    results(root, 'abcdef012345/2', ended('2026-13-45T00:00:00.000Z'));
    expect(paths(['abcdef012345/2'])).toEqual(['results/abcdef012345/2/execution.json']);
    // A day the calendar does not have, which Date.parse would move to another; and a timestamp with an offset
    for (const bad of ['2026-02-30T00:00:00.000Z', '2026-10-13T00:30:00+02:00']) {
      results(root, 'abcdef012345/3', ended(bad));
      expect(paths(['abcdef012345/3']), bad).toEqual(['results/abcdef012345/3/execution.json']);
    }
  });
});
