import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * How checks read text (REQ-SCO-06 as amended in 1.12, task-035), shared by the loader, which refuses a
 * content check its own prompt satisfies and reads the seed's dependencies, and by scoring, which runs
 * the checks on what a step wrote.
 */

/** A text's lines, without the empty one after a final newline. */
export function linesOf(text: string): string[] {
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Text as a content check compares it (REQ-SCO-06): lower case, with every run of whitespace, line
 * breaks included, folded to one space.
 */
export function foldText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

/** Whether every group of `patterns` has a pattern in `text`, folded as {@link foldText} folds both. */
export function satisfies(text: string, patterns: readonly (readonly string[])[]): boolean {
  const folded = foldText(text);
  return patterns.every((group) => group.some((pattern) => folded.includes(foldText(pattern))));
}

/** A line as a v2 content check compares it (REQ-SCO-06 as amended in 1.49): lower case, whitespace runs folded. */
function foldLine(line: string): string {
  return line.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
}

/** A word's character: a letter, a combining mark, a digit or `_`, in any script. */
const WORD = '[\\p{L}\\p{M}\\p{N}_]';

/**
 * Whether `pattern` stands in `line` as whole words: no word character just before or just after it, whatever the
 * pattern's own first and last characters ("(revised)" is not found in "D3(revised)").
 */
function hasWords(line: string, pattern: string): boolean {
  const escaped = foldLine(pattern.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!${WORD})${escaped}(?!${WORD})`, 'u').test(line);
}

/**
 * Whether every group of `patterns` has a pattern in `lines` as whole words (REQ-SCO-06 as amended in 1.49,
 * task-128): case and whitespace folded within a line, never across two; a stem is not its inflections.
 */
export function satisfiesWords(lines: readonly string[], patterns: readonly (readonly string[])[]): boolean {
  const folded = lines.map(foldLine);
  return patterns.every((group) => group.some((pattern) => folded.some((line) => hasWords(line, pattern))));
}

/**
 * The runtime dependencies of the `package.json` in `directory`, by name, sorted; none when it has no
 * such file or it is not JSON (REQ-SCO-05, task-037): a dependencies check counts additions.
 */
export function dependenciesOf(directory: string): string[] {
  try {
    const manifest = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8')) as unknown;
    const dependencies = (manifest as { dependencies?: unknown } | null)?.dependencies;
    if (dependencies === null || typeof dependencies !== 'object') return [];
    return Object.keys(dependencies).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  } catch {
    return [];
  }
}
