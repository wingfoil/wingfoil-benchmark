import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AgentPort } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import { CANCEL, EXECUTION, scoringDocker, storedRun } from '../support/score-fixture.js';

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
