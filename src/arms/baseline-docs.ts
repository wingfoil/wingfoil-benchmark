import { parse } from 'yaml';

/**
 * The baseline-docs generator (REQ-RUN-11, F2.5): the wingfoil arm's configuration for a scenario,
 * rendered as one Markdown file, `PROJECT_RULES.md`. A pure function of that configuration — a map from
 * each file's path in the workspace to its text, as the snapshot step kept it — so that the parity of
 * information between baseline-docs and wingfoil is a property of this code (experiment design §2, T3).
 *
 * What it renders, and what it leaves out (task-015 Design, "the same information"):
 *
 * - `dna.yaml` `project`, `stacks`, `modules`: rendered — the project's description and parts.
 * - `dna.yaml` `team` (roles, members) and `paths`: left out — WingFoil's process and navigation; the
 *   Benchmark Approver is the arm's approval mechanism (REQ-RUN-17), not project information.
 * - directives bound to `developer`, and the `global` ones: rendered in full — what the wingfoil
 *   manual sends the agent to read. Directives of other roles only: left out, as the manual does.
 * - Memory `decision-log` and `adr` elements with `status: approved`: rendered, title and body. Any
 *   other state or type: left out — process state, not rules.
 * - workflows (`.wingfoil/workflows/custom/*.yaml`): name, description, phases.
 * - `memory.yaml`, Memory templates, `workflows.yaml`: left out — the tool's own mechanics.
 *
 * Deterministic: fixed templates, sections in a fixed order, entries sorted by id or name, YAML read
 * and never re-serialized, bodies copied with their headings moved under the file's own.
 */
export function renderProjectRules(files: ReadonlyMap<string, string>): string {
  const blocks = [
    '# Project rules',
    "This file is generated from the wingfoil arm's configuration for this scenario. It holds the\n" +
      "project's description, its rules and the decisions already taken.",
    ...project(files),
    ...rules(files),
    ...decisions(files),
    ...process(files),
  ];
  return `${blocks.join('\n\n')}\n`;
}

/** Headings of a copied body sit this many levels below where they were, under the file's own. */
const HEADING_SHIFT = 3;

type Yaml = Record<string, unknown>;

function yamlOf(content: string | undefined): Yaml {
  return object(content === undefined ? undefined : parse(content));
}

/** A YAML mapping, or an empty one for anything else. */
function object(value: unknown): Yaml {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Yaml) : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** `dna.yaml`'s project, stacks and modules; nothing when it has none of them. */
function project(files: ReadonlyMap<string, string>): string[] {
  const dna = yamlOf(files.get('.wingfoil/dna.yaml'));
  const about = object(dna.project);
  const name = text(about.name);
  const description = text(about.description);
  const blocks: string[] = [];
  if (name !== '' || description !== '') {
    blocks.push([name === '' ? '' : `**${name}**`, description].filter((part) => part !== '').join(' — '));
  }
  if (text(about.methodology) !== '') blocks.push(`Methodology: ${text(about.methodology)}`);
  const stacks = object(dna.stacks);
  const stackLines = [
    ['Technologies', list(stacks.technologies).map(nameOf)],
    ['Methodologies', list(stacks.methodologies).map(nameOf)],
  ]
    .filter(([, names]) => (names as string[]).some((entry) => entry !== ''))
    .map(
      ([label, names]) =>
        `- ${label as string}: ${(names as string[]).filter((entry) => entry !== '').join(', ')}`,
    );
  if (stackLines.length > 0) blocks.push(stackLines.join('\n'));
  const modules = list(dna.modules)
    .map((module) => {
      const entry = typeof module === 'string' ? { name: module } : object(module);
      const described = text(entry.description);
      return text(entry.name) === ''
        ? ''
        : `- **${text(entry.name)}**${described === '' ? '' : ` — ${described}`}`;
    })
    .filter((line) => line !== '');
  if (modules.length > 0) blocks.push('Modules:', modules.join('\n'));
  return blocks.length > 0 ? ['## Project', ...blocks] : [];
}

/** A stack entry is a name or an object with one. */
function nameOf(entry: unknown): string {
  return typeof entry === 'string' ? text(entry) : text(object(entry).name);
}

/** The directives the developer role reads: its own and the global ones, by id. */
function rules(files: ReadonlyMap<string, string>): string[] {
  const roles = yamlOf(files.get('.wingfoil/roles.yaml'));
  const assignments = object(roles.assignments);
  const wanted = new Set([...list(assignments.developer), ...list(roles.global)].map(text));
  const directives = documents(files, (path) => /^\.wingfoil\/directives\/[^/]+\/[^/]+\.md$/.test(path))
    .filter((document) => wanted.has(document.id))
    .sort(byId);
  return directives.length > 0 ? ['## Rules', ...directives.flatMap(render)] : [];
}

/** The approved decision-logs and ADRs, by id. */
function decisions(files: ReadonlyMap<string, string>): string[] {
  const approved = documents(files, (path) => /^docs\/memory\/(decision-log|adr)\/[^/]+\.md$/.test(path))
    .filter((document) => document.status === 'approved')
    .sort(byId);
  return approved.length > 0 ? ['## Decisions', ...approved.flatMap(render)] : [];
}

/** Every workflow, by name, with its phases in their order. */
function process(files: ReadonlyMap<string, string>): string[] {
  const workflows = [...files]
    .filter(([path]) => /^\.wingfoil\/workflows\/custom\/[^/]+\.ya?ml$/.test(path))
    .map(([, content]) => yamlOf(content))
    .filter((workflow) => text(workflow.name) !== '')
    .sort((a, b) => compare(text(a.name), text(b.name)));
  const blocks = workflows.flatMap((workflow) => {
    const phases = list(workflow.phases).map((phase, index) => {
      const entry = typeof phase === 'string' ? { name: phase } : object(phase);
      const described = text(entry.description);
      return `${index + 1}. **${text(entry.name)}**${described === '' ? '' : ` — ${described}`}`;
    });
    return [`### ${text(workflow.name)}`, text(workflow.description), phases.join('\n')].filter(
      (block) => block !== '',
    );
  });
  return blocks.length > 0 ? ['## Process', ...blocks] : [];
}

interface Document {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly body: string;
}

/** The Markdown documents among `files` whose path `matches`, with their frontmatter read. */
function documents(files: ReadonlyMap<string, string>, matches: (path: string) => boolean): Document[] {
  return [...files]
    .filter(([path]) => matches(path))
    .map(([path, content]) => {
      const found = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(content);
      const front = yamlOf(found?.[1]);
      const fallback = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '');
      return {
        id: text(front.id) || fallback,
        title: text(front.title) || text(front.id) || fallback,
        status: text(front.status),
        body: found?.[2] ?? content,
      };
    });
}

function render(document: Document): string[] {
  const body = shiftHeadings(document.body).trim();
  return [`### ${document.title}`, ...(body === '' ? [] : [body])];
}

/** Every heading outside a code fence, moved {@link HEADING_SHIFT} levels down, to at most six. */
function shiftHeadings(body: string): string {
  let fenced = false;
  return body
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
      const heading = fenced ? null : /^(#{1,6})(\s.*)$/.exec(line);
      if (heading === null) return line.trimEnd();
      const level = Math.min(6, (heading[1] ?? '').length + HEADING_SHIFT);
      return `${'#'.repeat(level)}${heading[2] ?? ''}`;
    })
    .join('\n');
}

function byId(a: Document, b: Document): number {
  return compare(a.id, b.id);
}

/** Code-point order: the same on every machine, whatever its locale. */
function compare(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
