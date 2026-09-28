import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadDryRunProfile } from '../../../src/scenario/index.js';
import { dryRunProfileYaml, writeDryRunProfile } from '../../support/dry-run-fixture.js';
import { tempDir } from '../../support/scenario-fixture.js';

function profile(yaml: Record<string, unknown> | string = dryRunProfileYaml()) {
  const root = tempDir('bench-repo-');
  mkdirSync(join(root, 'scenarios'));
  return loadDryRunProfile(writeDryRunProfile(root, yaml));
}

describe('the dry-run profile, scenarios/dry-run.yaml (task-021)', () => {
  it('loads a profile that pins what a campaign pins, but for the budget and the runs', () => {
    expect(profile()).toEqual({ ok: true, value: dryRunProfileYaml() });
  });

  it('is an issue of its own when it is missing', () => {
    const root = tempDir('bench-repo-');
    expect(loadDryRunProfile(join(root, 'scenarios', 'dry-run.yaml'))).toEqual({
      ok: false,
      issues: [{ path: 'dry-run.yaml', message: `not found in ${join(root, 'scenarios')}` }],
    });
  });

  it('rejects a budget, the campaign fields and unknown keys', () => {
    const result = profile({
      ...dryRunProfileYaml(),
      budget: { warn_eur: 1, ceiling_eur: 2 },
      scenarios: [],
      models: { default: 'fake-model', slices: [] },
    });
    expect(result).toEqual({
      ok: false,
      issues: [
        { path: 'models.slices', message: 'is not a known field' },
        { path: 'budget', message: 'is not a known field' },
        { path: 'scenarios', message: 'is not a known field' },
      ],
    });
  });

  it('checks a pin as a campaign checks it', () => {
    const result = profile({
      ...dryRunProfileYaml(),
      harnesses: { wingfoil: { tool: 'wingfoil', version: 'main' } },
      agent: { name: 'fake', version: 'latest' },
      caps: { step_time_s: 60, step_tokens: 1000 },
      models: { default: 'Fake Model' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.path).sort()).toEqual([
      'agent.version',
      'caps.run_cost_eur',
      'harnesses.wingfoil.version',
      'models.default',
    ]);
  });
});
