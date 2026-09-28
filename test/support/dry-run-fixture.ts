import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

/** A dry-run profile (task-021) for the fake agent, with a currency rate that shows in the output. */
export function dryRunProfileYaml(): Record<string, unknown> {
  return {
    harnesses: { wingfoil: { tool: 'wingfoil', version: '3df305e' } },
    agent: { name: 'fake', version: '1.0.0' },
    models: { default: 'fake-model' },
    approver_policy: 'v1',
    caps: { step_time_s: 60, step_tokens: 1000, run_cost_eur: 1 },
    currency: { usd_to_eur: 0.5 },
  };
}

/** Write `scenarios/dry-run.yaml` under `root` (a string verbatim). */
export function writeDryRunProfile(
  root: string,
  yaml: Record<string, unknown> | string = dryRunProfileYaml(),
): string {
  const file = join(root, 'scenarios', 'dry-run.yaml');
  writeFileSync(file, typeof yaml === 'string' ? yaml : stringify(yaml));
  return file;
}
