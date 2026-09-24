// Prints the fields REQ-RUN-09 reads, and the ones that say whether the session actually worked.
import { readFileSync } from 'node:fs';
for (const line of readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean)) {
  let e;
  try {
    e = JSON.parse(line);
  } catch {
    continue;
  }
  if (e.type !== 'result') continue;
  const u = e.usage ?? {};
  console.log(
    JSON.stringify(
      {
        session_id: e.session_id,
        subtype: e.subtype,
        is_error: e.is_error,
        terminal_reason: e.terminal_reason,
        num_turns: e.num_turns,
        duration_ms: e.duration_ms,
        duration_api_ms: e.duration_api_ms,
        total_cost_usd: e.total_cost_usd,
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        cache_creation_input_tokens: u.cache_creation_input_tokens,
        cache_read_input_tokens: u.cache_read_input_tokens,
        models: Object.keys(e.modelUsage ?? {}),
      },
      null,
      1,
    ),
  );
}
