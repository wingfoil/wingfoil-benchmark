import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { escapeHtml } from '../../../src/site/render.js';
import { CANCEL, EXECUTION, storedRun } from '../../support/score-fixture.js';
import { benchSite, completeExecution, siteExecution } from '../../support/site-fixture.js';

/** Every file under `dir`, relative, with its text. */
function tree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    for (const name of readdirSync(at).sort()) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else out[relative(dir, path)] = readFileSync(path, 'utf8');
    }
  };
  walk(dir);
  return out;
}

describe('bench site build (REQ-CLI-09 as amended in 1.20, task-045)', () => {
  it('writes the landing, a page per category A–G, the method and eligibility pages, the root page and the stylesheet', async () => {
    const { root } = await siteExecution();
    const built = await benchSite(root, 'site', 'build', EXECUTION);
    expect(built.code, built.stderr).toBe(0);

    const files = tree(join(root, 'site'));
    expect(Object.keys(files)).toEqual([
      'abcdef012345/1/category-a.html',
      'abcdef012345/1/category-b.html',
      'abcdef012345/1/category-c.html',
      'abcdef012345/1/category-d.html',
      'abcdef012345/1/category-e.html',
      'abcdef012345/1/category-f.html',
      'abcdef012345/1/category-g.html',
      'abcdef012345/1/eligibility.html',
      'abcdef012345/1/index.html',
      'abcdef012345/1/material/manual-baseline.html',
      'abcdef012345/1/material/manual-wingfoil.html',
      'abcdef012345/1/method.html',
      'index.html',
      'style.css',
    ]);
    // It prints what it wrote and the headline
    expect(built.stdout).toContain('site: site/abcdef012345/1/ (12 pages)\n');
    expect(built.stdout).toContain('Against the baseline, wingfoil is better in 1, worse in 1');

    // Static: no script anywhere, every page linked to the one stylesheet
    for (const [path, text] of Object.entries(files)) {
      expect(text, path).not.toMatch(/<script/i);
      if (path.endsWith('.html'))
        expect(text, path).toMatch(/<link rel="stylesheet" href="(\.\.\/)*style\.css">/);
    }
    // The root page leads to the execution built last, without a script
    expect(files['index.html']).toContain('<meta http-equiv="refresh" content="0; url=abcdef012345/1/">');
    expect(files['index.html']).toContain('<a href="abcdef012345/1/">');

    // The landing links every category page, the method page and the eligibility page
    const landing = files['abcdef012345/1/index.html'] ?? '';
    for (const category of 'abcdefg') expect(landing).toContain(`href="category-${category}.html"`);
    expect(landing).toContain('href="method.html"');
    expect(landing).toContain('href="eligibility.html"');
    expect(landing).toContain('A, B, E and G are not covered in this campaign.');
  }, 120_000);

  it('gives each category page its scenarios, their values per arm and the runs behind them', async () => {
    const { root } = await siteExecution();
    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const d = readFileSync(join(root, 'site', 'abcdef012345', '1', 'category-d.html'), 'utf8');
    expect(d).toContain('TD@1.0');
    // Each suite's tally on the final snapshot, M-D1's defect tests among them in S2 (the approver's choice 1)
    expect(d).toContain('orders');
    expect(d).toContain('abcdef012345/1/runs/TD@1.0/wingfoil/fake-model/r1');
    expect(d).toContain('bench run show abcdef012345/1/runs/TD@1.0/wingfoil/fake-model/r1');
    const a = readFileSync(join(root, 'site', 'abcdef012345', '1', 'category-a.html'), 'utf8');
    expect(a).toContain('not covered in this campaign');
    // A scenario's secondary categories are listed on those pages, without covering them: TC, TD and TF
    // have none, so E's page lists no scenario
    const e = readFileSync(join(root, 'site', 'abcdef012345', '1', 'category-e.html'), 'utf8');
    expect(e).not.toContain('@1.0');
  }, 120_000);

  it('states the rules it applied on the method page', async () => {
    const { root } = await siteExecution();
    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const method = readFileSync(join(root, 'site', 'abcdef012345', '1', 'method.html'), 'utf8');
    for (const text of [
      'M-Q1',
      'M-K1',
      'M-D3',
      'M-E1',
      'M-F1',
      'beyond variance',
      'preliminary',
      'hold-out',
    ]) {
      expect(method).toContain(text);
    }
    expect(method).toContain('are not reported on their own in v0.1');
  }, 120_000);

  it('counts the campaign model runs on the landing page, and the slices apart', async () => {
    const { root, executionDir } = await siteExecution();
    const file = join(executionDir, 'aggregate.json');
    const aggregate = JSON.parse(readFileSync(file, 'utf8')) as {
      groups: { model: string }[];
      slices: unknown[];
    };
    aggregate.slices = [{ ...aggregate.groups[0], model: 'other-model' }];
    writeFileSync(file, JSON.stringify(aggregate));
    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const landing = readFileSync(join(root, 'site', 'abcdef012345', '1', 'index.html'), 'utf8');
    expect(landing).toContain(
      'Campaign abcdef012345, execution 1: 6 runs of fake-model; 1 run of other models, reported apart.',
    );
  }, 120_000);

  it('makes M-E1 not comparable end to end when a run stopped before a directive check step', async () => {
    // TE stands in for S8 (E): a dependencies check at steps 1 and 2; wingfoil's run stops after step 1
    const checks = { 'oracle/checks/deps.yaml': 'kind: dependencies\nsteps: [1, 2]\n' };
    const base = await storedRun({ variant: { id: 'TE', primary: 'E' }, checks, steps: [{}, CANCEL] });
    await storedRun({
      variant: { id: 'TE', primary: 'E' },
      steps: [{}],
      into: { root: base.root, arm: 'wingfoil' },
    });
    completeExecution(base.root, base.executionDir, ['TE']);
    expect((await benchSite(base.root, 'score', EXECUTION)).code).toBe(0);
    const built = await benchSite(base.root, 'site', 'build', EXECUTION);
    expect(built.code, built.stderr).toBe(0);
    const landing = readFileSync(join(base.root, 'site', 'abcdef012345', '1', 'index.html'), 'utf8');
    const row = landing.slice(
      landing.indexOf('<tr id="category-E"'),
      landing.indexOf('</tr>', landing.indexOf('<tr id="category-E"')),
    );
    expect(row).toContain('<span class="note">not comparable: r1 did not reach step 2</span>');
    expect(row).not.toContain('data-outcome');
    // No comparison, so no count in the headline
    expect(built.stdout).toContain('Against the baseline, wingfoil has no comparison');
  }, 120_000);

  it('still builds an aggregate written before checks existed (task-035): M-E1 reads not measured', async () => {
    const { root, executionDir } = await siteExecution();
    const file = join(executionDir, 'aggregate.json');
    const old = JSON.parse(readFileSync(file, 'utf8')) as { groups: { metrics: Record<string, unknown> }[] };
    for (const group of old.groups) delete group.metrics.checks;
    writeFileSync(file, JSON.stringify(old));
    const built = await benchSite(root, 'site', 'build', EXECUTION);
    expect(built.code, built.stderr).toBe(0);
  }, 120_000);

  it('gives the same bytes from the same aggregate, and leaves another execution pages as they are', async () => {
    const { root } = await siteExecution();
    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const first = tree(join(root, 'site'));
    const other = join(root, 'site', '0123456789ab', '2');
    mkdirSync(other, { recursive: true });
    writeFileSync(join(other, 'index.html'), 'an older execution\n');
    writeFileSync(join(root, 'site', 'abcdef012345', '1', 'stale.html'), 'left by an older build\n');

    expect((await benchSite(root, 'site', 'build', EXECUTION)).code).toBe(0);
    const second = tree(join(root, 'site'));
    // The execution's directory is replaced whole; another execution's is left
    expect(second['abcdef012345/1/stale.html']).toBeUndefined();
    expect(second['0123456789ab/2/index.html']).toBe('an older execution\n');
    delete second['0123456789ab/2/index.html'];
    expect(second).toEqual(first);
    // No date anywhere
    for (const text of Object.values(first)) expect(text).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
  });
});
