import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import {
  benchPublish,
  benchSite,
  catalogueEntry,
  completeExecution,
  gitIn,
  probeSaying,
  publishableSite,
  siteCampaign,
  siteExecution,
  STAND_INS,
} from '../support/site-fixture.js';
import { CANCEL, storedRun } from '../support/score-fixture.js';
import { tempDir } from '../support/scenario-fixture.js';
import { repoPath } from '../support/paths.js';

const EARLIER = '0123456789ab/1';
const NEWER = 'abcdef012345/1';

/** A campaign file's pins for one side: the agent's version, the default model and the wingfoil harness. */
function pins(agentVersion: string, model: string, wingfoil: string): string {
  return stringify({
    harnesses: { wingfoil: { tool: 'wingfoil', version: wingfoil } },
    scenarios: [{ id: 'TC', version: '1.0' }],
    arms: ['baseline', 'wingfoil'],
    agent: { name: 'claude-code', version: agentVersion },
    models: { default: model },
    repetitions: { TC: 1 },
    currency: { usd_to_eur: 0.5 },
  });
}

/**
 * Two scored executions of TC — standing in for S1, category C — in the baseline and wingfoil arms: the earlier with
 * one run a side, the baseline failing the hidden test and wingfoil passing it; the newer with three runs a side, all
 * passing. `newer` overrides the newer side's model and pins.
 */
async function twoExecutions(newer: { model?: string; agent?: string; wingfoil?: string } = {}) {
  const variant = STAND_INS[0];
  // The earlier execution: baseline r1 fails, wingfoil r1 passes.
  const { root } = await storedRun({
    variant,
    steps: [{}, {}],
    into: { root: tempDir('bench-compare-'), execution: EARLIER },
  });
  await storedRun({ variant, steps: [{}, CANCEL], into: { root, execution: EARLIER, arm: 'wingfoil' } });
  // The newer execution: three passing runs a side.
  const model = newer.model ?? 'fake-model';
  for (const arm of ['baseline', 'wingfoil']) {
    for (const repetition of [1, 2, 3]) {
      await storedRun({
        variant,
        steps: [{}, CANCEL],
        into: { root, execution: NEWER, arm, model, repetition },
      });
    }
  }
  writeFileSync(join(root, 'results', EARLIER, 'campaign.yaml'), pins('2.1.221', 'fake-model', 'v0.2.2'));
  writeFileSync(
    join(root, 'results', NEWER, 'campaign.yaml'),
    pins(newer.agent ?? '2.1.291', model, newer.wingfoil ?? 'v0.2.3'),
  );
  for (const target of [EARLIER, NEWER]) {
    const scored = await benchSite(root, 'score', target);
    if (scored.code !== 0) throw new Error(scored.stdout + scored.stderr);
  }
  return root;
}

function comparisonOf(root: string): Record<string, unknown> {
  const file = join(root, 'results', 'comparisons', 'abcdef012345-1', '0123456789ab-1.json');
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

describe('comparison.feature', () => {
  it("@F5.2 Two campaigns are compared through each arm's delta against its own baseline", async () => {
    // Given two aggregated executions that share scenario versions and arms
    const root = await twoExecutions();

    // When the maintainer compares them, naming the earlier one first
    const compared = await benchSite(root, 'campaign', 'compare', EARLIER, NEWER);
    expect(compared.code, compared.stderr).toBe(0);
    expect(compared.stdout).toContain('results/comparisons/abcdef012345-1/0123456789ab-1.json');

    // Then for each category and arm, the comparison shows each execution's delta against its own baseline, and the
    // change of that delta
    const comparison = comparisonOf(root);
    expect(comparison).toMatchObject({
      earlier: { campaign: '0123456789ab', execution: 1, model: 'fake-model' },
      newer: { campaign: 'abcdef012345', execution: 1, model: 'fake-model' },
      order: 'maintainer',
    });
    const rows = comparison.rows as Record<string, unknown>[];
    const q1 = rows.find((row) => row.arm === 'wingfoil' && row.metric === 'M-Q1');
    expect(q1).toMatchObject({
      scenario: 'TC',
      version: '1.0',
      category: 'C',
      arm: 'wingfoil',
      earlier: { delta: 1 },
      newer: { delta: 0 },
      change: -1,
    });
    // And it shows n, and the range from three runs
    expect(q1).toMatchObject({
      earlier: { arm: { n: 1 }, baseline: { n: 1 }, certainty: 'preliminary' },
      newer: {
        arm: { n: 3, min: 1, max: 1 },
        baseline: { n: 3, min: 1, max: 1 },
        certainty: 'within variance',
      },
    });
    // And it lists the pins that differ between the executions
    expect(comparison.pins_differ).toEqual([
      { pin: 'agent.version', earlier: '2.1.221', newer: '2.1.291' },
      { pin: 'harnesses.wingfoil', earlier: 'wingfoil v0.2.2', newer: 'wingfoil v0.2.3' },
    ]);
    expect(compared.stdout).toContain('agent.version: 2.1.221 → 2.1.291');
  }, 240_000);

  it('@F5.2 A comparison across models is marked', async () => {
    // Given two executions run on different models
    const root = await twoExecutions({ model: 'other-model' });

    // When the maintainer compares them
    const compared = await benchSite(root, 'campaign', 'compare', EARLIER, NEWER);
    expect(compared.code, compared.stderr).toBe(0);

    // Then every row of the comparison is marked cross-model
    const rows = comparisonOf(root).rows as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.cross_model === true)).toBe(true);
    expect(compared.stdout).toContain('cross-model');
  }, 240_000);

  it('@F5.2 A group whose scenario changed is not compared', async () => {
    // Given two executions where a scenario's content hash differs
    const root = await twoExecutions();
    for (const arm of ['baseline', 'wingfoil']) {
      for (const repetition of [1, 2, 3]) {
        const file = join(
          root,
          'results',
          NEWER,
          'runs',
          'TC@1.0',
          arm,
          'fake-model',
          `r${repetition}`,
          'run.json',
        );
        writeFileSync(
          file,
          JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), scenario_hash: 'sha256:changed' }),
        );
      }
    }

    // When the maintainer compares them
    const compared = await benchSite(root, 'campaign', 'compare', EARLIER, NEWER);
    expect(compared.code, compared.stderr).toBe(0);

    // Then that scenario's groups read "not compared", naming the two hashes
    const comparison = comparisonOf(root);
    expect(comparison.rows).toEqual([]);
    const notCompared = comparison.not_compared as { scenario: string; reason: string }[];
    expect(notCompared.map((entry) => entry.scenario)).toEqual(['TC', 'TC']);
    for (const entry of notCompared) {
      expect(entry.reason).toMatch(
        /^not compared: scenario hash sha256:[0-9a-f]+ in 0123456789ab\/1, sha256:changed in abcdef012345\/1$/,
      );
    }
  }, 240_000);

  it('@F5.2 Only aggregated campaign executions can be compared', async () => {
    const root = await twoExecutions();
    await storedRun({
      variant: STAND_INS[0],
      steps: [{}, CANCEL],
      into: { root, execution: 'fedcba987654/1' },
    });
    await storedRun({ variant: STAND_INS[0], steps: [{}, CANCEL], into: { root, execution: 'dry-runs/1' } });

    // When the maintainer compares a dry run, an execution not yet aggregated, or one execution with itself
    const dryRun = await benchSite(root, 'campaign', 'compare', 'dry-runs/1', NEWER);
    const unaggregated = await benchSite(root, 'campaign', 'compare', 'fedcba987654/1', NEWER);
    const itself = await benchSite(root, 'campaign', 'compare', NEWER, NEWER);

    // Then the comparison is refused, naming what was given
    expect(dryRun.code).toBe(1);
    expect(dryRun.stderr).toContain('dry-runs/1: a dry run is never compared');
    expect(unaggregated.code).toBe(1);
    expect(unaggregated.stderr).toContain('results/fedcba987654/1: is not aggregated: score it first');
    expect(itself.code).toBe(1);
    expect(itself.stderr).toContain(`${NEWER}: is the same execution twice`);
    expect(existsSync(join(root, 'results', 'comparisons'))).toBe(false);
  }, 240_000);
  it('@F5.2 The comparison is published with the newer execution', async () => {
    // Given a comparison whose newer side is an execution: the site fixture's, against an earlier execution of TC
    const { root } = await siteExecution();
    const variant = STAND_INS[0];
    await storedRun({ variant, steps: [{}, {}], into: { root, execution: EARLIER } });
    await storedRun({ variant, steps: [{}, CANCEL], into: { root, execution: EARLIER, arm: 'wingfoil' } });
    writeFileSync(
      join(root, 'results', EARLIER, 'campaign.yaml'),
      siteCampaign(['TC']).replace('  version: 1.0.0', '  version: 0.9.0'),
    );
    expect((await benchSite(root, 'score', EARLIER)).code).toBe(0);
    const compared = await benchSite(root, 'campaign', 'compare', EARLIER, NEWER);
    expect(compared.code, compared.stderr).toBe(0);

    // When the maintainer builds the site
    const built = await benchSite(root, 'site', 'build', NEWER);
    expect(built.code, built.stderr).toBe(0);

    // Then that execution's landing page links its comparison page
    const dir = join(root, 'site', 'abcdef012345', '1');
    const landing = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(landing).toContain('<a href="compare-0123456789ab-1.html">campaign 0123456789ab, execution 1</a>');
    const page = readFileSync(join(dir, 'compare-0123456789ab-1.html'), 'utf8');
    // ... which shows, per category and arm, each side's delta, the change, its n and the pins that differ
    expect(page).toContain('TC@1.0');
    expect(page).toContain('<td>wingfoil</td>');
    expect(page).toContain('<td>M-Q1</td>');
    expect(page).toContain('n = 1');
    expect(page).toContain('<span class="change">');
    expect(page).toContain('<li>agent.version: 0.9.0 → 1.0.0</li>');
    expect(page).not.toContain('<script');
  }, 240_000);
  it('@F5.2 Two executions of different agents are compared on the baseline arm', async () => {
    // Given two scored executions of the baseline arm whose agents differ, the earlier pinning a harness its baseline
    // does not run (as campaign-002 pins WingFoil, Spec Kit and OpenSpec beside its baseline)
    const variant = STAND_INS[0];
    const root = tempDir('bench-across-');
    for (const target of [EARLIER, NEWER]) {
      await storedRun({ variant, steps: [{}, CANCEL], into: { root, execution: target } });
    }
    completeExecution(root, join(root, 'results', NEWER), ['TC']);
    const side = (agent: Record<string, unknown>, harnesses: Record<string, unknown>, arms: string[]) =>
      stringify({
        harnesses,
        scenarios: [{ id: 'TC', version: '1.0' }],
        arms,
        agent,
        models: { default: 'fake-model' },
        repetitions: { TC: 1 },
        approver_policy: 'v1',
        caps: { step_time_s: 600, step_tokens: 1000000, run_cost_eur: 5 },
        budget: { warn_eur: 10, ceiling_eur: 20 },
        currency: { usd_to_eur: 0.5 },
      });
    writeFileSync(
      join(root, 'results', EARLIER, 'campaign.yaml'),
      side(
        { name: 'claude-code', version: '2.1.300' },
        { wingfoil: { tool: 'wingfoil', version: 'v0.3.0' } },
        ['baseline', 'wingfoil'],
      ),
    );
    writeFileSync(
      join(root, 'results', NEWER, 'campaign.yaml'),
      side({ name: 'codex', version: '0.162.1' }, {}, ['baseline']),
    );
    catalogueEntry(root, join(root, 'results', NEWER), { kind: 'across-agents', compared_with: [EARLIER] });
    for (const target of [EARLIER, NEWER]) {
      const scored = await benchSite(root, 'score', target);
      expect(scored.code, scored.stderr).toBe(0);
    }

    // When the maintainer compares them and builds the newer execution's site
    const compared = await benchSite(root, 'campaign', 'compare', EARLIER, NEWER);
    expect(compared.code, compared.stderr).toBe(0);
    const built = await benchSite(root, 'site', 'build', NEWER);
    expect(built.code, built.stderr).toBe(0);

    // Then its landing page links an across-agents page, not a comparison of deltas
    const dir = join(root, 'site', 'abcdef012345', '1');
    const landing = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(landing).toContain('<a href="across-agents-0123456789ab-1.html">');
    expect(existsSync(join(dir, 'compare-0123456789ab-1.html'))).toBe(false);
    // And the page shows one row per scenario and model of each agent, with n on every value and no better or worse mark
    const page = readFileSync(join(dir, 'across-agents-0123456789ab-1.html'), 'utf8');
    expect(page).toContain('<h2>TC@1.0</h2>');
    expect(page).toContain('<td>claude-code</td>');
    expect(page).toContain('<td>codex</td>');
    expect(page).toContain('n = 1');
    expect(page).not.toMatch(/[▲▼]/);
    // And the baseline's determinism across the two agents is measured
    const across = comparisonOf(root).m_r_across as { arm: string; note?: string; m_r1?: unknown }[];
    expect(across.find((entry) => entry.arm === 'baseline')).toMatchObject({ m_r1: expect.anything() });
    expect(across.find((entry) => entry.arm === 'baseline')?.note).toBeUndefined();
  }, 240_000);

  it('@F5.7 A result profile filters the landing page', async () => {
    // Given the result profiles and the categories each one covers
    const profiles = readFileSync(repoPath('site-content/profiles.yaml'), 'utf8');
    expect(profiles).toContain('id: code-reviewer');
    const { root } = await siteExecution();

    // When the site is built
    const built = await benchSite(root, 'site', 'build', NEWER);
    expect(built.code, built.stderr).toBe(0);

    // Then each profile has its own page, showing only its categories, with a headline over those categories only
    const dir = join(root, 'site', 'abcdef012345', '1');
    const landing = readFileSync(join(dir, 'index.html'), 'utf8');
    for (const id of [
      'solo-developer',
      'code-reviewer',
      'team-developer',
      'tech-lead',
      'non-technical-manager',
      'architect',
    ]) {
      expect(landing).toContain(`<a href="profile-${id}.html">`);
      expect(existsSync(join(dir, `profile-${id}.html`))).toBe(true);
    }
    const reviewer = readFileSync(join(dir, 'profile-code-reviewer.html'), 'utf8');
    expect(reviewer).toContain('Code reviewer');
    expect(reviewer).toContain('<tr id="category-D"');
    expect(reviewer).toContain('<tr id="category-E"');
    for (const other of ['A', 'B', 'C', 'F', 'G'])
      expect(reviewer).not.toContain(`<tr id="category-${other}"`);
    expect(reviewer).toMatch(/<p class="headline">[^<]*<strong>wingfoil<\/strong>[^<]* across category D \(/);
    expect(reviewer).toContain('E is not covered in this campaign.');
    // And no client-side script is needed to filter
    expect(reviewer).not.toContain('<script');
  }, 240_000);

  it('@F5.7 A published link keeps showing the same values', async () => {
    // Given an execution published earlier
    const { root, bare } = await publishableSite();
    const ended = (target: string, date: string) =>
      writeFileSync(
        join(root, 'results', target, 'execution.json'),
        JSON.stringify({ state: 'completed', started: date, ended: date }),
      );
    ended(NEWER, '2026-10-05T12:00:00.000Z');
    expect((await benchSite(root, 'site', 'build', NEWER)).code).toBe(0);
    const first = await benchPublish(root, probeSaying(true), 'site', 'publish');
    expect(first.code, first.stderr).toBe(0);
    const published = (path: string) => gitIn(bare, 'show', `gh-pages:${path}`);
    const earlierPages = gitIn(bare, 'ls-tree', '-r', '--name-only', 'gh-pages')
      .trim()
      .split('\n')
      .filter((path) => path.startsWith('abcdef012345/1/'));
    const before = new Map(earlierPages.map((path) => [path, published(path)]));

    // and a newer execution of another campaign
    const variant = STAND_INS[0];
    const later = 'fedcba987654/1';
    const { executionDir } = await storedRun({
      variant,
      steps: [{}, CANCEL],
      into: { root, execution: later },
    });
    await storedRun({ variant, steps: [{}, CANCEL], into: { root, execution: later, arm: 'wingfoil' } });
    completeExecution(root, executionDir, ['TC']);
    ended(later, '2026-10-12T12:00:00.000Z');
    expect((await benchSite(root, 'score', later)).code).toBe(0);

    // When the site is rebuilt and published
    expect((await benchSite(root, 'site', 'build', later)).code).toBe(0);
    const second = await benchPublish(root, probeSaying(true), 'site', 'publish');
    expect(second.code, second.stderr).toBe(0);

    // Then every page of the earlier execution has the same address and shows the same values as before
    for (const [path, text] of before) expect(published(path), path).toBe(text);
    // And the root index lists both executions with the date each ended
    const index = published('index.html');
    expect(index).toContain(
      '<a href="abcdef012345/1/">campaign abcdef012345, execution 1</a>, ended 2026-10-05',
    );
    expect(index).toContain(
      '<a href="fedcba987654/1/">campaign fedcba987654, execution 1</a>, ended 2026-10-12',
    );
  }, 240_000);
});
