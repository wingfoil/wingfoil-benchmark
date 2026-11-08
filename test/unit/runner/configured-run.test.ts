import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import {
  COMMITS,
  configuredRepo,
  generatedConstitution,
  sha256,
  snapshots,
  SOURCES,
  writeFixtureConfiguration,
} from '../../support/configured-arm-fixture.js';
import { doubles } from '../../support/runner-doubles.js';

const CONSTITUTION = { '.specify/memory/constitution.md': '# Configured\n' };

describe("a configured arm's run and its docs control's generation (REQ-RUN-03, REQ-RUN-11 as amended in 1.50)", () => {
  it('refuses to generate a configured docs control over rules other than its record’s, naming the control', async () => {
    const repo = configuredRepo(['baseline', 'speckit-configured', 'speckit-docs-configured'], ['S1@1.1']);
    writeFixtureConfiguration(repo.root, {
      scenario: 'S1@1.1',
      arm: 'speckit-configured',
      files: CONSTITUTION,
      record: { rules_sha256: 'f'.repeat(64) },
    });
    const checked = checkCampaign(repo.file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const ports = doubles({ commits: COMMITS, onRunOnce: snapshots });
    await expect(runCampaign(checked.value, { ...ports, harnessSources: SOURCES })).rejects.toThrow(
      /the speckit-docs-configured arm of S1@1\.1: the project rules its speckit-configured setup generated \([0-9a-f]{64}\) differ from those the configuration was written over \(f{64}\)/,
    );
  });

  it('generates it from the configured workspace when the rules are the record’s', async () => {
    const repo = configuredRepo(['baseline', 'speckit-configured', 'speckit-docs-configured'], ['S1@1.1']);
    const rules = generatedConstitution(repo.root, 'S1@1.1');
    writeFixtureConfiguration(repo.root, {
      scenario: 'S1@1.1',
      arm: 'speckit-configured',
      files: { '.specify/memory/constitution.md': `${rules}\n### Configured: one more principle\n` },
      record: { rules_sha256: sha256(rules) },
    });
    const checked = checkCampaign(repo.file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const ports = doubles({ commits: COMMITS, onRunOnce: snapshots });
    const summary = await runCampaign(checked.value, { ...ports, harnessSources: SOURCES });
    const generated = readFileSync(
      join(summary.resultsDir, 'generated', 'S1@1.1', 'speckit-docs-configured', 'PROJECT_RULES.md'),
      'utf8',
    );
    expect(generated).toContain('Configured: one more principle');
  });

  it('never runs a configured arm as its base arm when the version holds no configuration', async () => {
    const repo = configuredRepo(['baseline', 'speckit-configured'], ['S1@1.1']);
    writeFixtureConfiguration(repo.root, {
      scenario: 'S1@1.1',
      arm: 'speckit-configured',
      files: CONSTITUTION,
      record: { rules_sha256: sha256(generatedConstitution(repo.root, 'S1@1.1')) },
    });
    const checked = checkCampaign(repo.file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    // A campaign that reached the runner by another path, its scenario holding no configuration
    const scenarios = checked.value.scenarios.map((scenario) => ({ ...scenario, configurations: {} }));
    const ports = doubles({ commits: COMMITS, onRunOnce: snapshots });
    const summary = await runCampaign({ ...checked.value, scenarios }, { ...ports, harnessSources: SOURCES });
    const run = summary.runs.find((candidate) => candidate.arm === 'speckit-configured');
    const record = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'run.json'), 'utf8')) as {
      outcome: string;
      error?: string;
    };
    expect(record).toMatchObject({
      outcome: 'failed',
      error: 'S1@1.1 holds no configuration for speckit-configured',
    });
  });
});
