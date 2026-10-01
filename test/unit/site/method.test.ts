import { appendFileSync, cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { publishedMaterial } from '../../../src/site/method.js';
import { repoPath } from '../../support/paths.js';
import { EXECUTION } from '../../support/score-fixture.js';
import { tempDir } from '../../support/scenario-fixture.js';
import { benchSite, sha256Of, siteCampaign, siteExecution } from '../../support/site-fixture.js';

const PAGE = join('site', 'abcdef012345', '1');

describe('the method page (F5.8, task-046)', () => {
  it('generates the execution pins, budget and spending from its files', async () => {
    const { root } = await siteExecution();
    const built = await benchSite(root, 'site', 'build', EXECUTION);
    expect(built.code, built.stderr).toBe(0);
    const method = readFileSync(join(root, PAGE, 'method.html'), 'utf8');
    const section = method.slice(
      method.indexOf('id="this-execution"'),
      method.indexOf('id="published-material"'),
    );
    expect(section).toContain('<th scope="row">Agent</th><td>fake 1.0.0</td>');
    expect(section).toContain('<th scope="row">Model</th><td>fake-model</td>');
    expect(section).toContain('<th scope="row">Other models (slices)</th><td>none</td>');
    expect(section).toContain(
      '<th scope="row">Harnesses</th><td>wingfoil 3df305e; no run recorded a commit</td>',
    );
    expect(section).toContain('<th scope="row">Approver policy</th><td>v1</td>');
    expect(section).toMatch(/<th scope="row">Scenarios<\/th><td>TC@1\.0 sha256:[0-9a-f]{64}<br>TD@1\.0 /);
    expect(section).toContain(
      `<th scope="row">Manuals</th><td>baseline: sha256:${sha256Of(join(root, 'arms', 'baseline', 'manual.md'))}, 3 tokens<br>`,
    );
    expect(section).toContain('<th scope="row">Scoring image</th>');
    // What each arm's runs declared of their harness (REQ-FMT-10): nothing, in the fixture
    expect(section).toContain('<th scope="row">Harness capabilities</th><td>none declared by the runs</td>');
    expect(section).toContain('<th scope="row">Step time cap</th><td>600 s</td>');
    expect(section).toContain('<th scope="row">Step token cap</th><td>1000000 tokens</td>');
    expect(section).toContain('<th scope="row">Run cost cap</th><td>5 EUR</td>');
    expect(section).toContain('<th scope="row">Budget warning</th><td>10 EUR</td>');
    expect(section).toContain('<th scope="row">Budget ceiling</th><td>20 EUR</td>');
    expect(section).toContain('<th scope="row">Rate</th><td>0.5 EUR per USD</td>');
    // Six runs at the fixture's 0.05 + 0.10 EUR each
    expect(section).toContain(
      '<p id="spending">6 aggregated runs of fake-model cost 0.9000 EUR in all. Setup costs (M-K3) are not included.</p>',
    );
    expect(section).not.toMatch(/<th scope="row">Scoring image<\/th><td>not recorded/);
  }, 120_000);

  it('publishes each arm manual, rendered, and refuses one that differs from what its runs recorded', async () => {
    const { root } = await siteExecution();
    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const manual = readFileSync(join(root, PAGE, 'material', 'manual-wingfoil.html'), 'utf8');
    expect(manual).toContain('<h1>Operating manual</h1>');
    expect(manual).toContain('<link rel="stylesheet" href="../../../style.css">');
    expect(existsSync(join(root, PAGE, 'material', 'manual-baseline.html'))).toBe(true);
    // baseline-docs ran no run here, so it has no page
    expect(existsSync(join(root, PAGE, 'material', 'manual-baseline-docs.html'))).toBe(false);
    const method = readFileSync(join(root, PAGE, 'method.html'), 'utf8');
    expect(method).toContain('<a href="material/manual-wingfoil.html">');

    appendFileSync(join(root, 'arms', 'wingfoil', 'manual.md'), '\nA line added later.\n');
    const changed = await benchSite(root, 'site', 'build', EXECUTION);
    expect(changed.code).toBe(1);
    expect(changed.stderr).toContain('arms/wingfoil/manual.md');
    expect(changed.stderr).toContain('differs from the manual its runs recorded');
  }, 120_000);

  it("lists each arm's declared harness capabilities, as its runs recorded them", async () => {
    const { root, executionDir } = await siteExecution();
    for (const id of ['TC', 'TD', 'TF']) {
      const file = join(executionDir, 'runs', `${id}@1.0`, 'wingfoil', 'fake-model', 'r1', 'run.json');
      const run = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      run.provides = { 'workflow-engine': false, 'directive-delivery': true };
      writeFileSync(file, JSON.stringify(run));
    }
    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const method = readFileSync(join(root, PAGE, 'method.html'), 'utf8');
    expect(method).toContain(
      '<th scope="row">Harness capabilities</th><td>wingfoil: directive-delivery offered; workflow-engine not offered</td>',
    );
  }, 120_000);

  it('links only to material pages the build wrote', async () => {
    const { root } = await siteExecution();
    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const method = readFileSync(join(root, PAGE, 'method.html'), 'utf8');
    const targets = [...method.matchAll(/href="(material\/[^"]+)"/g)].map((match) => match[1] as string);
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) expect(existsSync(join(root, PAGE, target)), target).toBe(true);
    // baseline-docs ran no run, S1 and S8 are not in the execution: named, not linked
    expect(method).not.toContain('material/manual-baseline-docs.html');
    expect(method).not.toContain('material/directives-s8.html');
  }, 120_000);

  it('states the harness commits, the slices and the runs whose cost is a bound, the slices apart', async () => {
    const { root, executionDir } = await siteExecution();
    writeFileSync(
      join(executionDir, 'campaign.yaml'),
      siteCampaign(['TC', 'TD', 'TF']).replace(
        'models:\n  default: fake-model\n',
        'models:\n  default: fake-model\n  slices:\n    - { model: other-model, scenarios: [TC] }\n',
      ),
    );
    for (const id of ['TC', 'TD', 'TF']) {
      const file = join(executionDir, 'runs', `${id}@1.0`, 'wingfoil', 'fake-model', 'r1', 'run.json');
      const run = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      run.harness = { tool: 'wingfoil', commit: 'c0ffee' };
      writeFileSync(file, JSON.stringify(run));
    }
    const file = join(executionDir, 'aggregate.json');
    const aggregate = JSON.parse(readFileSync(file, 'utf8')) as {
      groups: { metrics: { cost: { bound: string[] } }; runs: string[] }[];
      slices: unknown[];
    };
    const first = aggregate.groups[0] as (typeof aggregate.groups)[0];
    aggregate.slices = [{ ...first, model: 'other-model' }];
    first.metrics.cost.bound = [first.runs[0] as string];
    writeFileSync(file, JSON.stringify(aggregate));
    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const method = readFileSync(join(root, PAGE, 'method.html'), 'utf8');
    expect(method).toContain(
      '<th scope="row">Harnesses</th><td>wingfoil 3df305e; commits recorded by its runs: c0ffee</td>',
    );
    expect(method).toContain('<th scope="row">Other models (slices)</th><td>other-model on TC</td>');
    expect(method).toContain(
      '<p id="spending">6 aggregated runs of fake-model cost 0.9000 EUR in all. 1 aggregated run of other ' +
        'models, reported apart, cost 0.1500 EUR. Setup costs (M-K3) are not included. For 1 run the cost is ' +
        'a bound, not a report: abcdef012345/1/runs/TC@1.0/baseline/fake-model/r1.</p>',
    );
  }, 120_000);

  it('refuses a repository without the method text', async () => {
    const { root } = await siteExecution();
    rmSync(join(root, 'site-content'), { recursive: true });
    const refused = await benchSite(root, 'site', 'build', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('site-content/method.md: not found');
  }, 120_000);

  it('says when the runs recorded no manual, and still publishes it', async () => {
    const { root, executionDir } = await siteExecution();
    const file = join(executionDir, 'runs', 'TC@1.0', 'baseline', 'fake-model', 'r1', 'run.json');
    const run = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    delete run.manual;
    writeFileSync(file, JSON.stringify(run));
    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const method = readFileSync(join(root, PAGE, 'method.html'), 'utf8');
    expect(method).toContain('baseline: sha256:');
    expect(method).toContain('(1 run recorded none)');
  }, 120_000);

  it('refuses an execution whose campaign file is not one', async () => {
    const { root, executionDir } = await siteExecution();
    writeFileSync(join(executionDir, 'campaign.yaml'), 'models:\n  default: fake-model\n');
    const refused = await benchSite(root, 'site', 'build', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('results/abcdef012345/1/campaign.yaml');
  }, 120_000);
});

describe('the published material of S1 and S8', () => {
  const pages = publishedMaterial(repoPath('.'), [
    { id: 'S1', version: '1.0' },
    { id: 'S2', version: '1.0' },
    { id: 'S8', version: '1.0' },
  ]);

  it("publishes S8's four directives, without their front matter", () => {
    const directives = pages.get('directives-s8.html') ?? '';
    for (const title of [
      'No new runtime dependency',
      'TSDoc on every exported function',
      'No wall clock or randomness in the domain',
      'Errors are returned as a Result in the domain',
    ]) {
      expect(directives).toContain(title);
    }
    expect(directives).not.toContain('kind: custom');
  });

  it("publishes S1's NOTICE and its two licence texts, the licences as they are", () => {
    const notice = pages.get('notice-s1.html') ?? '';
    expect(notice).toContain('<h1>Third-party material in S1@1.0&#39;s oracle</h1>');
    // Its links to the licence files lead to their pages
    expect(notice).toContain('<a href="licence-apache-2.0.html">Apache-2.0.txt</a>');
    expect(notice).toContain('<a href="licence-bsd-3-clause-ietf.html">BSD-3-Clause-IETF.txt</a>');
    const apache = pages.get('licence-apache-2.0.html') ?? '';
    expect(apache).toContain('<pre>');
    expect(apache).toContain('Apache License');
    expect(pages.get('licence-bsd-3-clause-ietf.html')).toContain('<pre>');
  });

  it('reads only directories under a scenario arms/, a file there left alone', () => {
    const root = tempDir('bench-material-');
    cpSync(repoPath('scenarios/S8'), join(root, 'scenarios', 'S8'), { recursive: true });
    writeFileSync(join(root, 'scenarios', 'S8', '1.0', 'arms', 'README.md'), 'notes\n');
    expect(() => publishedMaterial(root, [{ id: 'S8', version: '1.0' }])).not.toThrow();
  });

  it('publishes nothing of S2, whose answer key is hold-out content', () => {
    expect([...pages.keys()].sort()).toEqual([
      'directives-s8.html',
      'licence-apache-2.0.html',
      'licence-bsd-3-clause-ietf.html',
      'notice-s1.html',
    ]);
  });
});
