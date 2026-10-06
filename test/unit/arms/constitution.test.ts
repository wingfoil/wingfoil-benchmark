import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { renderConstitution } from '../../../src/arms/index.js';
import { repoPath } from '../../support/paths.js';

const directive = (id: string, title: string, body: string, quote = '"') =>
  [
    '---',
    `id: ${id}`,
    'type: directive',
    `title: ${quote}${title}${quote}`,
    '---',
    '',
    `# ${title}`,
    '',
    body,
    '',
  ].join('\n');

const ROLES = [
  'assignments:',
  '  developer:',
  '    - r1-a',
  '  reviewer:',
  '    - r3-review',
  'global:',
  '  - r2-b',
  '',
].join('\n');

describe("Spec Kit's constitution from a scenario's project rules (REQ-FMT-14)", () => {
  it('renders the directives the developer reads — its own and the global ones — by id, as principles', () => {
    const files = new Map([
      ['.wingfoil/roles.yaml', ROLES],
      ['.wingfoil/directives/custom/r2-b.md', directive('r2-b', 'Second rule', 'Do the second thing.', "'")],
      [
        '.wingfoil/directives/custom/r1-a.md',
        directive('r1-a', 'First rule', 'Do the first thing.\n\n## Why\n\nMean it.'),
      ],
      [
        '.wingfoil/directives/custom/r3-review.md',
        directive('r3-review', 'Review rule', 'Only for reviewers.'),
      ],
      ['.wingfoil/dna.yaml', 'project: {}\n'],
    ]);
    expect(renderConstitution(files)).toBe(
      [
        '# Project constitution',
        '',
        "The project's rules. Every change follows them.",
        '',
        '## Core Principles',
        '',
        '### First rule',
        '',
        'Do the first thing.',
        '',
        '##### Why',
        '',
        'Mean it.',
        '',
        '### Second rule',
        '',
        'Do the second thing.',
        '',
      ].join('\n'),
    );
  });

  it('is undefined for a scenario that declares no rule the developer reads, so that init leaves its template', () => {
    expect(renderConstitution(new Map([['.wingfoil/dna.yaml', 'project: {}\n']]))).toBeUndefined();
    expect(
      renderConstitution(
        new Map([
          ['.wingfoil/roles.yaml', ROLES],
          [
            '.wingfoil/directives/custom/r3-review.md',
            directive('r3-review', 'Review rule', 'Only for reviewers.'),
          ],
        ]),
      ),
    ).toBeUndefined();
  });

  it("renders S8's four rules, the same bytes every time", () => {
    const base = repoPath('scenarios/S8/1.0/arms/wingfoil/.wingfoil');
    const dir = join(base, 'directives', 'custom');
    const files = new Map([
      ['.wingfoil/roles.yaml', readFileSync(join(base, 'roles.yaml'), 'utf8')],
      ...readdirSync(dir).map((name): [string, string] => [
        `.wingfoil/directives/custom/${name}`,
        readFileSync(join(dir, name), 'utf8'),
      ]),
    ]);
    const first = renderConstitution(files);
    expect(first).toBe(renderConstitution(new Map([...files].reverse())));
    expect(first?.match(/^### /gm)).toHaveLength(4);
    expect(first).toContain('### No new runtime dependency\n');
    expect(first).not.toContain('type: directive');
  });
});
