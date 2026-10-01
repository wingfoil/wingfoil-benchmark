import { buildSite } from '../site/index.js';

import { EXIT, report, USAGE } from './shared.js';
import type { Io } from './shared.js';

/** A campaign execution, `<campaign-id>/<n>`: the id is 12 hex digits (REQ-FMT-02), so never a path. */
const CAMPAIGN_EXECUTION = /^[0-9a-f]{12}\/[1-9]\d*$/;

/**
 * `bench site build <campaign-id>/<n>` (REQ-CLI-09 as amended in 1.20, F5.5): builds the static site of an
 * aggregated execution into `site/`, and prints what it wrote and the headline. It never publishes.
 */
export function siteCommand(argv: readonly string[], io: Io, root: string): number {
  const [verb, execution, ...rest] = argv;
  if (verb !== 'build' || execution === undefined || rest.length > 0) return usage(io);
  if (/^dry-runs\/[1-9]\d*$/.test(execution)) {
    return report([{ path: execution, message: 'a dry run is never aggregated (REQ-RES-01)' }], io);
  }
  if (!CAMPAIGN_EXECUTION.test(execution)) return usage(io);
  const built = buildSite(root, execution);
  if (!built.ok) return report(built.issues, io);
  io.stdout(`site: ${built.value.directory} (${built.value.pages} pages)\n`);
  for (const line of built.value.headlines) io.stdout(`${line}\n`);
  return EXIT.ok;
}

function usage(io: Io): number {
  io.stderr(USAGE);
  return EXIT.usage;
}
