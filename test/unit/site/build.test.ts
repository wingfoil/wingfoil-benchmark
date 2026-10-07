import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { aggregateExecution, writeAggregate } from '../../../src/results/index.js';
import { escapeHtml } from '../../../src/site/render.js';
import { CANCEL, EXECUTION, storedRun } from '../../support/score-fixture.js';
import { benchSite, completeExecution, sha256Of, siteExecution } from '../../support/site-fixture.js';

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
      'abcdef012345/1/material/setup-wingfoil.html',
      'abcdef012345/1/method.html',
      'index.html',
      'style.css',
    ]);
    // It prints what it wrote and the headline
    expect(built.stdout).toContain('site: site/abcdef012345/1/ (13 pages)\n');
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
  }, 120_000);

  it('refuses what it cannot build from, naming it', async () => {
    const { root, executionDir } = await siteExecution();
    const usage = await benchSite(root, 'site', 'build');
    expect(usage.code).toBe(2);
    expect((await benchSite(root, 'site', 'build', 'not-an-execution')).code).toBe(2);

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
    const keptAggregate = readFileSync(aggregate, 'utf8');
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

    // A group without the metrics the site reads (task-045's second review)
    writeFileSync(aggregate, keptAggregate.replace('"metrics":', '"not_metrics":'));
    expect((await benchSite(root, 'site', 'build', EXECUTION)).stderr).toContain(
      'results/abcdef012345/1/aggregate.json: is not an aggregate this site reads: groups.0.metrics',
    );

    // A value of the wrong kind where the site reads a tally (task-045's third review)
    const tally = JSON.parse(keptAggregate) as {
      groups: { metrics: { m_q1: { final: { m_q1: { values: unknown[] } } } } }[];
    };
    (tally.groups[0] as (typeof tally.groups)[0]).metrics.m_q1.final.m_q1.values = [null];
    writeFileSync(aggregate, JSON.stringify(tally));
    expect((await benchSite(root, 'site', 'build', EXECUTION)).stderr).toContain(
      'is not an aggregate this site reads: groups.0.metrics.m_q1.final.m_q1.values.0',
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

/** The wingfoil runs recording their harness, as every real one does (REQ-RUN-14): the site's harness arms. */
function recordHarness(executionDir: string): void {
  for (const scenario of readdirSync(join(executionDir, 'runs'))) {
    const dir = join(executionDir, 'runs', scenario, 'wingfoil', 'fake-model');
    for (const r of readdirSync(dir)) {
      const file = join(dir, r, 'run.json');
      const run = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      run.harness = { tool: 'wingfoil', version: 'v0.2.2', commit: '12537b62' };
      writeFileSync(file, `${JSON.stringify(run, undefined, 2)}\n`);
    }
  }
}

describe('each harness against its own docs control (REQ-SCO-14, REQ-RES-03 as amended in 1.26, task-068)', () => {
  it('shows the comparison in the aggregate and on the category pages', async () => {
    const { root, executionDir } = await siteExecution();
    recordHarness(executionDir);
    // The wingfoil runs stored again as baseline-docs runs that record their docs_of: the same results.
    for (const scenario of readdirSync(join(executionDir, 'runs'))) {
      const from = join(executionDir, 'runs', scenario, 'wingfoil');
      const to = join(executionDir, 'runs', scenario, 'baseline-docs');
      cpSync(from, to, { recursive: true });
      for (const r of readdirSync(join(to, 'fake-model'))) {
        const file = join(to, 'fake-model', r, 'run.json');
        const run = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
        run.arm = 'baseline-docs';
        run.docs_of = 'wingfoil';
        delete run.harness;
        delete run.arm_digest;
        run.manual = {
          ...(run.manual as object),
          sha256: sha256Of(join(root, 'arms', 'baseline-docs', 'manual.md')),
        };
        writeFileSync(file, `${JSON.stringify(run, undefined, 2)}\n`);
      }
    }
    const aggregated = aggregateExecution(executionDir);
    if (!aggregated.ok) throw new Error(JSON.stringify(aggregated.issues));
    writeAggregate(executionDir, aggregated.value);
    expect(
      aggregated.value.controls?.map((entry) => `${entry.scenario} ${entry.harness} ${entry.control}`),
    ).toEqual(['TC wingfoil baseline-docs', 'TD wingfoil baseline-docs', 'TF wingfoil baseline-docs']);
    expect(aggregated.value.controls?.[0]?.metrics[0]).toMatchObject({
      metric: 'M-Q1',
      outcome: 'same',
      delta: 0,
    });

    const built = await benchSite(root, 'site', 'build', EXECUTION);
    expect(built.code, built.stderr).toBe(0);
    const page = readFileSync(join(root, 'site', 'abcdef012345', '1', 'category-c.html'), 'utf8');
    expect(page).toContain('against baseline-docs');
    expect(page).toMatch(
      /against baseline-docs[^<]*<\/span> <span class="delta">[^<]*<\/span> <span class="outcome" data-outcome="same">/,
    );
    // The headline counts the comparisons with the baseline only: the same sentence as before the controls were
    // paired, and no comparison with a control on the landing page.
    const landing = readFileSync(join(root, 'site', 'abcdef012345', '1', 'index.html'), 'utf8');
    expect(landing).not.toContain('against baseline-docs');
    expect(built.stdout).toContain(
      'Against the baseline, wingfoil is better in 1, worse in 1 and the same in 3 of 5',
    );
  }, 240_000);

  it('still builds an aggregate written before it: the comparison reads not measured', async () => {
    const { root, executionDir } = await siteExecution();
    recordHarness(executionDir);
    const file = join(executionDir, 'aggregate.json');
    const aggregate = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    delete aggregate.controls;
    writeFileSync(file, `${JSON.stringify(aggregate, undefined, 2)}\n`);
    const built = await benchSite(root, 'site', 'build', EXECUTION);
    expect(built.code, built.stderr).toBe(0);
    const page = readFileSync(join(root, 'site', 'abcdef012345', '1', 'category-c.html'), 'utf8');
    expect(page).toContain('against its docs control: not measured');
    // Only a harness arm has a docs control: one line per metric of C's map (M-Q1, M-K1), wingfoil's, none for the
    // baseline.
    expect(page.match(/against its docs control/g)?.length).toBe(2);
  }, 240_000);
});

describe('an aggregate whose controls are not what the site reads (task-068’s review)', () => {
  it('is refused, naming the field, before a page is written', async () => {
    const { root, executionDir } = await siteExecution();
    const file = join(executionDir, 'aggregate.json');
    const aggregate = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    aggregate.controls = [
      {
        scenario: 'TC',
        version: '1.0',
        harness: 'wingfoil',
        control: 'baseline-docs',
        metrics: [{ metric: 'M-Q1', certainty: '<b>x' }],
      },
    ];
    writeFileSync(file, `${JSON.stringify(aggregate, undefined, 2)}\n`);
    const built = await benchSite(root, 'site', 'build', EXECUTION);
    expect(built.code).toBe(1);
    expect(built.stderr).toContain('is not an aggregate this site reads: controls.0.metrics.0');
  }, 240_000);
});
