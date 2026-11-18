import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../../../src/site/markdown.js';
import { repoPath } from '../../support/paths.js';

const html = (text: string, blocks: Record<string, string> = {}) => renderMarkdown(text, { blocks }).html;

describe('the site Markdown subset (task-046)', () => {
  it('renders headings with their anchor, and paragraphs joined from their lines', () => {
    expect(html('# How it works {#method}\n\nOne line\nand the next.\n')).toBe(
      '<h1 id="method">How it works</h1>\n<p>One line and the next.</p>\n',
    );
    expect(html('### Plain heading\n')).toBe('<h3>Plain heading</h3>\n');
  });

  it('gives a paragraph or a list item the anchor at its end', () => {
    expect(html('A statement. {#a-statement}\n')).toBe('<p id="a-statement">A statement.</p>\n');
    expect(html('- first {#first}\n- second\n')).toBe(
      '<ul>\n<li id="first">first</li>\n<li>second</li>\n</ul>\n',
    );
  });

  it('renders lists with continuation lines and one nested level', () => {
    expect(html('- one\n  continued\n- two\n  - nested\n  - nested too\n- three\n')).toBe(
      '<ul>\n<li>one continued</li>\n<li>two\n<ul>\n<li>nested</li>\n<li>nested too</li>\n</ul>\n</li>\n<li>three</li>\n</ul>\n',
    );
  });

  it('renders tables, their header row apart', () => {
    expect(html('| a | b |\n|---|---|\n| 1 | `x` |\n')).toBe(
      '<table>\n<thead><tr><th>a</th><th>b</th></tr></thead>\n<tbody>\n<tr><td>1</td><td><code>x</code></td></tr>\n</tbody>\n</table>\n',
    );
  });

  it('renders inline code, emphasis, strong and links, code spans left as they are', () => {
    expect(html('Use `a *b* c`, *this*, **that** and [the page](material/manual-baseline.html).\n')).toBe(
      '<p>Use <code>a *b* c</code>, <em>this</em>, <strong>that</strong> and ' +
        '<a href="material/manual-baseline.html">the page</a>.</p>\n',
    );
    // A code span across a line break, as the manuals have
    expect(html('run `wingfoil memory add --title "<a\nb>"` then\n')).toBe(
      '<p>run <code>wingfoil memory add --title &quot;&lt;a b&gt;&quot;</code> then</p>\n',
    );
  });

  it('escapes every text, and links only to relative pages or https', () => {
    expect(html('<script>alert(1)</script> & "q"\n')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot;</p>\n',
    );
    expect(html('[x](javascript:alert(1)) [y](https://example.org/a?b=1&c=2)\n')).toBe(
      '<p>x <a href="https://example.org/a?b=1&amp;c=2">y</a></p>\n',
    );
  });

  it('replaces a placeholder comment with its generated block, and drops any other comment', () => {
    expect(
      html('Before.\n\n<!-- execution -->\n\n<!-- a note -->\n', { execution: '<p>generated</p>' }),
    ).toBe('<p>Before.</p>\n<p>generated</p>\n');
  });

  it('renders fenced code as preformatted, escaped text', () => {
    expect(html('```\n<a> & b\n```\n')).toBe('<pre><code>&lt;a&gt; &amp; b\n</code></pre>\n');
  });

  it('leaves out a front matter block, and lists every anchor in order', () => {
    const result = renderMarkdown('---\nid: r1\ntitle: "R1"\n---\n\n# R1 {#r1}\n\nText {#text}\n');
    expect(result.html).toBe('<h1 id="r1">R1</h1>\n<p id="text">Text</p>\n');
    expect(result.anchors).toEqual(['r1', 'text']);
  });

  it('refuses a protocol-relative link, and drops a link the build has no page for (task-046 review)', () => {
    expect(html('[x](//evil.example/a)\n')).toBe('<p>x</p>\n');
    expect(
      renderMarkdown('[m](material/manual-x.html) and [n](material/y.html)\n', {
        resolve: (target) => (target === 'material/manual-x.html' ? null : undefined),
      }).html,
    ).toBe('<p>m and <a href="material/y.html">n</a></p>\n');
  });

  it("keeps the text whatever it holds, the converter's own markers included", () => {
    expect(html('a \uE0000\uE000 [l](b.html)\n')).toBe('<p>a 0 <a href="b.html">l</a></p>\n');
  });

  it('keeps a pipe inside a code span within its table cell', () => {
    expect(html('| a | b |\n|---|---|\n| `x|y` | z |\n')).toContain(
      '<tr><td><code>x|y</code></td><td>z</td></tr>',
    );
  });

  it('resolves each link target as it renders it, and refuses a root-absolute link (third review)', () => {
    const seen: string[] = [];
    const resolve = (target: string) => {
      seen.push(target);
      return target.startsWith('material/gone') ? null : undefined;
    };
    // An unmatched backtick in an earlier block does not hide a later link
    expect(
      renderMarkdown('A stray ` tick.\n\nSee [m](material/gone.html) and [k](kept.html) `code`.\n', {
        resolve,
      }).html,
    ).toBe('<p>A stray ` tick.</p>\n<p>See m and <a href="kept.html">k</a> <code>code</code>.</p>\n');
    expect(seen).toEqual(['material/gone.html', 'kept.html']);
    expect(html('[x](/etc/passwd)\n')).toBe('<p>x</p>\n');
  });

  it('splits a table row on a pipe after an unmatched backtick', () => {
    expect(html("| a | b |\n|---|---|\n| it's a ` tick | two |\n")).toContain(
      '<tr><td>it&#39;s a ` tick</td><td>two</td></tr>',
    );
  });
});

/**
 * Each input's HTML, rendered in a process of its own under a timeout: a shape that once hung the reader must fail
 * its test and not take the whole test run down with it (task-156's review).
 */
function bounded(inputs: readonly string[]): string[] {
  const module = pathToFileURL(repoPath('src/site/markdown.ts')).href;
  const script =
    `const { renderMarkdown } = await import(${JSON.stringify(module)});` +
    `console.log(JSON.stringify(JSON.parse(process.argv[1]).map((input) => renderMarkdown(input).html)));`;
  const result = spawnSync(
    process.execPath,
    [
      '--max-old-space-size=256',
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      script,
      JSON.stringify(inputs),
    ],
    { cwd: repoPath(''), encoding: 'utf8', timeout: 20_000 },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as string[];
}

describe('ordered lists in the site Markdown subset (task-156, bug-037)', () => {
  it('renders a numbered list as an ordered list, its items as a bullet item takes them', () => {
    expect(html('1. a\n2. c\n')).toBe('<ol>\n<li>a</li>\n<li>c</li>\n</ol>\n');
    expect(html('1. one\n   continued {#first}\n2. two\n')).toBe(
      '<ol>\n<li id="first">one continued</li>\n<li>two</li>\n</ol>\n',
    );
    expect(html('1. a\n\n2. b\n')).toBe('<ol>\n<li>a</li>\n<li>b</li>\n</ol>\n');
  });

  it('keeps the number a list starts at', () => {
    expect(html('3. a\n4. b\n')).toBe('<ol start="3">\n<li>a</li>\n<li>b</li>\n</ol>\n');
  });

  it('starts a new list when the marker changes', () => {
    expect(html('- a\n1. b\n')).toBe('<ul>\n<li>a</li>\n</ul>\n<ol>\n<li>b</li>\n</ol>\n');
    expect(html('1. a\n- b\n')).toBe('<ol>\n<li>a</li>\n</ol>\n<ul>\n<li>b</li>\n</ul>\n');
  });

  it('lets only a line starting 1. open a list inside a text', () => {
    expect(html('Intro\n2026. was the year\n')).toBe('<p>Intro 2026. was the year</p>\n');
    expect(html('Intro\n1. a\n')).toBe('<p>Intro</p>\n<ol>\n<li>a</li>\n</ol>\n');
    expect(html('- a\n  2. b\n')).toBe('<ul>\n<li>a 2. b</li>\n</ul>\n');
  });

  it('nests a list of either kind inside an item of the other', () => {
    expect(bounded(['1. a\n   - b\n2. c\n', '- a\n  1. b\n  2. c\n- d\n'])).toEqual([
      '<ol>\n<li>a\n<ul>\n<li>b</li>\n</ul>\n</li>\n<li>c</li>\n</ol>\n',
      '<ul>\n<li>a\n<ol>\n<li>b</li>\n<li>c</li>\n</ol>\n</li>\n<li>d</li>\n</ul>\n',
    ]);
  }, 30_000);

  it('keeps every nested list of an item', () => {
    expect(bounded(['1. a\n   - b\n   1. c\n'])).toEqual([
      '<ol>\n<li>a\n<ul>\n<li>b</li>\n</ul>\n<ol>\n<li>c</li>\n</ol>\n</li>\n</ol>\n',
    ]);
  }, 30_000);

  it('renders a bullet indented at the top level as a list', () => {
    expect(bounded(['  - a\n  - b\n'])).toEqual(['<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n']);
  }, 30_000);

  it('keeps a wrapped number in the item it wraps, in the order it was written (review)', () => {
    expect(
      bounded([
        '- first\n  - nested\n  2026. was the year\n- next\n',
        '- a\n  - b\n  3. c\n  more\n',
        '1. a\n   - b\n   2. c\n3. d\n',
        '1. a\n   1. b\n\n  3. c\n',
        '- a\n  - b\n 3. c\n',
      ]),
    ).toEqual([
      '<ul>\n<li>first\n<ul>\n<li>nested 2026. was the year</li>\n</ul>\n</li>\n<li>next</li>\n</ul>\n',
      '<ul>\n<li>a\n<ul>\n<li>b 3. c more</li>\n</ul>\n</li>\n</ul>\n',
      '<ol>\n<li>a\n<ul>\n<li>b 2. c</li>\n</ul>\n</li>\n<li>d</li>\n</ol>\n',
      '<ol>\n<li>a\n<ol>\n<li>b</li>\n</ol>\n</li>\n</ol>\n<ol start="3">\n<li>c</li>\n</ol>\n',
      '<ul>\n<li>a\n<ul>\n<li>b</li>\n</ul>\n3. c</li>\n</ul>\n',
    ]);
  }, 30_000);

  it('opens a list at another number only at the head of a text or after a blank line (review)', () => {
    expect(html('- item\n2026. was the year\n')).toBe(
      '<ul>\n<li>item</li>\n</ul>\n<p>2026. was the year</p>\n',
    );
    expect(html('- a\n\n2. b\n')).toBe('<ul>\n<li>a</li>\n</ul>\n<ol start="2">\n<li>b</li>\n</ol>\n');
    expect(html('2. a\n')).toBe('<ol start="2">\n<li>a</li>\n</ol>\n');
  });

  it('reads the number as a number: a start of 0, and 01 as 1 (review)', () => {
    expect(html('0. a\n')).toBe('<ol start="0">\n<li>a</li>\n</ol>\n');
    expect(html('Intro\n01. a\n')).toBe('<p>Intro</p>\n<ol>\n<li>a</li>\n</ol>\n');
  });

  it('finishes on every shape that used to hang, in a process a regression cannot block', () => {
    const inputs = [
      '1. a\n   - b\n2. c\n',
      '  - a\n1. b\n',
      '   - a\n',
      ' * a\n  - b\n - c\n',
      '- a\n   - b\n  - c\n- d\n',
      '   1. a\n 2. b\n',
      '| not a table\n  - a\n|---|\n',
    ];
    expect(bounded(inputs)).toHaveLength(inputs.length);
  }, 30_000);

  it('shows the eligibility page five criteria as an ordered list (characterization)', () => {
    const page = html(readFileSync(repoPath('site-content/eligibility.md'), 'utf8'));
    expect(page).toContain('<ol>\n<li><strong>agent-and-model</strong> — it runs with the campaign');
    for (const id of ['pinnable', 'headless-container', 'workflow-harness', 'no-own-llm'])
      expect(page).toContain(`<li><strong>${id}</strong> — `);
    expect(page).not.toContain('<p>1. ');
  });
});
