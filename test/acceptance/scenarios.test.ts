import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { main } from '../../src/cli/index.js';
import { checkCampaign, runCampaign } from '../../src/runner/index.js';
import { loadScenario } from '../../src/scenario/index.js';
import { writeArmsNamed } from '../support/arm-fixture.js';
import { completeCampaignYaml } from '../support/campaign-fixture.js';
import { doubles } from '../support/runner-doubles.js';
import { repoPath } from '../support/paths.js';
import { tempDir, writeScenario } from '../support/scenario-fixture.js';

/**
 * A repository holding the fixture T3 — standing in for S1, S2 and S3 until W7 and W8 — and the
 * benchmark's own leak-scan declarations. `change` edits T3's version directory first.
 */
function repository(change?: (dir: string) => void): string {
  const root = tempDir('bench-repo-');
  cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
  copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
  change?.(join(root, 'scenarios', 'T3', '1.0'));
  return root;
}

/** A hold-out with T3's additions in a temporary directory: its content is never in this repository. */
function holdout(files: Record<string, string>): string {
  const root = tempDir('bench-holdout-');
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, 'scenarios', 'T3', '1.0', path, '..'), { recursive: true });
    writeFileSync(join(root, 'scenarios', 'T3', '1.0', path), content);
  }
  return root;
}

async function validate(root: string, ...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    ['scenario', 'validate', 'T3@1.0', ...argv],
    {
      stdout: (text) => (stdout += text),
      stderr: (text) => (stderr += text),
    },
    undefined,
    root,
  );
  return { code, stdout, stderr };
}

describe('scenarios.feature', () => {
  it('@F3.1 A scenario declares everything the runner and the scorer need', () => {
    const root = writeScenario();
    const dir = join(root, 'S9', '1.0');

    const result = loadScenario(root, 'S9', '1.0');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const scenario = result.value;
    expect(scenario.id).toBe('S9');
    expect(scenario.version).toBe('1.0');
    expect(scenario.seedDir).toBe(join(dir, 'seed'));
    expect(scenario.steps).toEqual([
      { n: 1, promptPath: join(dir, 'prompts/01.md') },
      { n: 2, promptPath: join(dir, 'prompts/02.md') },
    ]);
    expect(scenario.oracle.publicTestsDir).toBe(join(dir, 'oracle/public'));
    expect(scenario.categories).toEqual({ primary: 'C', secondary: ['D'] });
    expect(scenario.profiles).toEqual(['solo-developer', 'team-developer']);
    expect(scenario.gqm).toEqual(['Q-C1', 'G-X1']);
    expect(scenario.capabilities).toEqual(['workflow-engine']);
  });

  it('@F3.2 A well-formed scenario passes the validator', async () => {
    // Given scenario S1 as specified — T3, with its hold-out additions
    const root = repository();
    const additions = holdout({ 'hidden/refund.test.ts': "expect(refund(o)).toBe('refunded in full');\n" });

    // When the maintainer validates it
    const result = await validate(root, '--holdout', additions);

    // Then validation passes
    expect(result).toEqual({ code: 0, stdout: 'scenario T3@1.0 is valid (hold-out: 1 file)\n', stderr: '' });
  });

  it('@F3.2 A step prompt that names a harness is rejected', async () => {
    // Given a step prompt of S3 that mentions "WingFoil"
    const root = repository((dir) =>
      writeFileSync(join(dir, 'prompts', '02.md'), 'Record the change as a WingFoil decision.\n'),
    );

    // When the maintainer validates S3
    const result = await validate(root);

    // Then validation fails, and the message names the step and the offending text
    expect(result).toEqual({
      code: 1,
      stdout: '',
      stderr: "steps[1].prompt_file: names the harness 'WingFoil'\n",
    });
  });

  it('@F3.2 Oracle content that appears in the seed or the prompts is rejected', async () => {
    // Given a hidden test of S2 whose expected value also appears in a step prompt
    const secret = 'refunded to card 4417';
    const root = repository((dir) =>
      writeFileSync(join(dir, 'prompts', '01.md'), `Add a way to cancel an order; it ends ${secret}.\n`),
    );
    const additions = holdout({ 'hidden/refund.test.ts': `expect(refund(o)).toBe('${secret}');\n` });

    // When the maintainer validates S2 with the hold-out path configured
    const result = await validate(root, '--holdout', additions);

    // Then validation fails, and the message names the file and the step, without printing the
    // hold-out content
    expect(result).toEqual({
      code: 1,
      stdout: '',
      stderr: 'steps[0].prompt_file: holds a literal of the hold-out file hidden/refund.test.ts\n',
    });
    expect(result.stderr).not.toContain('4417');
  });

  it('@F3.4 Changing a scenario creates a new version', async () => {
    // Given S1 at version 1.0 has stored results — T3, run once by a campaign with the doubles
    const root = repository();
    mkdirSync(join(root, 'campaigns'));
    const campaign = join(root, 'campaigns', 'c.yaml');
    const yaml = (version: string) =>
      stringify({
        ...completeCampaignYaml(),
        harnesses: {},
        arms: ['baseline'],
        scenarios: [{ id: 'T3', version }],
        repetitions: { T3: 1 },
        agent: { name: 'fake', version: '1.0.0' },
        models: { default: 'fake-model' },
      });
    writeFileSync(campaign, yaml('1.0'));
    writeArmsNamed(root, ['baseline']);
    const first = checkCampaign(campaign);
    if (!first.ok) throw new Error(JSON.stringify(first.issues));
    const summary = await runCampaign(first.value, doubles());
    const recordFile = join(summary.runs[0]?.outputDir ?? '', 'run.json');
    const stored = readFileSync(recordFile, 'utf8');
    expect(JSON.parse(stored)).toMatchObject({
      scenario: 'T3',
      version: '1.0',
      scenario_hash: first.value.scenarios[0]?.hash,
    });

    // When the maintainer changes a step prompt of S1
    const version = join(root, 'scenarios', 'T3', '1.0');
    writeFileSync(join(version, 'prompts', '02.md'), 'Refuse to cancel a shipped order.\n');

    // Then S1 must be registered as a new version before it can run
    const refused = checkCampaign(campaign);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.issues).toEqual([
        {
          path: 'scenarios[0]',
          message: `T3@1.0 has changed since ${relative(root, recordFile)} ran it: register the change as a new version`,
        },
      ]);
    }
    expect((await validate(root)).stderr).toBe(
      `scenario: T3@1.0 has changed since ${relative(root, recordFile)} ran it: register the change as a new version\n`,
    );
    cpSync(version, join(root, 'scenarios', 'T3', '1.1'), { recursive: true });
    writeFileSync(
      join(root, 'scenarios', 'T3', '1.1', 'scenario.yaml'),
      readFileSync(join(version, 'scenario.yaml'), 'utf8').replace("version: '1.0'", "version: '1.1'"),
    );
    writeFileSync(campaign, yaml('1.1'));
    expect(checkCampaign(campaign).ok).toBe(true);

    // And the stored results keep pointing to version 1.0
    expect(readFileSync(recordFile, 'utf8')).toBe(stored);
  });
});
