import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { renderConstitution } from '../../../src/arms/index.js';
import { repoPath } from '../../support/paths.js';

const directive = (title: string, body: string) =>
  [
    '---',
    `id: ${title.toLowerCase().replace(/ /g, '-')}`,
    'type: directive',
    `title: "${title}"`,
    '---',
    '',
    `# ${title}`,
    '',
    body,
    '',
  ].join('\n');

describe("Spec Kit's constitution from a scenario's project rules (REQ-FMT-14)", () => {
  it('renders each directive as a principle, in path order, its body unchanged and without its front matter', () => {
    const files = new Map([
      ['.wingfoil/directives/custom/r2-b.md', directive('Second rule', 'Do the second thing.')],
      ['.wingfoil/directives/custom/r1-a.md', directive('First rule', 'Do the first thing.\n\nAnd mean it.')],
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
        'And mean it.',
        '',
        '### Second rule',
        '',
        'Do the second thing.',
        '',
      ].join('\n'),
    );
  });

  it('is undefined for a scenario that declares no rules, so that init leaves its own template', () => {
    expect(renderConstitution(new Map([['.wingfoil/dna.yaml', 'project: {}\n']]))).toBeUndefined();
  });

  it("renders S8's four rules, the same bytes every time", () => {
    const dir = repoPath('scenarios/S8/1.0/arms/wingfoil/.wingfoil/directives/custom');
    const files = new Map(
      readdirSync(dir).map((name) => [
        `.wingfoil/directives/custom/${name}`,
        readFileSync(join(dir, name), 'utf8'),
      ]),
    );
    const first = renderConstitution(files);
    expect(first).toBe(renderConstitution(new Map([...files].reverse())));
    expect(first?.match(/^### /gm)).toHaveLength(4);
    expect(first).toContain('### No new runtime dependency\n');
    expect(first).not.toContain('type: directive');
  });
});
