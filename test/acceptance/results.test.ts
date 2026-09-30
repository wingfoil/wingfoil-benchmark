import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AgentPort } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import { localScoringDocker } from '../support/local-scoring.js';
import { repoPath } from '../support/paths.js';
import { referenceFiles } from '../support/reference.js';
import { CANCEL, EXECUTION, scoringDocker, storedRun, usageOf } from '../support/score-fixture.js';

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
