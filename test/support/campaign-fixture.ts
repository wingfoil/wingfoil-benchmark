import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

import {
  COMPLETE_FILES,
  completeScenarioYaml,
  promptFile,
  stepNumbers,
  tempDir,
  writeScenarioAt,
} from './scenario-fixture.js';

/** The campaign of campaign.feature "A campaign file pins every variable" (REQ-FMT-01). */
export function completeCampaignYaml(): Record<string, unknown> {
  return {
    harnesses: { wingfoil: { tool: 'wingfoil', version: '3df305e' } },
    scenarios: [
      { id: 'S1', version: '1.0' },
      { id: 'S2', version: '1.0' },
      { id: 'S3', version: '1.0' },
      { id: 'S8', version: '1.0' },
    ],
    arms: ['baseline', 'baseline-docs', 'wingfoil'],
    agent: { name: 'claude-code', version: '2.1.221' },
    models: {
      default: 'claude-sonnet-5',
      slices: [
        {
          model: 'claude-opus-5',
          scenarios: ['S1'],
          arms: ['baseline', 'baseline-docs', 'wingfoil'],
          repetitions: 1,
        },
      ],
    },
    repetitions: { S1: 3, S2: 1, S3: 1, S8: 1 },
    approver_policy: 'v1',
    caps: { step_time_s: 1800, step_tokens: 2_000_000, run_cost_eur: 3 },
    budget: { warn_eur: 30, ceiling_eur: 100 },
    currency: { usd_to_eur: 0.92 },
  };
}

/** A repository layout in a fresh temporary directory: `campaigns/`, `scenarios/`, `results/`. */
export interface RepoFixture {
  readonly root: string;
  /** The campaign file, `campaigns/campaign.yaml`. */
  readonly file: string;
}

/**
 * Write `yaml` as `campaigns/campaign.yaml` (a string verbatim) and a complete scenario version for
 * each of `scenarios` (`id@version`) under `scenarios/`. Removed when the current test finishes.
 */
export function writeRepo(
  yaml: Record<string, unknown> | string = completeCampaignYaml(),
  scenarios: readonly string[] = ['S1@1.0', 'S2@1.0', 'S3@1.0', 'S8@1.0'],
  steps = 2,
): RepoFixture {
  const root = tempDir('bench-repo-');
  for (const entry of scenarios) {
    const [id = '', version = ''] = entry.split('@');
    const scenario = completeScenarioYaml(id, version, steps);
    const files = [
      ...COMPLETE_FILES.filter((file) => !file.startsWith('prompts/')),
      ...stepNumbers(steps).map(promptFile),
    ];
    writeScenarioAt(join(root, 'scenarios'), scenario, files, id, version);
  }
  mkdirSync(join(root, 'campaigns'));
  const file = join(root, 'campaigns', 'campaign.yaml');
  writeFileSync(file, typeof yaml === 'string' ? yaml : stringify(yaml));
  return { root, file };
}
