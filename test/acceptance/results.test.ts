import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AgentPort } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import { aggregatedExecution, WINGFOIL_COMMIT } from '../support/finding-fixture.js';
import { benchSite, siteExecution } from '../support/site-fixture.js';
import { localScoringDocker } from '../support/local-scoring.js';
import { repoPath } from '../support/paths.js';
import { referenceFiles } from '../support/reference.js';
import {
  CANCEL,
  EXECUTION,
  HOLDOUT_SECRET,
  scoringDocker,
  storedRun,
  usageOf,
} from '../support/score-fixture.js';

const NO_AGENT: AgentPort = {
  runStep: () => Promise.reject(new Error('scoring runs no agent')),
  resume: () => Promise.reject(new Error('scoring runs no agent')),
};

/** `bench score <target>` in `root`, with Docker replaced by the scoring double (acceptance decision 1). */
async function benchScore(root: string, target: string) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    ['score', target],
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    { docker: scoringDocker().docker, git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, stderr };
}

/** Every `{ n, runs }` value of an aggregate, wherever it sits. */
function valuesIn(node: unknown): { n: number; runs: string[] }[] {
  if (Array.isArray(node)) return node.flatMap(valuesIn);
  if (node === null || typeof node !== 'object') return [];
  const record = node as Record<string, unknown>;
  const own =
    typeof record.n === 'number' && Array.isArray(record.runs)
      ? [record as { n: number; runs: string[] }]
      : [];
  return [...own, ...Object.values(record).flatMap(valuesIn)];
}

/** A scored campaign of T3 — standing in for S1 — in two arms, the wingfoil one with two repetitions. */
async function scoredCampaign() {
  const first = await storedRun({ steps: [{}, CANCEL] });
  await storedRun({ steps: [{}, CANCEL], into: { root: first.root, arm: 'wingfoil', repetition: 1 } });
  await storedRun({ steps: [{}, {}], into: { root: first.root, arm: 'wingfoil', repetition: 2 } });
  return first;
}

/** `bench <argv>` in `root`, with the local scoring double: hidden tests really run (task-032). */
async function benchLocally(root: string, ...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    argv,
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    { docker: localScoringDocker(), git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, stderr };
}

/**
 * S3's reference stored in the baseline and wingfoil arms (task-043), and scored: the baseline's steps
 * cost 0.05 EUR times their number, wingfoil's 0.02 EUR times it — synthetic, as the fake gives every
 * arm the same. The baseline's step 1 keeps a transcript, a session the real agent produced, and step 2
 * one intervention with the approver's reply.
 */
let s3Arms: Promise<{ show: Output; compare: Output }> | undefined;
interface Output {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}
function s3RunDetails() {
  // Both commands run here, once: the repository is a temporary directory, removed when the test that
  // made it finishes.
  s3Arms ??= (async () => {
    const steps = referenceFiles(repoPath('test/fixtures/reference/S3'));
    const baseline = await storedRun({ scenario: 'S3', steps });
    const wingfoil = await storedRun({
      scenario: 'S3',
      steps,
      into: { root: baseline.root, arm: 'wingfoil' },
      record: (n) => ({ usage: { ...usageOf(n), costUsd: 0.04 * n, costEur: 0.02 * n } }),
    });
    writeFileSync(
      join(baseline.runDir, 'steps', '01', 'transcript.jsonl'),
      readFileSync(repoPath('test/fixtures/sessions/completed.jsonl')),
    );
    const record = join(baseline.runDir, 'run.json');
    const run = JSON.parse(readFileSync(record, 'utf8')) as Record<string, unknown>;
    writeFileSync(
      record,
      JSON.stringify({
        ...run,
        interventions: [{ step: 2, kind: 'approval', reply: 'Approved: go ahead.' }],
      }),
    );
    const scored = await benchLocally(baseline.root, 'score', EXECUTION);
    if (scored.code !== 0) throw new Error(scored.stdout + scored.stderr);
    return {
      show: await benchLocally(baseline.root, 'run', 'show', baseline.runDir),
      compare: await benchLocally(baseline.root, 'run', 'compare', wingfoil.runDir, baseline.runDir),
    };
  })();
  return s3Arms;
}

/** `bench <argv>` in `root`, with the scoring double. */
async function benchScoreLike(root: string, argv: readonly string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    [...argv],
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    { docker: scoringDocker().docker, git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, stderr };
}

/** Every file under `dir`, relative, with its bytes: what a command wrote there shows as a difference. */
function snapshotTree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    for (const name of readdirSync(at)) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else out[relative(dir, path)] = readFileSync(path, 'base64');
    }
  };
  walk(dir);
  return out;
}

/**
 * The site built from {@link siteExecution} (task-045): the build's output, and every file it wrote under
 * `site/` with its text. Built once and kept as text: the repository is a temporary directory, removed
 * when the test that made it finishes.
 */
let builtSite: Promise<{ build: Output; files: Record<string, string>; holdout: string }> | undefined;
function siteBuilt() {
  builtSite ??= (async () => {
    const { root, holdout } = await siteExecution();
    const build = await benchSite(root, 'site', 'build', EXECUTION);
    const files = existsSync(join(root, 'site')) ? snapshotTree(join(root, 'site')) : {};
    const text = Object.fromEntries(
      Object.entries(files).map(([path, bytes]) => [path, Buffer.from(bytes, 'base64').toString('utf8')]),
    );
    return { build, files: text, holdout };
  })();
  return builtSite;
}

/** The landing page of the site's execution. */
async function landing(): Promise<string> {
  const { build, files } = await siteBuilt();
  expect(build.code, build.stderr).toBe(0);
  return files['abcdef012345/1/index.html'] ?? '';
}

/** A landing page's row for `category`: from its opening tag to the next row's. */
function rowOf(page: string, category: string): string {
  const start = page.indexOf(`<tr id="category-${category}"`);
  if (start < 0) return '';
  const end = page.indexOf('</tr>', start);
  return page.slice(start, end);
}

describe('results.feature', () => {
  it('@F5.1 Every aggregate links to the runs behind it', async () => {
    // Given a scored campaign
    const campaign = await scoredCampaign();
    const scored = await benchScore(campaign.root, EXECUTION);
    expect(scored.code).toBe(0);
    expect(scored.stdout).toMatch(
      /aggregate: results\/abcdef012345\/1\/aggregate\.json \(2 groups, 0 slices; determinism measured in 1, n = 1 in 1\)\n$/,
    );

    // When the maintainer opens any aggregate value in the results store
    const aggregate = JSON.parse(readFileSync(join(campaign.executionDir, 'aggregate.json'), 'utf8')) as {
      groups: unknown[];
    };
    const values = valuesIn(aggregate);
    expect(values.length).toBeGreaterThan(10);

    // Then it lists the runs it was computed from, with their campaign, scenario version, arm, model id
    // and repetition — each named by its path under results/, which holds all five
    for (const value of values) {
      expect(value.n).toBe(value.runs.length);
      for (const run of value.runs) {
        expect(run).toMatch(/^abcdef012345\/1\/runs\/T3@1\.0\/(baseline|wingfoil)\/fake-model\/r[12]$/);
        expect(existsSync(join(campaign.root, 'results', run, 'score.json'))).toBe(true);
      }
    }
  });

  it('@F5.3 Run detail shows everything about one run', async () => {
    // When the maintainer opens the detail of one run — S3's baseline run
    const { code, stdout, stderr } = (await s3RunDetails()).show;
    expect(code, stderr).toBe(0);

    // Then it shows the transcript of every step — step 1's, the real agent's session; the others are
    // not on disk, which it says
    expect(stdout).toContain('- assistant: ready');
    expect(stdout.match(/transcript not on disk/g)).toHaveLength(4);
    // the diff of every step
    expect(stdout.match(/```diff\ndiff --git /g)).toHaveLength(5);
    // the test results — M-Q1 per step and on the final snapshot
    expect(stdout).toContain('- step 05: M-Q1 37/37');
    expect(stdout).toContain('- final: M-Q1 37/37');
    // the token usage
    expect(stdout).toContain('- tokens: input 50, output 500, cache creation 5000, cache read 50000');
    // and the interventions, with the approver's reply
    expect(stdout).toContain('  - approval: Approved: go ahead.');
  }, 600_000);

  it('@F5.3 Two arms of the same scenario can be compared side by side', async () => {
    // When the maintainer compares the wingfoil and baseline runs of S3
    const { code, stdout, stderr } = (await s3RunDetails()).compare;
    expect(code, stderr).toBe(0);

    // Then their steps are shown side by side, with cost and pass rate per step
    expect(stdout).toContain(
      '| step | wingfoil r1 cost | wingfoil r1 M-Q1 | wingfoil r1 interventions | baseline r1 cost | baseline r1 M-Q1 | baseline r1 interventions |',
    );
    expect(stdout).toContain('| 01 | 0.0200 EUR | 11/11 | 0 | 0.0500 EUR | 11/11 | 0 |');
    expect(stdout).toContain('| 05 | 0.1000 EUR | 37/37 | 0 | 0.2500 EUR | 37/37 | 4 |');
    expect(stdout).toContain('| final | — | 37/37 | — | — | 37/37 | — |');
    expect(stdout).toContain('| total | 0.3000 EUR | — | 0 | 0.7500 EUR | — | 10 |');
  }, 600_000);

  it('@F5.4 A finding note is ready to become a WingFoil bug or decision-log', async () => {
    // Given the maintainer selects a difference between arms in a scored campaign — M-Q1 of T3, where
    // one wingfoil repetition does not cancel orders
    const { root } = await aggregatedExecution();
    const before = snapshotTree(root);

    // When the maintainer exports it as a finding note
    const { code, stdout } = await benchScoreLike(root, [
      'finding',
      EXECUTION,
      '--scenario',
      'T3@1.0',
      '--metric',
      'M-Q1',
      '--arms',
      'baseline,wingfoil',
      '--as',
      'decision-log',
    ]);
    expect(code).toBe(0);

    // Then the note contains the campaign identity, the WingFoil commit, the scenario and version, the
    // runs involved, the metric values, and links to the run details
    const file = stdout.replace(/^finding: /, '').trim();
    const note = readFileSync(join(root, file), 'utf8');
    expect(note).toContain('- campaign: abcdef012345, execution 1, model fake-model');
    expect(note).toContain(WINGFOIL_COMMIT);
    expect(note).toMatch(/- T3@1\.0 \(sha256:/);
    expect(note).toContain('abcdef012345/1/runs/T3@1.0/wingfoil/fake-model/r2');
    expect(note).toContain('- final M-Q1: 1/1 (r1), 0/1 (r2); range 0/1–1/1');
    expect(note).toContain('`bench run show abcdef012345/1/runs/T3@1.0/baseline/fake-model/r1`');
    expect(note).toContain('## For WingFoil: decision-log');

    // And the note is written as a file in the benchmark repository
    expect(file).toMatch(/^findings\/[a-z0-9.+-]+\.md$/);
    expect(existsSync(join(root, file))).toBe(true);

    // And nothing is written to the WingFoil repository — nor anywhere but that one file: the command
    // is given no path to WingFoil, and the repository it runs in changes by the note alone
    const after = snapshotTree(root);
    expect(Object.keys(after).filter((path) => !(path in before))).toEqual([file]);
    expect(Object.fromEntries(Object.entries(after).filter(([path]) => path !== file))).toEqual(before);
  });

  it('@F5.5 The landing page answers the question at a glance', async () => {
    // Given a scored campaign — TC, TD and TF standing in for C, D and F, in two arms
    // When the site is built
    const page = await landing();

    // Then the landing page states that harnesses are compared, not models, and names the model
    expect(page).toContain('Harness, not model');
    expect(page).toContain('<strong>fake-model</strong>');

    // And it shows a headline sentence and one chart comparing the arms
    expect(page).toContain(
      '<p class="headline">Against the baseline, <strong>wingfoil</strong> is better in 1, worse in 1 and ' +
        'the same in 3 of 5 comparisons across categories C, D and F (preliminary: n = 1 in C, D and F).</p>',
    );
    expect(page.match(/<svg /g)).toHaveLength(1);
    const chart = page.slice(page.indexOf('<svg '), page.indexOf('</svg>'));
    for (const arm of ['baseline', 'wingfoil']) expect(chart).toContain(`>${arm}<`);
    // a bar per arm for each of the three covered categories' scenarios, F's included
    expect(chart.match(/<rect class="bar/g)).toHaveLength(6);

    // And it shows one row per category, with the delta per arm
    for (const category of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) expect(rowOf(page, category)).not.toBe('');
    const d = rowOf(page, 'D');
    expect(d).toContain('M-Q1');
    expect(d).toContain('−100.0 pp');
  });

  it('@F5.5 Losses, ties and gaps are as visible as wins', async () => {
    // Given a campaign where the wingfoil arm loses in category D and wins in category F
    // When the site is built
    const page = await landing();
    const { files } = await siteBuilt();

    // Then category D shows the loss with the same prominence as the win in category F
    const loss = /<span class="outcome" data-outcome="worse">[^<]*<\/span>/.exec(rowOf(page, 'D'))?.[0];
    const win = /<span class="outcome" data-outcome="better">[^<]*<\/span>/.exec(rowOf(page, 'F'))?.[0];
    expect(loss).toBe('<span class="outcome" data-outcome="worse">▼ worse</span>');
    expect(win).toBe('<span class="outcome" data-outcome="better">▲ better</span>');
    // the same element and class, and no style that tells them apart
    expect(files['style.css']).toBeDefined();
    expect(files['style.css']).not.toMatch(/data-outcome|better|worse/);

    // And categories A, B and G are listed as "not covered in this campaign"
    for (const category of ['A', 'B', 'G']) {
      expect(rowOf(page, category)).toContain('not covered in this campaign');
    }
  });

  it('@F5.5 Preliminary results are labelled', async () => {
    // Given a category whose results come from a single repetition — every stand-in has one run per arm
    // When the site is built
    const page = await landing();
    const { files, holdout } = await siteBuilt();

    // Then that category carries a "preliminary" badge and shows "n = 1"
    for (const category of ['C', 'D', 'F']) {
      const row = rowOf(page, category);
      expect(row).toContain('<span class="badge">preliminary</span>');
      expect(row).toContain('n = 1');
    }

    // And results from hold-out additions are marked as such
    expect(rowOf(page, 'C')).toContain('<span class="holdout">hold-out</span> 1/2');
    // ... and only their counts are published: no hold-out test's name, nor where the hold-out lives
    for (const text of Object.values(files)) {
      expect(text).not.toContain(HOLDOUT_SECRET);
      expect(text).not.toContain(holdout);
    }
  });

  it('@F5.8 The method page explains how to read the results', async () => {
    // When the site is built
    const { files } = await siteBuilt();
    const method = files['abcdef012345/1/method.html'] ?? '';

    // Then the method page describes the arms, the controls, the run protocol, the approver policy, the
    // validity threats, the pins and the budget, in plain language
    for (const anchor of [
      'arms',
      'baseline-docs-control',
      'how-a-run-goes',
      'neutral-approver',
      'approver-decision',
      'validity-threats',
      'pins',
      'budget',
    ]) {
      expect(method, anchor).toContain(`id="${anchor}"`);
    }
    // ... the pins and the budget being this execution's own
    expect(method).toContain('<th scope="row">Approver policy</th><td>v1</td>');
    expect(method).toContain('<th scope="row">Budget ceiling</th><td>20 EUR</td>');
  });

  it('@F5.1 Dry runs never enter campaign results', async () => {
    // Given dry runs and campaign runs of S1 exist — T3 standing in for S1
    const campaign = await scoredCampaign();
    await storedRun({ steps: [{}, CANCEL], into: { root: campaign.root, execution: 'dry-runs/1' } });
    expect((await benchScore(campaign.root, 'dry-runs/1')).code).toBe(0);

    // When the campaign's results are aggregated
    expect((await benchScore(campaign.root, EXECUTION)).code).toBe(0);

    // Then only campaign runs are included
    const text = readFileSync(join(campaign.executionDir, 'aggregate.json'), 'utf8');
    expect(text).not.toContain('dry-runs');
    expect(
      valuesIn(JSON.parse(text)).every((value) =>
        value.runs.every((run) => run.startsWith('abcdef012345/1/')),
      ),
    ).toBe(true);
    // And a dry run is never aggregated on its own either (REQ-RES-01)
    expect(existsSync(join(campaign.root, 'results', 'dry-runs', '1', 'aggregate.json'))).toBe(false);
  });
});
