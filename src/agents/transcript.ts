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
}

interface Event {
  readonly type?: string;
  readonly subtype?: string;
  readonly message?: { readonly content?: unknown };
  readonly num_turns?: number;
  readonly stop_reason?: string;
  readonly total_cost_usd?: number;
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
 * per line: the assistant's text whole; each tool call as its name and its input on one line; each tool
 * result as its first lines, or all of them with `full`; the session's result. System events and
 * thinking are left out. A line that is not an event it knows is kept as it is, cut to one line.
 */
export function readableTranscript(lines: readonly string[], options: { readonly full: boolean }): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    let event: Event;
    try {
      event = JSON.parse(line) as Event;
    } catch {
      out.push(cut(`- ? ${line}`));
      continue;
    }
    if (event.type === 'system') continue;
    if (event.type === 'result') {
      const cost =
        typeof event.total_cost_usd === 'number' ? `${event.total_cost_usd.toFixed(4)} USD` : '? USD';
      out.push(
        `- result: ${event.subtype ?? '?'}, ${event.stop_reason ?? '?'}, ${event.num_turns ?? '?'} turns, ${cost}`,
      );
      continue;
    }
    if (event.type !== 'assistant' && event.type !== 'user') {
      out.push(cut(`- ? ${line}`));
      continue;
    }
    for (const block of blocksOf(event)) {
      if (block.type === 'text' && event.type === 'assistant' && typeof block.text === 'string') {
        out.push(`- assistant: ${block.text}`);
      } else if (block.type === 'tool_use') {
        out.push(cut(`- tool ${block.name ?? '?'}: ${JSON.stringify(block.input ?? {})}`));
      } else if (block.type === 'tool_result') {
        const text = resultText(block.content).replace(/\n+$/, '').split('\n');
        const kept = options.full ? text : text.slice(0, RESULT_LINES);
        for (const shown of kept) out.push(`  > ${shown}`);
        if (kept.length < text.length) out.push(`  > … ${text.length - kept.length} more lines`);
      }
    }
  }
  return out;
}
