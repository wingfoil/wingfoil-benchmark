/**
 * Spec Kit's constitution from a scenario's project rules (REQ-FMT-14, task-066). The rules stay declared once, in the
 * scenario, as the wingfoil arm's directives (dl-005: `arms/wingfoil/.wingfoil/directives/…/*.md`); this generator
 * renders them, deterministically and outside the scenario's content hash, into Spec Kit's own place for project rules,
 * `.specify/memory/constitution.md`, in the shape of its template: a title, then "Core Principles", one principle per
 * rule, in path order, each with its directive's title and its body unchanged. Nothing else of the configuration (the
 * DNA, the roles, WingFoil's mechanics) is rendered: Spec Kit's constitution is where a project's rules go, and only
 * there.
 */

const DIRECTIVE = /^\.wingfoil\/directives\/.+\.md$/;
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** A directive's title and body: the front matter's `title`, else its first heading; the body after that heading. */
function principle(text: string): { title: string; body: string } {
  const front = FRONT_MATTER.exec(text);
  const rest = front === null ? text : text.slice(front[0].length);
  const heading = /^\s*#\s+(.+)\r?\n/.exec(rest);
  const declared = front === null ? undefined : /^title:\s*"?(.*?)"?\s*$/m.exec(front[1] ?? '')?.[1];
  const title = declared ?? heading?.[1]?.trim() ?? 'Rule';
  const body = (heading === null ? rest : rest.slice(heading.index + heading[0].length)).trim();
  return { title, body };
}

/** The constitution of the scenario configuration `files` (path → text), or `undefined` when it declares no rule. */
export function renderConstitution(files: ReadonlyMap<string, string>): string | undefined {
  const rules = [...files]
    .filter(([path]) => DIRECTIVE.test(path))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, text]) => principle(text));
  if (rules.length === 0) return undefined;
  return [
    '# Project constitution',
    '',
    "The project's rules. Every change follows them.",
    '',
    '## Core Principles',
    '',
    ...rules.flatMap(({ title, body }) => [`### ${title}`, '', body, '']),
  ].join('\n');
}
