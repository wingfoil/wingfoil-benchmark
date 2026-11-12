import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { armDigest } from '../../../src/arms/index.js';
import { CANCEL, EXECUTION, storedRun } from '../../support/score-fixture.js';
import {
  benchSite,
  completeExecution,
  sha256Of,
  STAND_INS,
  standInHoldout,
} from '../../support/site-fixture.js';

const PAGE = join('site', 'abcdef012345', '1');

describe('the site of an execution that ran a configured arm (REQ-FMT-05 as amended in 1.50, task-142)', () => {
  it("builds the configured arm's manual and setup pages from its base arm's files", async () => {
    const standIn = STAND_INS[0] as (typeof STAND_INS)[number];
    const first = await storedRun({ variant: standIn, steps: [{}, CANCEL] });
    const { root, executionDir } = first;
    await storedRun({ variant: standIn, steps: [{}, CANCEL], into: { root, arm: 'wingfoil-configured' } });
    completeExecution(root, executionDir, [standIn.id]);
    const campaign = join(executionDir, 'campaign.yaml');
    writeFileSync(
      campaign,
      readFileSync(campaign, 'utf8').replace(
        'arms: [baseline, wingfoil]',
        'arms: [baseline, wingfoil-configured]',
      ),
    );
    // The run records what the runner records of a configured arm: its digest, its base arm's manual and harness
    const file = join(
      executionDir,
      'runs',
      `${standIn.id}@1.0`,
      'wingfoil-configured',
      'fake-model',
      'r1',
      'run.json',
    );
    const run = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(
      file,
      JSON.stringify({
        ...run,
        arm_digest: armDigest(root, 'wingfoil-configured'),
        manual: { ...(run.manual as object), sha256: sha256Of(join(root, 'arms', 'wingfoil', 'manual.md')) },
        harness: { tool: 'wingfoil', commit: 'a'.repeat(40), version: '3df305e' },
        configured: { of: 'wingfoil', records: 1, cost_eur: 0.4 },
      }),
    );
    const scored = await benchSite(root, 'score', EXECUTION, '--holdout', standInHoldout());
    expect(scored.code, scored.stdout + scored.stderr).toBe(0);

    const built = await benchSite(root, 'site', 'build', EXECUTION);
    expect(built.code, built.stdout + built.stderr).toBe(0);
    const manual = readFileSync(join(root, PAGE, 'material', 'manual-wingfoil-configured.html'), 'utf8');
    const heading = readFileSync(join(root, 'arms', 'wingfoil', 'manual.md'), 'utf8').split('\n')[0] ?? '';
    expect(manual).toContain(heading.replace(/^#+\s*/, ''));
    const setup = readFileSync(join(root, PAGE, 'material', 'setup-wingfoil-configured.html'), 'utf8');
    expect(setup).toContain("from the repository's <code>arms/wingfoil/</code>, with the scenario version");
    expect(setup).toContain('href="manual-wingfoil-configured.html"');
    // And the method page's harness line counts the configured arm's runs under the entry it shares
    const method = readFileSync(join(root, PAGE, 'method.html'), 'utf8');
    expect(method).toContain(`wingfoil 3df305e; commits recorded by its runs: ${'a'.repeat(40)}`);
    // And its configured variants section reaches the run's version (task-146): a 1.0 stand-in holds no configuration,
    // which the page says rather than hide the run
    const variants = method.slice(
      method.indexOf('id="configured-variants"'),
      method.indexOf('id="how-a-run-goes"'),
    );
    expect(variants).toContain(`${standIn.id}@1.0 holds no configuration of wingfoil-configured.`);
    expect(variants).not.toContain('No configured arm ran in this execution.');
  });
});
