// Prints the final assistant message of a recorded session, verbatim.
import { readFileSync } from 'node:fs';
let last = '';
for (const line of readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean)) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }
  if (event.type !== 'assistant') continue;
  const text = (event.message?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text);
  if (text.length > 0) last = text.join('\n');
}
process.stdout.write(last);
