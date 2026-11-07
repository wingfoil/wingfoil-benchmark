/**
 * Markdown text as the benchmark reads a directive file (bug-034, task-139): line endings as LF, and its code fences.
 * A fence opens on a line that starts with three or more backticks or tildes, after up to three spaces (a backtick
 * fence's info string holds no backtick), and closes on a later line of the same character, at least as long, with
 * nothing after it but spaces. Every reader of a directive file reads its fences this one way. Container blocks are
 * not read: a fence inside a list item indented four spaces, after a tab or in a blockquote is not seen as one (the
 * review's round 1; no file of the repository has one), which a configured arm's directive must respect.
 */
export function toLf(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/** For each line, whether it is a fence line or inside a fence; and whether the last fence is left open. */
export function fencedLines(lines: readonly string[]): { fenced: boolean[]; unclosed: boolean } {
  let open: { char: string; length: number } | undefined;
  const fenced = lines.map((line) => {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence === null) return open !== undefined;
    const marker = fence[1] as string;
    const rest = fence[2] ?? '';
    if (open === undefined) {
      if (marker.startsWith('`') && rest.includes('`')) return false;
      open = { char: marker.charAt(0), length: marker.length };
    } else if (marker.charAt(0) === open.char && marker.length >= open.length && rest.trim() === '') {
      open = undefined;
    }
    return true;
  });
  return { fenced, unclosed: open !== undefined };
}

/** Whether `text` ends inside a code fence. */
export function hasUnclosedFence(text: string): boolean {
  return fencedLines(toLf(text).split('\n')).unclosed;
}
