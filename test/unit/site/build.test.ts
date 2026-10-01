import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { escapeHtml } from '../../../src/site/render.js';
import { EXECUTION } from '../../support/score-fixture.js';
import { benchSite, siteExecution } from '../../support/site-fixture.js';

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
  it('writes the landing, a page per category A–G, the method page, the root page and the stylesheet', async () => {
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
      'abcdef012345/1/index.html',
      'abcdef012345/1/method.html',
      'index.html',
      'style.css',
    ]);
    // It prints what it wrote and the headline
    expect(built.stdout).toContain('site: site/abcdef012345/1/ (9 pages)\n');
    expect(built.stdout).toContain('Against the baseline, wingfoil is better in 1, worse in 1');

    // Static: no script anywhere, every page linked to the one stylesheet
    for (const [path, text] of Object.entries(files)) {
      expect(text, path).not.toMatch(/<script/i);
      if (path.endsWith('.html'))
        expect(text, path).toMatch(/<link rel="stylesheet" href="(\.\.\/\.\.\/)?style\.css">/);
    }
    // The root page leads to the execution built last, without a script
    expect(files['index.html']).toContain('<meta http-equiv="refresh" content="0; url=abcdef012345/1/">');
    expect(files['index.html']).toContain('<a href="abcdef012345/1/">');

    // The landing links every category page and the method page
    const landing = files['abcdef012345/1/index.html'] ?? '';
    for (const category of 'abcdefg') expect(landing).toContain(`href="category-${category}.html"`);
    expect(landing).toContain('href="method.html"');
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
    expect(method).toContain('M-D1 and M-D2 are not reported apart in v0.1');
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
  }, 120_000);

  it('refuses what it cannot build from, naming it', async () => {
    const { root, executionDir } = await siteExecution();
    const usage = await benchSite(root, 'site', 'build');
    expect(usage.code).toBe(2);
    expect((await benchSite(root, 'site', 'build', 'not-an-execution')).code).toBe(2);
    expect((await benchSite(root, 'site', 'publish')).code).toBe(2);

    const dry = await benchSite(root, 'site', 'build', 'dry-runs/1');
    expect(dry.code).toBe(1);
    expect(dry.stderr).toContain('a dry run is never aggregated (REQ-RES-01)');

    const unknown = await benchSite(root, 'site', 'build', 'abcdef012345/9');
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain('results/abcdef012345/9');

    // A scenario changed since its runs: its hash no longer the one they recorded
    const yaml = join(root, 'scenarios', 'TD', '1.0', 'scenario.yaml');
    const original = readFileSync(yaml, 'utf8');
    writeFileSync(yaml, `${original}# changed\n`);
    const changed = await benchSite(root, 'site', 'build', EXECUTION);
    expect(changed.code).toBe(1);
    expect(changed.stderr).toContain('TD@1.0');
    expect(changed.stderr).toContain('differs from the hash its runs recorded');

    // A scenario missing from scenarios/
    rmSync(join(root, 'scenarios', 'TD'), { recursive: true });
    const missing = await benchSite(root, 'site', 'build', EXECUTION);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain('TD@1.0');

    // A run whose record cannot be read
    const record = join(executionDir, 'runs', 'TC@1.0', 'wingfoil', 'fake-model', 'r1', 'run.json');
    const kept = readFileSync(record, 'utf8');
    writeFileSync(record, '{');
    const unreadable = await benchSite(root, 'site', 'build', EXECUTION);
    expect(unreadable.code).toBe(1);
    expect(unreadable.stderr).toContain(
      'abcdef012345/1/runs/TC@1.0/wingfoil/fake-model/r1/run.json: cannot be read',
    );
    writeFileSync(record, '{}');
    expect((await benchSite(root, 'site', 'build', EXECUTION)).stderr).toContain('records no scenario_hash');
    writeFileSync(record, kept);

    // An aggregate that cannot be read
    const aggregate = join(executionDir, 'aggregate.json');
    writeFileSync(aggregate, 'not json');
    expect((await benchSite(root, 'site', 'build', EXECUTION)).stderr).toContain(
      'results/abcdef012345/1/aggregate.json: cannot be read',
    );

    // An aggregate of another shape, or of another version
    writeFileSync(aggregate, '{"aggregate_version":1}');
    const shapeless = await benchSite(root, 'site', 'build', EXECUTION);
    expect(shapeless.code).toBe(1);
    expect(shapeless.stderr).toContain(
      'results/abcdef012345/1/aggregate.json: is not an aggregate this site reads',
    );
    writeFileSync(
      aggregate,
      JSON.stringify({
        aggregate_version: 2,
        campaign: 'x',
        execution: 1,
        model: 'm',
        groups: [],
        slices: [],
      }),
    );
    expect((await benchSite(root, 'site', 'build', EXECUTION)).stderr).toContain(
      'has aggregate_version 2; this site reads version 1',
    );

    // An execution not aggregated
    rmSync(join(executionDir, 'aggregate.json'));
    const unscored = await benchSite(root, 'site', 'build', EXECUTION);
    expect(unscored.code).toBe(1);
    expect(unscored.stderr).toContain('has no aggregate.json: score it first (bench score)');
    // Nothing is written when it refuses
    expect(existsSync(join(root, 'site'))).toBe(false);
  }, 120_000);
});

describe('escaping', () => {
  it('escapes every character HTML gives a meaning to', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
