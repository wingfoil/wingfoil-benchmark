import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../../../src/site/markdown.js';

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
});
