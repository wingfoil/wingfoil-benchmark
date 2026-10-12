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
  // The groups matched in both, baselines included; the rows with a change, and those whose side says why not; and the
  // groups not compared.
  const groups = comparison.compared.length;
  const changed = comparison.rows.filter((row) => row.change !== undefined).length;
  const noted = comparison.rows.length - changed;
  const notCompared = comparison.not_compared.length;
  const crossModel = comparison.earlier.model !== comparison.newer.model;
  const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
  io.stdout(
    `comparison: ${relative(root, file)} (${count(groups, 'group')} matched, ${count(changed, 'row')} with a change, ` +
      `${count(noted, 'row')} without, ${count(notCompared, 'group')} not compared${crossModel ? '; cross-model' : ''})\n`,
  );
  for (const pin of comparison.pins_differ)
    io.stdout(`pin differs: ${pin.pin}: ${pin.earlier} → ${pin.newer}\n`);
  return EXIT.ok;
}
