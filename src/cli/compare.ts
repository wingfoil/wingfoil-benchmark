import { join, relative } from 'node:path';

import { compareExecutions, writeComparison } from '../results/index.js';
import { loadScenario } from '../scenario/index.js';

import { EXIT, report, USAGE } from './shared.js';
import type { Io } from './shared.js';

/**
 * REQ-CLI-12: `bench campaign compare <campaign-id>/<n> <campaign-id>/<n>` (task-083), the earlier execution first. It
 * compares the two aggregated executions (REQ-SCO-13) and writes the comparison under `results/comparisons/`; it says
 * where, how many groups it compared and did not, whether the comparison is cross-model, and each pin that differs.
 */
export function compareCommand(argv: readonly string[], io: Io, root: string): number {
  if (argv.length !== 2) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  const [earlier, newer] = argv as [string, string];
  // The scenario's primary category reads its category map (REQ-RES-03), from the repository's scenarios.
  const primaryOf = (id: string, version: string) => {
    const scenario = loadScenario(join(root, 'scenarios'), id, version);
    return scenario.ok ? scenario.value.categories.primary : undefined;
  };
  const compared = compareExecutions(root, earlier, newer, primaryOf);
  if (!compared.ok) return report(compared.issues, io);
  const comparison = compared.value;
  const file = writeComparison(root, comparison);
  // Groups in one unit on both counts, the baselines' included; cross-model when the default models differ (T14).
  const groups = comparison.compared.length;
  const crossModel = comparison.earlier.model !== comparison.newer.model;
  io.stdout(
    `comparison: ${relative(root, file)} (${groups} group${groups === 1 ? '' : 's'} compared, ` +
      `${comparison.not_compared.length} not compared${crossModel ? '; cross-model' : ''})\n`,
  );
  for (const pin of comparison.pins_differ)
    io.stdout(`pin differs: ${pin.pin}: ${pin.earlier} → ${pin.newer}\n`);
  return EXIT.ok;
}
