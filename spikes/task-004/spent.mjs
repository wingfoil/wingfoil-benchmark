// Sums `total_cost_usd` over every `result` event recorded under the given directory.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
let total = 0;
for (const name of readdirSync(dir)) {
  if (!name.endsWith('.jsonl')) continue;
  for (const line of readFileSync(join(dir, name), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === 'result' && typeof event.total_cost_usd === 'number') total += event.total_cost_usd;
    } catch {
      // a line that is not JSON is not a result event
    }
  }
}
process.stdout.write(total.toFixed(4));
