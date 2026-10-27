#!/usr/bin/env node
// wingfoil-sync (task-109): the status and `answered_by` of each note of docs/wingfoil-feedback/, read from what
// WingFoil published, by the mapping of its COLLABORATION.md "The sync procedure" and nothing else (the
// wingfoil-cli directive's rule 6). It reads, from a WingFoil checkout fetched with its tags:
//   - the newest retrospective's `## Consumer feedback` table (docs/04_memory/design/dls/retro-v<X.Y>.md) at <ref>,
//     only the rows of this repository's service;
//   - its triage record (docs/09_retrospectives/rl-*/rel-v<X.Y>-feedback-triage.md), for the commit it read;
//   - the `## Scope changes` of every patch released since (docs/04_memory/planning/rl-*/patch-v<X.Y>.*.md);
//   - every element citing one of the notes, `git grep` at <grep-ref> (origin/main by default).
// A `captured` note becomes `resolved` once every element in its `answered_by` is, at <ref>, in its type's shipped
// state (SHIPPED below) and names in its `release:` a release tag of WingFoil no later than the version this repository
// pins (package.json, npm:wingfoil@<version>); a note captured at an earlier sync is re-checked so, row or not.
// A note no row names stays as it is. It prints one line per note; with --write it changes the notes' `status` and
// `answered_by` lines and the README ledger's two columns, nothing else.
//
//   node scripts/wingfoil-sync.mjs <wingfoil-checkout> <ref> [--grep-ref <ref>] [--write]
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

const SERVICE =
  'svc-020-github-repository-wingfoil-benchmark-the-benchmark-consumer-project-and-its-feedback-inbox';
const INBOX = 'docs/wingfoil-feedback';
const NOTE_FILE = /^F-(\d{3,})-[a-z0-9-]+\.md$/;

const args = process.argv.slice(2);
const write = args.includes('--write');
const grepAt = args.indexOf('--grep-ref');
const grepRef = grepAt >= 0 ? args[grepAt + 1] : 'origin/main';
const [wingfoil, ref] = args.filter((arg, i) => !arg.startsWith('--') && (grepAt < 0 || i !== grepAt + 1));
if (wingfoil === undefined || ref === undefined || grepRef === undefined) {
  process.stderr.write('usage: wingfoil-sync.mjs <wingfoil-checkout> <ref> [--grep-ref <ref>] [--write]\n');
  process.exit(2);
}
const repo = process.cwd();

/** @param {string[]} gitArgs */
const git = (...gitArgs) =>
  execFileSync('git', ['-C', wingfoil, ...gitArgs], { encoding: 'utf8', maxBuffer: 1 << 28 });
/** @param {string} path */
const show = (path) => git('show', `${ref}:${path}`);
/** @param {string} dir */
const files = (dir) =>
  git('ls-tree', '-r', '--name-only', ref, '--', dir)
    .split('\n')
    .filter((line) => line !== '');

/** `vX.Y` or `vX.Y.Z` as a comparable triple, or undefined. @param {string} text */
function version(text) {
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/.exec(text.trim());
  return match === null ? undefined : [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}
/** @param {number[]} a @param {number[]} b */
const compare = (a, b) => (a[0] ?? 0) - (b[0] ?? 0) || (a[1] ?? 0) - (b[1] ?? 0) || (a[2] ?? 0) - (b[2] ?? 0);

/** The table rows after a heading, header and rule skipped, as trimmed cells. @param {string} source @param {string} heading */
function table(source, heading) {
  const text = `\n${source}`;
  const lines = text.slice(text.indexOf(`\n${heading}\n`) + 1).split('\n');
  const first = lines.findIndex((line) => line.startsWith('|'));
  if (!text.includes(`\n${heading}\n`) || first < 0) return [];
  const end = lines.findIndex((line, i) => i > first && !line.startsWith('|'));
  return lines.slice(first + 2, end < 0 ? undefined : end).map((line) =>
    line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim()),
  );
}

// 1. The pin.
const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
const pinText = /^npm:wingfoil@(\d+\.\d+\.\d+)$/.exec(pkg.devDependencies?.wingfoil ?? '')?.[1];
const pin = pinText === undefined ? undefined : version(pinText);
if (pin === undefined) {
  process.stderr.write('package.json pins no published wingfoil (npm:wingfoil@<version>)\n');
  process.exit(1);
}
const tags = git('tag', '-l', 'v*')
  .split('\n')
  .filter((tag) => version(tag) !== undefined);

// 2. The newest retrospective and its records.
const retros = files('docs/04_memory/design/dls')
  .map((path) => ({ path, v: version(/\/retro-(v[\d.]+)\.md$/.exec(path)?.[1] ?? '') }))
  .filter((retro) => retro.v !== undefined)
  .sort((a, b) => compare(/** @type {number[]} */ (b.v), /** @type {number[]} */ (a.v)));
const retro = retros[0];
if (retro === undefined) {
  process.stderr.write(`no retro-v<X.Y>.md at ${ref}\n`);
  process.exit(1);
}
const retroVersion = /retro-(v[\d.]+)\.md$/.exec(retro.path)?.[1] ?? '';
const decisions = new Map();
for (const [cite = '', decision = '', element = '', target = ''] of table(
  show(retro.path),
  '## Consumer feedback',
)) {
  const match = new RegExp(`^\`${SERVICE}/(F-\\d{3,})@([0-9a-f]{40})\`$`).exec(cite);
  if (match === null) continue;
  const elements = [...element.matchAll(/`([a-z]+-\d+)`/g)].map((m) => m[1] ?? '');
  decisions.set(match[1], { sha: match[2], decision, elements, target });
}
const triagePath = files('docs/09_retrospectives').find((path) =>
  path.endsWith(`/rel-${retroVersion}-feedback-triage.md`),
);
const triageRow =
  triagePath === undefined
    ? undefined
    : table(show(triagePath), '## Services read').find((row) => row[0] === `\`${SERVICE}\``);
const patches = files('docs/04_memory/planning').filter((path) =>
  new RegExp(`/patch-${retroVersion.replace('.', '\\.')}\\.\\d+\\.md$`).test(path),
);
const patchNotes = patches.flatMap((path) => {
  const text = show(path);
  const start = text.indexOf('\n## Scope changes\n');
  if (start < 0) return [];
  const scope = text.slice(start);
  const body = scope.slice(0, scope.indexOf('\n## ', 1) < 0 ? undefined : scope.indexOf('\n## ', 1));
  return body.includes(`${SERVICE}/F-`) ? [path] : [];
});

// 3. Every element citing a note.
let grep = '';
try {
  grep = git('grep', '-o', `${SERVICE}/F-[0-9]*@[0-9a-f]*`, grepRef, '--', 'docs/04_memory');
} catch {
  // git grep exits 1 when nothing matches: no element cites a note.
}
const cited = new Map();
for (const line of grep.split('\n')) {
  const match = new RegExp(`^[^:]+:docs/04_memory/(?:.*/)?([a-z]+-\\d+)[^/]*:${SERVICE}/(F-\\d{3,})@`).exec(
    line,
  );
  if (match === null || /\/retro-v/.test(line)) continue;
  const list = cited.get(match[2]) ?? [];
  if (!list.includes(match[1])) list.push(match[1]);
  cited.set(match[2], list);
}

/**
 * The state in which an element of each WingFoil type has shipped, read from WingFoil's `.wingfoil/memory.yaml` at
 * v0.3.1: the end of the bug, task and decision-log sequences, and the adopted state of an ADR and a tech-spec (their
 * sequences end at `superseded`; one superseded since counts as not shipped, which keeps its note `captured`). Any
 * other type (a change-proposal ends at `scheduled`) never counts as shipped.
 */
const SHIPPED = /** @type {Record<string, string>} */ ({
  bug: 'closed',
  task: 'done',
  'decision-log': 'ready',
  adr: 'accepted',
  'tech-spec': 'approved',
});

/** The release an element names in its `release:` at <ref>, if it is a tag no later than the pin. @param {string} id */
function shipped(id) {
  const path = files('docs/04_memory').find((file) => new RegExp(`/${id}-[^/]*\\.md$`).test(file));
  if (path === undefined) return { ok: false, why: `${id} not found at ${ref}` };
  const text = show(path);
  // Shipped means in its type's shipped state too: a stamped `release:` alone is a target.
  const type = /^type:\s*"?([a-z-]+)"?/m.exec(text)?.[1] ?? '';
  const state = /^status:\s*"?([a-z-]+)"?/m.exec(text)?.[1] ?? '';
  const done = Object.hasOwn(SHIPPED, type) ? SHIPPED[type] : undefined;
  if (done === undefined)
    return { ok: false, why: `${id} is a ${type || 'typeless'} element, never shipped` };
  if (state !== done) return { ok: false, why: `${id} is ${state}, not ${done}` };
  const release = /^release:\s*"?([^"#\s]*)"?/m.exec(text)?.[1] ?? '';
  const v = version(release);
  const tag = tags.find((t) => v !== undefined && compare(/** @type {number[]} */ (version(t)), v) === 0);
  if (v === undefined || tag === undefined)
    return { ok: false, why: `${id} release "${release}" names no release tag` };
  if (compare(v, /** @type {number[]} */ (pin)) > 0)
    return { ok: false, why: `${id} ships in ${tag}, after the pin` };
  return { ok: true, why: `${id} shipped in ${tag}` };
}

// 4. The mapping.
const MAPPING = {
  'needs-info': 'needs-info',
  declined: 'declined',
  superseded: 'resolved',
};
const notes = readdirSync(join(repo, INBOX))
  .filter((name) => NOTE_FILE.test(name))
  .sort();
/** @type {{ file: string, id: string, status: string, answered: string[], why: string }[]} */
const results = notes.map((file) => {
  const id = `F-${NOTE_FILE.exec(file)?.[1]}`;
  const text = readFileSync(join(repo, INBOX, file), 'utf8');
  const status = /^status: (.*)$/m.exec(text)?.[1] ?? '';
  const answered = /** @type {string[]} */ (parse(/^answered_by: (.*)$/m.exec(text)?.[1] ?? '[]') ?? []);
  const row = decisions.get(id);
  if (row === undefined) {
    // A note captured at an earlier sync is not read again; it is resolved once its elements ship.
    if (status === 'captured' && answered.length > 0) {
      const checks = answered.map(shipped);
      const resolved = checks.every((check) => check.ok);
      const whys = checks.map((check) => check.why).join('; ');
      return {
        file,
        id,
        status: resolved ? 'resolved' : 'captured',
        answered,
        why: `captured earlier: ${whys}`,
      };
    }
    return { file, id, status, answered, why: `not read by retro-${retroVersion}: unchanged` };
  }
  const label = `${row.decision}${row.elements.length > 0 ? ` (${row.elements.join(', ')})` : ''}`;
  if (row.decision in MAPPING) {
    return {
      file,
      id,
      status: MAPPING[/** @type {keyof typeof MAPPING} */ (row.decision)],
      answered: [],
      why: label,
    };
  }
  if (['covered', 'element', 'restated'].includes(row.decision) && row.elements.length > 0) {
    const checks = row.elements.map(shipped);
    const resolved = checks.every((check) => check.ok);
    const whys = checks.map((check) => check.why).join('; ');
    return {
      file,
      id,
      status: resolved ? 'resolved' : 'captured',
      answered: row.elements,
      why: `${label}: ${whys}`,
    };
  }
  if (row.decision === 'restated')
    return { file, id, status: 'open', answered: [], why: `${label}, no element` };
  process.stderr.write(`${id}: decision "${row.decision}" is not in the mapping\n`);
  process.exit(1);
});

const commit = git('rev-parse', `${ref}^{commit}`).trim();
const grepCommit = git('rev-parse', `${grepRef}^{commit}`).trim();
const out = [
  `pin: wingfoil@${pinText}`,
  `records read at ${ref} (${commit}): ${retro.path}; ${triagePath ?? 'no triage record'}`,
  `triage read this inbox at: ${triageRow?.[2] ?? 'not named'} (${triageRow?.[3] ?? '?'} notes)`,
  `patches since ${retroVersion}: ${patches.length === 0 ? 'none' : patches.join(', ')}; notes in their scope changes: ${patchNotes.length === 0 ? 'none' : patchNotes.join(', ')}`,
  `citations at ${grepRef} (${grepCommit}): ${[...cited].map(([note, ids]) => `${note} ← ${ids.join(', ')}`).join('; ') || 'none'}`,
];
for (const [note, ids] of cited) {
  const row = decisions.get(note);
  const unlisted = ids.filter((id) => !(row?.elements ?? []).includes(id));
  if (unlisted.length > 0)
    out.push(`warning: ${note} is cited by ${unlisted.join(', ')}, which its row does not name`);
}
out.push('', '| Note | Status | Answered by | From |', '|---|---|---|---|');
for (const r of results) out.push(`| ${r.id} | ${r.status} | ${r.answered.join(', ')} | ${r.why} |`);
const counts = new Map();
for (const r of results) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
out.push('', `counts: ${[...counts].map(([status, n]) => `${status} ${n}`).join(', ')}`);
process.stdout.write(`${out.join('\n')}\n`);

if (write) {
  for (const r of results) {
    const path = join(repo, INBOX, r.file);
    const text = readFileSync(path, 'utf8');
    const next = text
      .replace(/^status: .*$/m, `status: ${r.status}`)
      .replace(/^answered_by: .*$/m, `answered_by: [${r.answered.join(', ')}]`);
    if (next !== text) writeFileSync(path, next);
  }
  const readmePath = join(repo, INBOX, 'README.md');
  const readme = readFileSync(readmePath, 'utf8');
  const byFile = new Map(results.map((r) => [r.file, r]));
  const ledger = readme
    .split('\n')
    .map((line) => {
      const file = /^\| \[F-\d{3,}\]\(([^)]+)\) \|/.exec(line)?.[1];
      const r = file === undefined ? undefined : byFile.get(file);
      if (r === undefined) return line;
      const cells = line.split(/(?<!\\)\|/);
      // ['', link, title, kind, status, answered, '']
      cells[4] = ` ${r.status} `;
      cells[5] = r.answered.length === 0 ? ' ' : ` ${r.answered.join(', ')} `;
      return cells.join('|');
    })
    .join('\n');
  if (ledger !== readme) writeFileSync(readmePath, ledger);
}
