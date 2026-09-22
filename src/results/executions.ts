import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const EXECUTION = /^[1-9]\d*$/;

/**
 * REQ-FMT-02: the number of the next execution of campaign `campaignId`, one more than the highest
 * `results/<campaign-id>/<n>/` directory, or 1 when there is none. Other entries are ignored.
 */
export function nextExecution(resultsRoot: string, campaignId: string): number {
  const dir = join(resultsRoot, campaignId);
  if (!existsSync(dir)) return 1;
  const numbers = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && EXECUTION.test(entry.name))
    .map((entry) => Number(entry.name));
  return Math.max(0, ...numbers) + 1;
}
