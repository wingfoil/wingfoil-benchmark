/** How long a line of the readable transcript may be: a tool's input or an unknown line is cut there. */
const WIDTH = 200;

/** How many lines of a tool result the condensed transcript keeps. */
const RESULT_LINES = 5;

/** `text` on one line, cut to `width` characters with an ellipsis. */
function cut(text: string, width: number = WIDTH): string {
  return text.length <= width ? text : `${text.slice(0, width - 1)}…`;
}

interface Block {
  readonly type?: string;
  readonly text?: string;
  readonly name?: string;
  readonly input?: unknown;
  readonly content?: unknown;
  readonly is_error?: boolean;
}

interface Event {
  readonly type?: string;
  readonly subtype?: string;
  readonly message?: { readonly content?: unknown };
  readonly num_turns?: number;
  readonly stop_reason?: string;
  readonly total_cost_usd?: number;
  readonly is_error?: boolean;
  readonly result?: unknown;
}

/** A tool result's text: a string, or the text of its blocks. */
function resultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return (content as Block[])
    .map((block) => (block.type === 'text' && typeof block.text === 'string' ? block.text : ''))
    .join('\n');
}

function blocksOf(event: Event): Block[] {
  const content = event.message?.content;
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return Array.isArray(content) ? (content as Block[]) : [];
}

/**
 * A step's transcript as a reader follows it (F5.3, task-043), from Claude Code's stream-json, one event
 * per line: the assistant's and the user's text whole; each tool call as its name and its input on one
 * line; each tool result as its first lines, or all of them with `full`, an error said; the session's
 * result, an error said, and its text. System events and thinking are left out. A line that is not an event it knows is kept as it is, cut to one line.
 */
export function readableTranscript(lines: readonly string[], options: { readonly full: boolean }): string[] {
  const out: string[] = [];
  const quoted = (text: string, mark: string) => {
    const all = text.replace(/\n+$/, '').split('\n');
    const shown = options.full ? all : all.slice(0, RESULT_LINES);
    for (const line of shown) out.push(`  ${mark} ${line}`);
    if (shown.length < all.length) out.push(`  ${mark} … ${all.length - shown.length} more lines`);
  };
  for (const line of lines) {
    if (line.trim() === '') continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      parsed = undefined;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      out.push(cut(`- ? ${line}`));
      continue;
    }
    const event = parsed as Event;
    if (event.type === 'system') continue;
    if (event.type === 'result') {
      const cost =
        typeof event.total_cost_usd === 'number' ? `${event.total_cost_usd.toFixed(4)} USD` : '? USD';
      const outcome = event.is_error === true ? `error (${event.subtype ?? '?'})` : (event.subtype ?? '?');
      out.push(`- result: ${outcome}, ${event.stop_reason ?? '?'}, ${event.num_turns ?? '?'} turns, ${cost}`);
      // The session's last words: where a question or a request for approval is, when it ends on one.
      if (typeof event.result === 'string' && event.result !== '') quoted(event.result, '<');
      continue;
    }
    if (event.type !== 'assistant' && event.type !== 'user') {
      out.push(cut(`- ? ${line}`));
      continue;
    }
    for (const block of blocksOf(event)) {
      if (block.type === 'text' && typeof block.text === 'string') {
        // The user's text can be a long prompt or a summary: on one line, unless full.
        out.push(
          event.type === 'user' && !options.full
            ? cut(`- user: ${block.text.replace(/\s*\n\s*/g, ' ')}`)
            : `- ${event.type}: ${block.text}`,
        );
      } else if (block.type === 'tool_use') {
        out.push(cut(`- tool ${block.name ?? '?'}: ${JSON.stringify(block.input ?? {})}`));
      } else if (block.type === 'tool_result') {
        const text = resultText(block.content);
        quoted(block.is_error === true ? `(error) ${text}` : text, '>');
      }
    }
  }
  return out;
}
