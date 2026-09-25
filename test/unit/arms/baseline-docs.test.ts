import { describe, expect, it } from 'vitest';

import { renderProjectRules } from '../../../src/arms/index.js';

/** A small wingfoil configuration, as the snapshot step keeps it: path → text. */
function snapshot(): Map<string, string> {
  return new Map([
    [
      '.wingfoil/dna.yaml',
      [
        'version: 1',
        'project:',
        '  name: Orders',
        '  description: "A small orders domain."',
        '  methodology: Kanban',
        'modules:',
        '  - name: orders',
        '    description: the order aggregate',
        'stacks:',
        '  technologies: [TypeScript]',
        '  methodologies:',
        '    - name: Kanban',
        '    - name: TDD',
        'team:',
        '  members:',
        '    - name: Benchmark Approver',
        '      email: approver@benchmark.localhost',
        '      roles: [approver]',
        '  roles:',
        '    - name: developer',
        '    - name: approver',
        'paths:',
        '  config: [.wingfoil]',
        '',
      ].join('\n'),
    ],
    [
      '.wingfoil/roles.yaml',
      'version: 1\nassignments:\n  developer: [testing, no-throw]\n  reviewer: [code-review]\nglobal: [security-secrets]\n',
    ],
    [
      '.wingfoil/directives/built-in/testing.md',
      directive('testing', 'Testing', '# Testing\n\nWrite a test first.\n'),
    ],
    ['.wingfoil/directives/built-in/code-review.md', directive('code-review', 'Code review', 'Review it.\n')],
    [
      '.wingfoil/directives/custom/no-throw.md',
      directive('no-throw', 'No throw', '# No throw\n\nNever throw.\n\n\n'),
    ],
    [
      '.wingfoil/directives/custom/security-secrets.md',
      directive('security-secrets', 'Secret hygiene', 'No secrets.\n'),
    ],
    [
      'docs/memory/decision-log/dl-001-result.md',
      element('dl-001-result', 'Errors are a Result', 'approved', '## Decision\n\nReturn a Result.\n'),
    ],
    ['docs/memory/decision-log/dl-002-draft.md', element('dl-002-draft', 'A draft', 'draft', 'Not yet.\n')],
    ['docs/memory/adr/adr-001-layers.md', element('adr-001-layers', 'Layers', 'approved', 'Two layers.\n')],
    ['docs/memory/task/task-001-x.md', element('task-001-x', 'A task', 'approved', 'Done.\n')],
    [
      '.wingfoil/workflows/custom/kanban-delivery.yaml',
      '# comment\nname: kanban-delivery\nkind: sub\ndescription: "Kanban delivery loop"\nphases:\n  - name: plan\n    description: "Select the next slice."\n  - name: build\n    description: "Implement it test-first."\n',
    ],
    ['.wingfoil/memory.yaml', 'version: 1\ntypes: {}\n'],
    ['.wingfoil/memory/templates/task.md', '---\ntype: task\n---\n'],
    ['.wingfoil/workflows.yaml', 'version: 1\ninclude: []\n'],
  ]);
}

function directive(id: string, title: string, body: string): string {
  return `---\nid: ${id}\nname: ${id}\ntype: directive\nkind: custom\ntitle: "${title}"\n---\n\n${body}`;
}

function element(id: string, title: string, status: string, body: string): string {
  return `---\nid: ${id}\ntype: x\ntitle: "${title}"\nstatus: ${status}\n---\n\n${body}`;
}

describe('the baseline-docs generator (REQ-RUN-11)', () => {
  const rules = renderProjectRules(snapshot());

  it("renders the project's description, methodology, stacks and modules", () => {
    expect(rules).toContain('## Project\n\n**Orders** — A small orders domain.\n\nMethodology: Kanban\n');
    expect(rules).toContain('- Technologies: TypeScript\n- Methodologies: Kanban, TDD\n');
    expect(rules).toContain('- **orders** — the order aggregate\n');
  });

  it("leaves out the team and the navigation paths, which are the tool's, not the project's", () => {
    expect(rules).not.toMatch(/Benchmark Approver|approver@|developer|\.wingfoil/);
  });

  it("renders the developer's directives and the global ones, in full, by id; no other role's", () => {
    const headings = [...rules.matchAll(/^### (.+)$/gm)].map((match) => match[1]);
    expect(headings.slice(0, 3)).toEqual(['No throw', 'Secret hygiene', 'Testing']);
    expect(rules).toContain('### No throw\n\n#### No throw\n\nNever throw.\n');
    expect(rules).not.toContain('Code review');
  });

  it('renders the approved decisions and ADRs, and nothing in another state or of another type', () => {
    expect(rules).toContain(
      '## Decisions\n\n### Layers\n\nTwo layers.\n\n### Errors are a Result\n\n##### Decision\n\nReturn a Result.\n',
    );
    expect(rules).not.toMatch(/A draft|A task/);
  });

  it('renders each workflow with its phases', () => {
    expect(rules).toContain(
      '## Process\n\n### kanban-delivery\n\nKanban delivery loop\n\n1. **plan** — Select the next slice.\n2. **build** — Implement it test-first.\n',
    );
  });

  it('is the same bytes twice, and whatever the order of the snapshot', () => {
    const reversed = new Map([...snapshot()].reverse());
    expect(renderProjectRules(snapshot())).toBe(rules);
    expect(renderProjectRules(reversed)).toBe(rules);
  });

  it('says where it comes from, and ends with exactly one newline', () => {
    expect(rules.startsWith('# Project rules\n\n')).toBe(true);
    expect(rules).toMatch(/generated from the wingfoil arm's configuration/);
    expect(rules.endsWith('\n')).toBe(true);
    expect(rules.endsWith('\n\n')).toBe(false);
  });

  it('omits a section with nothing in it, rather than print an empty heading', () => {
    const bare = renderProjectRules(
      new Map([
        ['.wingfoil/dna.yaml', 'version: 1\nproject:\n  name: ""\n  description: ""\n'],
        ['.wingfoil/roles.yaml', 'version: 1\nassignments: {}\n'],
      ]),
    );
    expect(bare).toBe(
      "# Project rules\n\nThis file is generated from the wingfoil arm's configuration for this scenario. It holds the\nproject's description, its rules and the decisions already taken.\n",
    );
  });

  it('reads the simpler forms the files allow, and leaves code blocks as they are', () => {
    const rules = renderProjectRules(
      new Map([
        [
          '.wingfoil/dna.yaml',
          'project:\n  description: Only a description.\nmodules: [billing, 7]\nstacks:\n  technologies: [Node]\n  methodologies: []\n',
        ],
        ['.wingfoil/roles.yaml', 'assignments:\n  developer: [bare, deep, same, same-too]\n'],
        ['.wingfoil/directives/custom/bare.md', 'No frontmatter at all.\n'],
        [
          '.wingfoil/directives/custom/deep.md',
          '---\nid: deep\n---\n#### Four\n\n```\n# not a heading\n```\n',
        ],
        ['.wingfoil/directives/custom/same.md', '---\nid: same\ntitle: Same\n---\n'],
        ['.wingfoil/directives/custom/same-too.md', '---\nid: same\ntitle: Same again\n---\nBody.\n'],
        ['.wingfoil/workflows/custom/w.yaml', 'name: w\nphases:\n  - name: only\n  - just a name\n'],
        ['.wingfoil/workflows/custom/nameless.yaml', 'description: no name\n'],
        ['.wingfoil/workflows/custom/z-first-by-name.yaml', 'name: a\n'],
      ]),
    );
    expect(rules).toContain(
      '## Project\n\nOnly a description.\n\n- Technologies: Node\n\nModules:\n\n- **billing**\n',
    );
    expect(rules).toContain('### bare\n\nNo frontmatter at all.\n');
    expect(rules).toContain('### deep\n\n###### Four\n\n```\n# not a heading\n```\n');
    expect(rules).toContain('### Same\n\n### Same again\n\nBody.\n');
    expect(rules).toContain('## Process\n\n### a\n\n### w\n\n1. **only**\n2. **just a name**\n');
    expect(rules).not.toContain('no name');
  });
});
