// task-109 — scripts/wingfoil-sync.mjs: each note's status and answered_by by WingFoil's published mapping only.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/wingfoil-sync.mjs');
const SERVICE =
  'svc-020-github-repository-wingfoil-benchmark-the-benchmark-consumer-project-and-its-feedback-inbox';
const OTHER = 'svc-099-another-consumer';
const SHA = 'a'.repeat(40);

function put(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function commit(repo: string, message: string, tag?: string): void {
  const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', message);
  if (tag !== undefined) git('tag', tag);
}

const element = (release: string, status = 'ready') =>
  `---\ntype: decision-log\nstatus: ${status}\nrelease: "${release}"   # a comment\n---\n`;

/**
 * A WingFoil checkout: a retrospective of v0.3 with one row per decision (and `extra`
 * rows), its triage record, a patch, tags.
 */
function wingfoil(root: string, extra: readonly string[][] = []): string {
  const repo = join(root, 'wingfoil');
  mkdirSync(repo);
  execFileSync('git', ['-C', repo, 'init', '-q', '-b', 'main']);
  put(repo, 'docs/04_memory/design/dls/dl-001-old.md', element('v0.2'));
  // Stamped for a shipped release, but still under discussion: a target, not shipped.
  put(repo, 'docs/04_memory/design/dls/dl-003-open.md', element('v0.2', 'in-discussion'));
  commit(repo, 'v0.2', 'v0.2.0');
  const rows = [
    ['F-001', 'superseded', '—'],
    ['F-002', 'covered', '`dl-001`'],
    ['F-003', 'element', '`dl-002`'],
    ['F-004', 'restated', '—'],
    ['F-005', 'needs-info', '—'],
    ['F-007', 'element', '`dl-001`, `dl-003`'],
    ['F-010', 'element', '`cp-004`'],
    ['F-011', 'element', '`dl-999`'],
    ...extra,
  ];
  put(repo, 'docs/04_memory/design/dls/dl-002-later.md', element('v0.4'));
  // A change-proposal's sequence ends at `scheduled`: a plan, never shipped.
  put(
    repo,
    'docs/04_memory/change-proposals/cp-004-plan.md',
    '---\ntype: change-proposal\nstatus: scheduled\nrelease: "v0.2"\n---\n',
  );
  put(
    repo,
    'docs/04_memory/design/dls/retro-v0.2.md',
    `## Consumer feedback\n\n| Note | Decision | Element | Target |\n|---|---|---|---|\n| \`${SERVICE}/F-001@${SHA}\` | declined | — | — |\n`,
  );
  put(
    repo,
    'docs/04_memory/design/dls/retro-v0.3.md',
    [
      '# retro',
      '',
      '## Consumer feedback',
      '',
      '| Note | Decision | Element | Target |',
      '|---|---|---|---|',
      `| \`${OTHER}/F-001@${SHA}\` | declined | — | — |`,
      ...rows.map(([note, decision, el]) => `| \`${SERVICE}/${note}@${SHA}\` | ${decision} | ${el} | — |`),
      '',
    ].join('\n'),
  );
  put(
    repo,
    'docs/09_retrospectives/rl-v1/rel-v0.3-feedback-triage.md',
    `## Services read\n\n| Service | Remote | Commit read | Notes | Status |\n|---|---|---|---|---|\n| \`${SERVICE}\` | r | \`${SHA}\` | 5 | all \`open\` |\n`,
  );
  put(
    repo,
    'docs/04_memory/planning/rl-v1/patch-v0.3.1.md',
    '## Scope changes\n\n| Task | From |\n|---|---|\n',
  );
  put(repo, 'docs/04_memory/bugs/bug-003-cites.md', `reported_by: ["${SERVICE}/F-003@${SHA}"]\n`);
  commit(repo, 'v0.3.1', 'v0.3.1');
  execFileSync('git', ['-C', repo, 'branch', 'origin-main']);
  return repo;
}

/**
 * A consumer repository pinning `pin`, with notes F-001 to F-011 `open`, but F-008 and F-009 captured at an earlier
 * sync by dl-001 (shipped) and dl-003 (not).
 */
function consumer(root: string, pin: string): string {
  const repo = join(root, 'consumer');
  put(repo, 'package.json', JSON.stringify({ devDependencies: { wingfoil: pin } }));
  const ledger: string[] = [];
  for (let n = 1; n <= 11; n += 1) {
    const id = `F-${String(n).padStart(3, '0')}`;
    const file = `${id}-note-${String(n)}.md`;
    const [status, answered] =
      n === 8 ? ['captured', 'dl-001'] : n === 9 ? ['captured', 'dl-003'] : ['open', ''];
    put(
      repo,
      `docs/wingfoil-feedback/${file}`,
      `---\nid: ${id}\ntitle: "Note ${String(n)}"\nkind: gap\nstatus: ${status}\nwingfoil_version: 0.2.2\nanswered_by: [${answered}]\n---\n\nbody\n`,
    );
    ledger.push(`| [${id}](${file}) | Note ${String(n)} | gap | ${status} | ${answered} |`);
  }
  put(
    repo,
    'docs/wingfoil-feedback/README.md',
    `# Inbox\n\n## Ledger\n\n| Note | Title | Kind | Status | Answered by |\n|---|---|---|---|---|\n${ledger.join('\n')}\n`,
  );
  return repo;
}

function sync(cwd: string, ...args: string[]) {
  return spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

const frontmatter = (repo: string, n: number) => {
  const text = readFileSync(
    join(repo, `docs/wingfoil-feedback/F-${String(n).padStart(3, '0')}-note-${String(n)}.md`),
    'utf8',
  );
  return [/^status: (.*)$/m.exec(text)?.[1], /^answered_by: (.*)$/m.exec(text)?.[1]];
};

describe('wingfoil-sync (task-109)', () => {
  it("maps the newest retrospective's rows of this service only, and leaves the notes it did not read", () => {
    const root = tempDir('bench-wingfoil-sync-');
    const wf = wingfoil(root);
    const repo = consumer(root, 'npm:wingfoil@0.3.1');
    const result = sync(repo, wf, 'v0.3.1', '--grep-ref', 'origin-main', '--write');
    expect(result.status, result.stderr).toBe(0);
    expect(frontmatter(repo, 1)).toEqual(['resolved', '[]']); // superseded
    expect(frontmatter(repo, 2)).toEqual(['resolved', '[dl-001]']); // covered, shipped in v0.2.0 ≤ the pin
    expect(frontmatter(repo, 3)).toEqual(['captured', '[dl-002]']); // element, its release v0.4 not a tag yet
    expect(frontmatter(repo, 4)).toEqual(['open', '[]']); // restated with no element
    expect(frontmatter(repo, 5)).toEqual(['needs-info', '[]']);
    expect(frontmatter(repo, 6)).toEqual(['open', '[]']); // not read
    expect(frontmatter(repo, 7)).toEqual(['captured', '[dl-001, dl-003]']); // dl-003 not ready
    expect(frontmatter(repo, 8)).toEqual(['resolved', '[dl-001]']); // captured earlier, no row: re-checked
    expect(frontmatter(repo, 9)).toEqual(['captured', '[dl-003]']); // captured earlier, still not shipped
    expect(frontmatter(repo, 10)).toEqual(['captured', '[cp-004]']); // a change-proposal never ships
    expect(frontmatter(repo, 11)).toEqual(['captured', '[dl-999]']); // not found at the ref
    const readme = readFileSync(join(repo, 'docs/wingfoil-feedback/README.md'), 'utf8');
    expect(readme).toContain('| [F-002](F-002-note-2.md) | Note 2 | gap | resolved | dl-001 |');
    expect(readme).toContain('| [F-003](F-003-note-3.md) | Note 3 | gap | captured | dl-002 |');
    expect(readme).toContain('| [F-006](F-006-note-6.md) | Note 6 | gap | open | |');
    expect(result.stdout).toContain('records read at v0.3.1');
    expect(result.stdout).toContain(`triage read this inbox at: \`${SHA}\` (5 notes)`);
    expect(result.stdout).toContain('F-003 ← bug-003');
    expect(result.stdout).not.toContain(OTHER);
    expect(result.stdout).toContain('counts: resolved 3, captured 5, open 2, needs-info 1');
    // A second sync reads the notes it wrote and changes nothing.
    const before = readFileSync(join(repo, 'docs/wingfoil-feedback/README.md'), 'utf8');
    const notes = () => Array.from({ length: 11 }, (_, i) => frontmatter(repo, i + 1));
    const written = notes();
    const again = sync(repo, wf, 'v0.3.1', '--grep-ref', 'origin-main', '--write');
    expect(again.status, again.stderr).toBe(0);
    expect(again.stdout).toContain('counts: resolved 3, captured 5, open 2, needs-info 1');
    expect(readFileSync(join(repo, 'docs/wingfoil-feedback/README.md'), 'utf8')).toBe(before);
    expect(notes()).toEqual(written);
  });

  it('keeps a captured note captured while an element ships after the pin', () => {
    const root = tempDir('bench-wingfoil-sync-');
    const wf = wingfoil(root);
    const repo = consumer(root, 'npm:wingfoil@0.1.9');
    expect(sync(repo, wf, 'v0.3.1', '--grep-ref', 'origin-main', '--write').status).toBe(0);
    expect(frontmatter(repo, 2)).toEqual(['captured', '[dl-001]']);
  });

  it('refuses a decision the mapping does not know, writing nothing', () => {
    const root = tempDir('bench-wingfoil-sync-');
    const wf = wingfoil(root, [['F-006', 'postponed', '—']]);
    const repo = consumer(root, 'npm:wingfoil@0.3.1');
    const refused = sync(repo, wf, 'v0.3.1', '--grep-ref', 'origin-main', '--write');
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain('F-006: decision "postponed" is not in the mapping');
    expect(frontmatter(repo, 1)).toEqual(['open', '[]']);
  });

  it('prints without writing unless asked, and refuses a pin that is not a published build', () => {
    const root = tempDir('bench-wingfoil-sync-');
    const wf = wingfoil(root);
    const repo = consumer(root, 'npm:wingfoil@0.3.1');
    expect(sync(repo, wf, 'v0.3.1', '--grep-ref', 'origin-main').status).toBe(0);
    expect(frontmatter(repo, 1)).toEqual(['open', '[]']);
    const tarball = consumer(join(root, 'b'), 'file:vendor/wingfoil.tgz');
    const refused = sync(tarball, wf, 'v0.3.1');
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain('pins no published wingfoil');
    expect(sync(repo).status).toBe(2);
  });
});
