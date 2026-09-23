import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const EXECUTION = /^[1-9]\d*$/;

/**
 * REQ-FMT-02: the number of the next execution of campaign `campaignId`, one more than the highest
 * `results/<campaign-id>/<n>/` directory, or 1 when there is none. Other entries are ignored.
 *
 * @throws `Error` when the campaign's results directory exists but cannot be listed: that is a broken
 * environment, not a campaign that fails validation.
 */
export function nextExecution(resultsRoot: string, campaignId: string): number {
  const dir = join(resultsRoot, campaignId);
  if (!existsSync(dir)) return 1;

  let names: string[];
  try {
    names = readdirSync(dir);
  } catch (error) {
    throw new Error(`cannot read the results directory ${dir}: ${(error as Error).message}`, { cause: error });
  }
  const numbers = names
    .filter((name) => EXECUTION.test(name) && Number(name) <= Number.MAX_SAFE_INTEGER && isDirectory(join(dir, name)))
    .map(Number);
  return Math.max(0, ...numbers) + 1;
}

/** Symbolic links are followed: a link to a directory is an execution like any other. */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
