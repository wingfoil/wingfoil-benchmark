// task-077 — the WingFoil feedback inbox (WingFoil dl-163 R1, R4), checked as WingFoil-Templates'
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
/** The first body line names the usage notes the note was migrated from (task-077). */
const FIRST_LINE = /^\n(Formerly (N\d+(?:, N\d+)*)\.)\n/;
/** The usage notes N1–N51 that the old inbox held, each migrated once. */
const MIGRATED = 51;

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

  it('opens with the usage notes the note was migrated from', () => {
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
    const migrated = notes.flatMap((note) => usageNotes(FIRST_LINE.exec(note.body)?.[2] ?? ''));
    // Each positive observation is a bullet that opens with its usage note in bold: `- **N5 — …**`.
    const positives = section(readme(), '### Positive observations')
      .split('\n')
      .flatMap((line) => usageNotes(/^- \*\*(N\d+) /.exec(line)?.[1] ?? ''));
    const all = [...migrated, ...positives].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: MIGRATED }, (_, index) => index + 1));
  });
});
