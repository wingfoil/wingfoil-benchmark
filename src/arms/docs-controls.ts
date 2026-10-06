import { renderProjectRules } from './baseline-docs.js';

/** One kind of content a docs generator declares: whether it renders it, and why (REQ-RUN-11 as amended). */
export interface DeclaredContent {
  readonly kind: string;
  readonly rendered: boolean;
  readonly why: string;
}

/**
 * A docs control's generator (REQ-RUN-11 as amended): what it keeps of its harness arm's configuration, as that arm's
 * setup leaves it, how it renders it as `PROJECT_RULES.md`, and its declaration, kind of content by kind of content.
 */
export interface DocsGenerator {
  readonly kept: readonly string[];
  readonly render: (files: ReadonlyMap<string, string>) => string;
  readonly declaration: readonly DeclaredContent[];
}

/** The placeholders of the constitution template Spec Kit's init leaves: by name, not any bracketed capitals. */
const SPECKIT_PLACEHOLDER = /\[(?:PROJECT_NAME|PRINCIPLE_\d+_NAME|CONSTITUTION_VERSION|RATIFICATION_DATE)\]/;

/** Where Spec Kit keeps a project's constitution. */
const CONSTITUTION = '.specify/memory/constitution.md';

/**
 * The speckit-docs generator: the principles of the speckit arm's constitution — the scenario's rules, as its rules
 * generator wrote them (REQ-FMT-14) — as `PROJECT_RULES.md`. A constitution still holding init's own placeholders
 * (`[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]` …; a rule's text may hold other brackets) declares no rule: the file then says so, so that the manual it is read through never names a missing file.
 */
export function renderSpeckitDocs(files: ReadonlyMap<string, string>): string {
  const constitution = files.get(CONSTITUTION) ?? '';
  const start = constitution.indexOf('\n### ');
  if (start < 0 || SPECKIT_PLACEHOLDER.test(constitution)) {
    return '# Project rules\n\nThis project declares no rules beyond its README.\n';
  }
  return [
    '# Project rules',
    '',
    'The rules this project follows. Every change follows them.',
    '',
    '## Rules',
    '',
    constitution.slice(start + 1).trimEnd(),
    '',
  ].join('\n');
}

/** The docs generator of each harness arm, by its tool: one docs control per harness (T3, the approver's triage). */
export const DOCS_GENERATORS: Readonly<Record<string, DocsGenerator>> = {
  wingfoil: {
    kept: ['.wingfoil', 'docs/memory'],
    render: renderProjectRules,
    declaration: [
      {
        kind: '`dna.yaml` project, stacks, modules',
        rendered: true,
        why: "the project's description and parts",
      },
      {
        kind: '`dna.yaml` team and paths',
        rendered: false,
        why: "WingFoil's process and navigation; the Benchmark Approver is the arm's approval mechanism",
      },
      {
        kind: 'directives bound to developer, and the global ones',
        rendered: true,
        why: 'what the wingfoil manual sends the agent to read',
      },
      {
        kind: 'directives of other roles only',
        rendered: false,
        why: 'the manual does not send the agent to them',
      },
      { kind: 'approved decision-logs and ADRs', rendered: true, why: 'decisions already taken: rules' },
      {
        kind: 'Memory elements in any other state or type',
        rendered: false,
        why: 'process state, not rules',
      },
      {
        kind: 'workflows: name, description, phases',
        rendered: true,
        why: 'the process the project follows',
      },
      {
        kind: '`memory.yaml`, Memory templates, `workflows.yaml`',
        rendered: false,
        why: "the tool's own mechanics",
      },
    ],
  },
  speckit: {
    kept: ['.specify/memory'],
    render: renderSpeckitDocs,
    declaration: [
      {
        kind: "the constitution's principles",
        rendered: true,
        why: "the scenario's rules, which the manual sends the agent to read",
      },
      { kind: "the constitution template's placeholders", rendered: false, why: 'no project information' },
      {
        kind: 'skills (`.claude/skills/speckit-*`)',
        rendered: false,
        why: "the tool's own mechanics: how its process is followed",
      },
      {
        kind: 'templates, scripts, the workflow and its registry (`.specify/`)',
        rendered: false,
        why: "the tool's own mechanics",
      },
      {
        kind: 'integration, option and manifest files (`.specify/`)',
        rendered: false,
        why: "the tool's own settings",
      },
    ],
  },
};

/** The docs generator of `tool`, if it has one: an own entry only, so that a tool named `constructor` has none. */
export function docsGeneratorOf(tool: string | undefined): DocsGenerator | undefined {
  return tool !== undefined && Object.hasOwn(DOCS_GENERATORS, tool) ? DOCS_GENERATORS[tool] : undefined;
}
