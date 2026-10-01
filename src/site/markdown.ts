import { escapeHtml } from './render.js';

/**
 * The site's Markdown subset (task-046): what `site-content/method.md`, the arms' manuals, S8's directives
 * and S1's `NOTICE.md` use, and nothing more. Headings, paragraphs and list items take an anchor at their
 * end (`{#anchor}`); a comment alone on its line is replaced by a generated block of that name, or dropped.
 * Every text is escaped; a link leads only to a relative page or an `https` address. Fixed rules, so the
 * same text gives the same bytes (REQ-NFR-05).
 */

export interface MarkdownOptions {
  /** Generated HTML for a placeholder comment `<!-- name -->`, by name. Trusted: the build's own. */
  readonly blocks?: Readonly<Record<string, string>>;
  /** Link targets to rewrite, by the target as written (a licence file to its page). */
  readonly links?: Readonly<Record<string, string>>;
}

export interface RenderedMarkdown {
  readonly html: string;
  /** Every anchor, in the order of the text. */
  readonly anchors: readonly string[];
}

const ANCHOR = /\s*\{#([a-z0-9][a-z0-9-]*)\}\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const ITEM = /^( {0,3})[-*]\s+(.*)$/;
const COMMENT = /^<!--\s*(.*?)\s*-->$/;
const SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;

/** Render `text` (task-046's subset) to HTML, with its anchors. */
export function renderMarkdown(text: string, options: MarkdownOptions = {}): RenderedMarkdown {
  const lines = withoutFrontMatter(text.replace(/\r\n/g, '\n')).split('\n');
  const anchors: string[] = [];
  const out: string[] = [];
  const inline = (source: string) => renderInline(source, options.links ?? {});
  /** A block's text and its anchor, if it ends with one. */
  const anchored = (source: string): [string, string] => {
    const match = ANCHOR.exec(source);
    if (match === null) return [source.trim(), ''];
    anchors.push(match[1] as string);
    return [source.slice(0, match.index).trim(), ` id="${match[1] as string}"`];
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] as string;
    if (line.trim() === '') {
      index += 1;
      continue;
    }
    const comment = COMMENT.exec(line.trim());
    if (comment !== null) {
      const block = options.blocks?.[comment[1] as string];
      if (block !== undefined) out.push(block);
      index += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] as string).startsWith('```')) {
        code.push(lines[index] as string);
        index += 1;
      }
      index += 1;
      out.push(`<pre><code>${escapeHtml(code.map((codeLine) => `${codeLine}\n`).join(''))}</code></pre>`);
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading !== null) {
      const level = (heading[1] as string).length;
      const [content, id] = anchored(heading[2] as string);
      out.push(`<h${level}${id}>${inline(content)}</h${level}>`);
      index += 1;
      continue;
    }
    if (line.trimStart().startsWith('|') && SEPARATOR.test((lines[index + 1] ?? '').trim())) {
      const rows: string[] = [];
      const head = cells(line);
      index += 2;
      while (index < lines.length && (lines[index] as string).trimStart().startsWith('|')) {
        rows.push(
          `<tr>${cells(lines[index] as string)
            .map((cell) => `<td>${inline(cell)}</td>`)
            .join('')}</tr>`,
        );
        index += 1;
      }
      out.push(
        `<table>\n<thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>\n` +
          `<tbody>\n${rows.map((row) => `${row}\n`).join('')}</tbody>\n</table>`,
      );
      continue;
    }
    if (ITEM.test(line)) {
      const [html, next] = list(lines, index, 0, inline, anchored);
      out.push(html);
      index = next;
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && isParagraphLine(lines[index] as string, lines[index + 1])) {
      paragraph.push((lines[index] as string).trim());
      index += 1;
    }
    const [content, id] = anchored(paragraph.join(' '));
    out.push(`<p${id}>${inline(content)}</p>`);
  }
  return { html: out.map((block) => `${block}\n`).join(''), anchors };
}

/** Whether `line` continues a paragraph: not blank, and starting no other block. */
function isParagraphLine(line: string, next: string | undefined): boolean {
  if (line.trim() === '') return false;
  if (HEADING.test(line) || ITEM.test(line) || line.startsWith('```') || COMMENT.test(line.trim()))
    return false;
  return !(line.trimStart().startsWith('|') && SEPARATOR.test((next ?? '').trim()));
}

/**
 * A list from `lines[start]` whose items are indented by `indent`: each item's continuation lines joined
 * to it, and a deeper list inside the item before it. Returns its HTML and the next line's index.
 */
function list(
  lines: readonly string[],
  start: number,
  indent: number,
  inline: (source: string) => string,
  anchored: (source: string) => [string, string],
): [string, number] {
  const items: string[] = [];
  let index = start;
  while (index < lines.length) {
    const match = ITEM.exec(lines[index] as string);
    if (match === null || (match[1] as string).length !== indent) break;
    const text = [match[2] as string];
    index += 1;
    let nested = '';
    while (index < lines.length) {
      const line = lines[index] as string;
      if (line.trim() === '') break;
      const deeper = ITEM.exec(line);
      if (deeper !== null && (deeper[1] as string).length > indent) {
        const [html, next] = list(lines, index, (deeper[1] as string).length, inline, anchored);
        nested = `\n${html}\n`;
        index = next;
        continue;
      }
      if (deeper !== null || !line.startsWith(' ')) break;
      text.push(line.trim());
      index += 1;
    }
    const [content, id] = anchored(text.join(' '));
    items.push(`<li${id}>${inline(content)}${nested}</li>`);
    if (index < lines.length && (lines[index] as string).trim() === '' && !ITEM.test(lines[index + 1] ?? ''))
      break;
    if (index < lines.length && (lines[index] as string).trim() === '') index += 1;
  }
  return [`<ul>\n${items.map((item) => `${item}\n`).join('')}</ul>`, index];
}

/** A table row's cells, without its outer pipes. */
function cells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((cell) => cell.trim());
}

/** The text without a leading front matter block (`---` … `---`), as directives have. */
function withoutFrontMatter(text: string): string {
  if (!text.startsWith('---\n')) return text;
  const end = text.indexOf('\n---\n', 4);
  return end < 0 ? text : text.slice(end + 5);
}

const LINK = /\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/g;

/** A link target the site keeps: a relative page, or an `https` address. */
function safeTarget(target: string): boolean {
  return /^https:\/\/[^\s"<>]+$/.test(target) || /^[A-Za-z0-9._/#-]+$/.test(target);
}

/** Inline code first, its content left as it is; then links, strong and emphasis on escaped text. */
function renderInline(source: string, links: Readonly<Record<string, string>>): string {
  return source
    .split(/(`[^`]*`)/)
    .map((part, index) => {
      if (index % 2 === 1) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      const linked: string[] = [];
      const withLinks = part.replace(LINK, (_, label: string, target: string) => {
        const href = links[target] ?? target;
        linked.push(
          safeTarget(href) ? `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>` : escapeHtml(label),
        );
        return `\uE000${linked.length - 1}\uE000`;
      });
      return escapeHtml(withLinks)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
        .replace(/\uE000(\d+)\uE000/g, (_, n: string) => linked[Number(n)] ?? '');
    })
    .join('');
}
