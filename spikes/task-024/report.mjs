// What a session's stream says about its end, its cost, and whether usage came before the result.
import { readFileSync } from 'node:fs';

const base = process.argv[2];
const events = readFileSync(`${base}.jsonl`, 'utf8')
  .split('\n')
  .flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
const result = events.find((event) => event.type === 'result');
const assistants = events.filter((event) => event.type === 'assistant');
const withUsage = assistants.filter((event) => event.message?.usage !== undefined);
const kinds = [...new Set(events.map((event) => `${event.type}${event.subtype ? `/${event.subtype}` : ''}`))];
console.log(
  JSON.stringify(
    {
      exit: readFileSync(`${base}.exit`, 'utf8').trim(),
      seconds: readFileSync(`${base}.seconds`, 'utf8').trim(),
      stderr: readFileSync(`${base}.stderr`, 'utf8').trim().slice(0, 300),
      events: events.length,
      kinds,
      assistantEvents: assistants.length,
      assistantEventsWithUsage: withUsage.length,
      firstAssistantUsage: withUsage[0]?.message?.usage,
      result: result && {
        subtype: result.subtype,
        is_error: result.is_error,
        terminal_reason: result.terminal_reason,
        total_cost_usd: result.total_cost_usd,
        num_turns: result.num_turns,
        duration_ms: result.duration_ms,
        usage: result.usage,
        result: String(result.result ?? '').slice(0, 200),
        errors: result.errors,
      },
    },
    undefined,
    2,
  ),
);
