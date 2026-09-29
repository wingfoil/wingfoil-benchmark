/**
 * How checks read text (REQ-SCO-06 as amended in 1.12, task-035), shared by the loader, which refuses a
 * content check its own prompt satisfies, and by scoring, which runs it on what a step wrote.
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
