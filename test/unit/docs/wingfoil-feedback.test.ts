// task-077, task-078 — the WingFoil feedback inbox (WingFoil dl-163 R1, R4), checked as WingFoil-Templates'
// `tests/wingfoil-feedback.test.ts` and WingFoil-UI's `test/wingfoil-feedback.test.ts` check their own.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { repoPath } from '../../support/paths.js';

const INBOX = repoPath('docs', 'wingfoil-feedback');
const NOTE_FILE = /^F-\d{3}-[a-z0-9-]+\.md$/;
const FIELDS = ['id', 'title', 'kind', 'status', 'wingfoil_version', 'answered_by'];
const KINDS = ['defect', 'gap', 'request'];
const STATUSES = ['open', 'needs-info', 'captured', 'resolved', 'declined', 'duplicate'];
/** A WingFoil build: `0.2.2`, `0.1.0-7a65580`, or this repository's pinned tarball `0.2-pre-3df305e`. */
const BUILD = /^\d+\.\d+(?:\.\d+)?(?:-[0-9a-z.]+)*$/;
/**
 * The first body line names the usage notes the note was migrated from (task-077), or the task that wrote a new
 * note, as WingFoil-Templates' inbox test accepts.
 */
const FIRST_LINE = /^\n(?:Formerly (N\d+(?:, N\d+)*)\.|New note \(task-\d+\)\.)\n/;
/** The usage notes N1–N51 that the old inbox held, each migrated once. */
const MIGRATED = 51;
const DIRECTIVE = repoPath('.wingfoil', 'directives', 'custom', 'wingfoil-cli.md');
const ROLES = repoPath('.wingfoil', 'roles.yaml');
/**
 * Rules 1–7 of the `wingfoil-cli` directive, word for word the same in every WingFoil consumer (task-078):
 * copied from WingFoil-Templates' main at `830dccb`, identical in WingFoil-UI at `1d9348d`.
 */
const SHARED_RULES = "1. Run the pinned CLI (`npm run -s wingfoil -- …`); never a global `wingfoil` of another version.\n2. Every governance change goes through a CLI verb when one exists; hand edits only where an entry says so.\n3. A wrong, missing or surprising behaviour gets an entry below. If it is a WingFoil defect or gap,\n   also write a note in `docs/wingfoil-feedback/` (evidence: command, output, version, commit).\n4. Do not work around silently: a workaround goes in the entry and in the Execution Notes of the\n   element being worked on.\n5. When the pin advances: re-check every entry, remove the fixed ones, bump this directive's version\n   and *Checked against*. A note whose answer has shipped stays `resolved`; there is no `verified`\n   status (WingFoil dl-163).\n6. `answered_by` and the statuses `needs-info`, `captured`, `resolved`, `declined` and `duplicate`\n   are set only by the sync, from what WingFoil published, never by judgement. WingFoil cites a note\n   as `<service id>/F-<nnn>@<sha>`.\n7. Run `wingfoil-sync` at every `release-planning` and at every pin bump, and record the sync in\n   `docs/wingfoil-feedback/README.md`.\n";

interface Note {
  file: string;
  fields: Record<string, unknown>;
  body: string;
}

function readNotes(): Note[] {
  return readdirSync(INBOX)
    .filter((name) => NOTE_FILE.test(name))
    .sort()
    .map((file) => {
      const text = readFileSync(join(INBOX, file), 'utf8');
      const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
      if (match === null) throw new Error(`${file} has no frontmatter`);
      const fields = parse(match[1] ?? '') as Record<string, unknown>;
      return { file, fields, body: text.slice(match[0].length) };
    });
}

/** Rows of the first Markdown table after a heading (header and rule skipped), as trimmed cells. */
function tableAfter(text: string, heading: string): string[][] {
  const start = text.indexOf(heading);
  if (start < 0) throw new Error(`no ${heading}`);
  const lines = text.slice(start).split('\n');
  const first = lines.findIndex((line) => line.startsWith('|'));
  const end = lines.findIndex((line, index) => index > first && !line.startsWith('|'));
  return (
    lines
      .slice(first + 2, end < 0 ? undefined : end)
      // Cells are split on unescaped pipes: a title may hold `\|`.
      .map((line) =>
        line
          .slice(1, -1)
          .split(/(?<!\\)\|/)
          .map((cell) => cell.trim()),
      )
  );
}

/** The usage notes a text names as `N<n>`, in order. */
function usageNotes(text: string): number[] {
  return [...text.matchAll(/N(\d+)/g)].map((match) => Number(match[1]));
}

/** The section of a Markdown text that starts at a heading and ends at the next heading of its level or higher. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n${heading}\n`);
  if (start < 0) throw new Error(`no ${heading}`);
  const level = /^#+/.exec(heading)?.[0].length ?? 2;
  const rest = text.slice(start + heading.length + 2);
  const next = new RegExp(`^#{1,${String(level)}} `, 'm').exec(rest);
  return next === null ? rest : rest.slice(0, next.index);
}

describe('the WingFoil feedback inbox (dl-163)', () => {
  const notes = readNotes();
  const readme = (): string => readFileSync(join(INBOX, 'README.md'), 'utf8');

  it('holds only the README and the notes', () => {
    const stray = readdirSync(INBOX).filter((name) => name !== 'README.md' && !NOTE_FILE.test(name));
    expect(stray).toEqual([]);
  });

  it('has notes numbered from F-001 without gaps, each named after its id', () => {
    expect(notes.length).toBeGreaterThan(0);
    notes.forEach((note, index) => {
      const id = `F-${String(index + 1).padStart(3, '0')}`;
      expect(note.fields['id'], note.file).toBe(id);
      expect(note.file.startsWith(`${id}-`), note.file).toBe(true);
    });
  });

  it('gives every note exactly the six fields of dl-163 R4, with allowed values', () => {
    for (const note of notes) {
      expect(Object.keys(note.fields), note.file).toEqual(FIELDS);
      const title = note.fields['title'];
      expect(typeof title === 'string' && title !== '', note.file).toBe(true);
      expect(KINDS, note.file).toContain(note.fields['kind']);
      expect(STATUSES, note.file).toContain(note.fields['status']);
      expect(String(note.fields['wingfoil_version']), note.file).toMatch(BUILD);
      const answered = note.fields['answered_by'];
      const strings = Array.isArray(answered) && answered.every((id) => typeof id === 'string');
      expect(strings, note.file).toBe(true);
    }
  });

  it('opens with the usage notes the note was migrated from, or says it is new', () => {
    for (const note of notes) expect(note.body, note.file).toMatch(FIRST_LINE);
  });

  it('states what was observed and what was expected, with no other section', () => {
    for (const note of notes) {
      expect(note.body, note.file).toMatch(/\n## Observed\n[\s\S]+\n## Expected\n[\s\S]*\S/);
      const sections = note.body.match(/^## .+$/gm) ?? [];
      expect(sections, note.file).toEqual(['## Observed', '## Expected']);
      // dl-163 R4 has no Replies: refused at any heading level.
      expect(note.body, note.file).not.toMatch(/^#{1,6}\s+Replies\b/im);
    }
  });

  it('lists every note in the README ledger as the note says', () => {
    const text = readme();
    expect(text).toMatch(/\*\*Source key:\*\*/);
    expect(text).toMatch(/\*\*Last sync:\*\*/);
    const rows = tableAfter(text, '## Ledger');
    expect(rows.map((row) => row.length)).toEqual(notes.map(() => 5));
    notes.forEach((note, index) => {
      const [link, title, kind, status, answered] = rows[index] ?? [];
      expect(link).toBe(`[${String(note.fields['id'])}](${note.file})`);
      expect(title).toBe(String(note.fields['title']).replace(/\|/g, '\\|'));
      expect(kind).toBe(note.fields['kind']);
      expect(status).toBe(note.fields['status']);
      expect(answered).toBe((note.fields['answered_by'] as string[]).join(', '));
    });
  });

  it('accounts for every usage note N1–N51 once: in a note, or as a positive observation', () => {
    const migrated = notes.flatMap((note) => usageNotes(FIRST_LINE.exec(note.body)?.[1] ?? ''));
    // Each positive observation is a bullet that opens with its usage note in bold: `- **N5 — …**`.
    const positives = section(readme(), '### Positive observations')
      .split('\n')
      .flatMap((line) => usageNotes(/^- \*\*(N\d+) /.exec(line)?.[1] ?? ''));
    const all = [...migrated, ...positives].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: MIGRATED }, (_, index) => index + 1));
  });

  it('holds rules 1–7 of the wingfoil-cli directive word for word as every consumer', () => {
    const rules = section(readFileSync(DIRECTIVE, 'utf8'), '## Rules');
    expect(rules.startsWith(SHARED_RULES)).toBe(true);
  });

  it('links every known behaviour of wingfoil-cli to existing notes', () => {
    const ids = new Set(notes.map((note) => String(note.fields['id'])));
    const rows = tableAfter(readFileSync(DIRECTIVE, 'utf8'), '## Known behaviours');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row, row[0]).toHaveLength(5);
      const refs = (row[3] ?? '')
        .split(',')
        .map((ref) => ref.trim())
        .filter((ref) => ref !== '');
      expect(row[0], row[0]).toMatch(/^W-\d{2}$/);
      expect(refs.length, `${row[0] ?? ''} names no note`).toBeGreaterThan(0);
      for (const ref of refs) expect(ids.has(ref), `${row[0] ?? ''}: ${ref}`).toBe(true);
    }
  });

  it('binds wingfoil-cli globally in roles.yaml', () => {
    const roles = parse(readFileSync(ROLES, 'utf8')) as { global?: unknown };
    expect(roles.global).toContain('wingfoil-cli');
  });
});
