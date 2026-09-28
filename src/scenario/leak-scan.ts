import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { leakScanSchema, parseWith, readYamlFile } from '../core/index.js';
import type { Issue, LeakScanDeclarations, Result, Scenario } from '../core/index.js';

import type { HoldoutAdditions } from './holdout.js';

/**
 * The leak scan (REQ-FMT-08, task-017 Design): what a run's agent sees — the step prompts and the seed —
 * must not name a harness nor hold the oracle's content or the arm configuration's rules. A finding names
 * where it is (the step, the seed file) and where the content comes from (the oracle or arm file), and
 * never the content itself: for the hold-out that is required, and one rule then covers every source.
 */

/** Names in the seed that a run's setup reserves: Claude Code reads the first two, WingFoil the third. */
const RESERVED_ANYWHERE = ['CLAUDE.md', '.claude', '.wingfoil'];
/** Names reserved at the seed's root only: the runner writes the first, the agent would read the second. */
const RESERVED_AT_ROOT = ['PROJECT_RULES.md', '.mcp.json'];

/** Read the declarations file; a missing or malformed one is an issue, never a silent default. */
export function loadLeakScanDeclarations(file: string): Result<LeakScanDeclarations> {
  const read = readYamlFile(file);
  if (!read.ok) return read;
  return parseWith(leakScanSchema, read.value, basename(file));
}

/**
 * The quoted strings of an oracle file of at least `minLength` characters, each once, in order: its
 * expected values and its test names. Module specifiers (`from '…'`, `import('…')`, `require('…')`)
 * are not oracle content, nor are strings of whitespace and punctuation only; a template literal with
 * `${}` is not a fixed value. Numbers are not literals in v0.1 (a known limit of the scan).
 */
export function oracleLiterals(text: string, minLength: number): string[] {
  const found: string[] = [];
  const literal = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  for (const match of text.matchAll(literal)) {
    const [, quote, body = ''] = match;
    const before = text.slice(0, match.index).trimEnd();
    if (/(\bfrom|\bimport\s*\(|\brequire\s*\()$/.test(before)) continue;
    if (quote === '`' && body.includes('${')) continue;
    const value = body.replace(/\\(.)/g, '$1');
    if (value.length < minLength || !/[\p{L}\p{N}]/u.test(value)) continue;
    if (!found.includes(value)) found.push(value);
  }
  return found;
}

/**
 * The prose lines of an arm configuration's Markdown document (K3, dl-005), after its frontmatter, of
 * at least `minLength` characters, with heading marks and list bullets removed.
 */
export function armLines(text: string, minLength: number): string[] {
  const body = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
  return body
    .split('\n')
    .map((line) => line.replace(/^\s*(#{1,6}\s+|[-*+]\s+|\d+\.\s+)/, '').trim())
    .filter((line) => line.length >= minLength);
}

/** Every mention of a declared harness in `text`, case-insensitively on word boundaries, as written. */
export function harnessMentions(text: string, names: readonly string[]): string[] {
  return names.flatMap((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_-])${escaped}(?![\\p{L}\\p{N}_-])`, 'giu'))].map(
      (match) => match[0],
    );
  });
}

/** A source of content the agent must not see: a label for messages, and what to look for. */
interface Source {
  readonly label: string;
  readonly needles: readonly string[];
  readonly verb: 'holds a literal of' | 'repeats a line of';
}

/**
 * Scan `scenario` (REQ-FMT-08): its prompts, by step, then its seed. `holdout` is the scenario's
 * additions (task-016), read here into memory and named only by file.
 */
export function scanScenario(
  scenario: Scenario,
  declarations: LeakScanDeclarations,
  holdout?: HoldoutAdditions,
): Issue[] {
  const min = declarations.oracle_literal_min_length;
  const sources: Source[] = [
    ...oracleFiles(scenario).map((file) => ({
      label: relative(scenario.dir, file),
      needles: oracleLiterals(readFileSync(file, 'utf8'), min),
      verb: 'holds a literal of' as const,
    })),
    ...(holdout === undefined
      ? []
      : holdout.files.map((file) => ({
          label: `the hold-out file ${file}`,
          needles: oracleLiterals(readFileSync(join(holdout.dir, file), 'utf8'), min),
          verb: 'holds a literal of' as const,
        }))),
    ...Object.entries(scenario.armDirs)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .flatMap(([, dir]) =>
        filesUnder(dir)
          .filter((file) => file.endsWith('.md'))
          .map((file) => ({
            label: relative(scenario.dir, file),
            needles: armLines(readFileSync(file, 'utf8'), min),
            verb: 'repeats a line of' as const,
          })),
      ),
  ];
  const leaks = (text: string) =>
    sources.filter((source) => source.needles.some((needle) => text.includes(needle)));

  const issues: Issue[] = [];
  scenario.steps.forEach((step, index) => {
    const path = `steps[${index}].prompt_file`;
    const text = readFileSync(step.promptPath, 'utf8');
    for (const mention of harnessMentions(text, declarations.harness_names)) {
      issues.push({ path, message: `names the harness '${mention}'` });
    }
    for (const source of leaks(text)) issues.push({ path, message: `${source.verb} ${source.label}` });
  });
  for (const reserved of reservedIn(scenario.seedDir)) {
    issues.push({ path: 'seed', message: `holds ${reserved}, which a run's setup reserves` });
  }
  for (const file of filesUnder(scenario.seedDir)) {
    const text = readFileSync(file, 'utf8');
    for (const source of leaks(text)) {
      issues.push({
        path: 'seed',
        message: `${relative(scenario.seedDir, file)} ${source.verb} ${source.label}`,
      });
    }
  }
  return issues;
}

/** The public oracle's files and its checks, in a stable order. */
function oracleFiles(scenario: Scenario): string[] {
  return [...filesUnder(scenario.oracle.publicTestsDir), ...scenario.oracle.checks];
}

/** The reserved names in a seed, as paths relative to it, in a stable order; a reserved directory is not entered. */
function reservedIn(seed: string): string[] {
  const found: string[] = [];
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const atRoot = directory === seed;
      if (RESERVED_ANYWHERE.includes(name) || (atRoot && RESERVED_AT_ROOT.includes(name))) {
        found.push(relative(seed, path));
      } else if (statSync(path).isDirectory()) {
        walk(path);
      }
    }
  };
  walk(seed);
  return found;
}

/** Every file below `directory` (one the loader found), sorted, not following links. */
function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : entry.isFile() ? [path] : [];
    });
}
