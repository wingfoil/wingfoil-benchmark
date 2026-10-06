import { developerDirectives, shiftHeadings } from './baseline-docs.js';

/**
 * Spec Kit's constitution from a scenario's project rules (REQ-FMT-14, task-066). The rules stay declared once, in the
 * scenario, as the wingfoil arm's directives (dl-005); this generator renders the same ones baseline-docs does — those
 * the developer role reads, its own and the global ones, by id — deterministically and outside the scenario's content
 * hash, into Spec Kit's own place for project rules, `.specify/memory/constitution.md`, in the shape of its template: a
 * title, then "Core Principles", one principle per rule, its title the directive's and its body unchanged but for a
 * leading heading repeating the title and the levels of the headings below it. Nothing else of the configuration (the
 * DNA, the roles, WingFoil's mechanics) is rendered: Spec Kit's constitution is where a project's rules go, and only
 * there.
 */

/** The constitution of the scenario configuration `files` (path → text), or `undefined` when it declares no rule. */
export function renderConstitution(files: ReadonlyMap<string, string>): string | undefined {
  const rules = developerDirectives(files).map((directive) => {
    const lines = directive.body.trim().split('\n');
    const repeats = new RegExp(`^#\\s+${directive.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
    const body = (repeats.test(lines[0] ?? '') ? lines.slice(1) : lines).join('\n');
    return { title: directive.title, body: shiftHeadings(body).trim() };
  });
  if (rules.length === 0) return undefined;
  return [
    '# Project constitution',
    '',
    "The project's rules. Every change follows them.",
    '',
    '## Core Principles',
    '',
    ...rules.flatMap(({ title, body }) => [`### ${title}`, '', ...(body === '' ? [] : [body, ''])]),
  ].join('\n');
}
