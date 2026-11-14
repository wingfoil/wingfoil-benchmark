// The review loop's records, spending and command line (task-149, REQ-FMT-06, REQ-RUN-08, REQ-RUN-02, REQ-CLI-05 as
// amended in 1.58): what the acceptance scenarios of `runner.feature` do not show.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';

import { main } from '../../../src/cli/index.js';
import { executionSpendingEur } from '../../../src/results/index.js';
import { runCampaign } from '../../../src/runner/index.js';
import { writeArmsNamed } from '../../support/arm-fixture.js';
import { dryRunProfileYaml, priceCampaign, writeDryRunProfile } from '../../support/dry-run-fixture.js';
import { repoPath } from '../../support/paths.js';
import {
  FIXER_PROMPT,
  findingsMessage,
  loopCampaign,
  REVIEW_PROMPT,
  reviewerDouble,
  reviewLoopYaml,
} from '../../support/review-fixture.js';
import { doubles } from '../../support/runner-doubles.js';
import { tempDir } from '../../support/scenario-fixture.js';

const io = () => {
  const out = { stdout: '', stderr: '' };
  return {
    out,
    io: {
      stdout: (text: string) => (out.stdout += text),
      stderr: (text: string) => (out.stderr += text),
    },
  };
};

describe("the loop's records (REQ-FMT-06 as amended in 1.58)", () => {
  it("keeps both sessions' transcripts out of git, as a step's", () => {
    const ignore = readFileSync(repoPath('.gitignore'), 'utf8').split('\n');
    expect(ignore).toContain('results/**/review/*/reviewer.jsonl');
    expect(ignore).toContain('results/**/review/*/fixer.jsonl');
  });

  it("counts a loop's cost in the campaign's spending, across executions (REQ-RUN-08)", () => {
    const execution = tempDir('bench-spent-');
    const run = join(execution, 'runs', 'S1@1.0', 'baseline', 'm', 'r1');
    mkdirSync(join(run, 'review'), { recursive: true });
    writeFileSync(join(run, 'run.json'), JSON.stringify({ steps: [{ usage: { costEur: 0.5 } }] }));
    writeFileSync(
      join(run, 'review', 'loop.json'),
      JSON.stringify({ outcome: 'clean', cost_eur: 0.25, rounds: [] }),
    );
    expect(executionSpendingEur(execution, 0.9)).toBeCloseTo(0.75, 9);
  });
});

describe("the loop's reviewer container (REQ-RUN-02 as amended in 1.58)", () => {
  it('refuses a reviewer container this execution left behind, as a run refuses its own', async () => {
    const { checked } = loopCampaign();
    const name = `bench-${checked.campaign.id}-1-S1-1.0-baseline-fake-model-r1-review-1`;
    const reviewer = reviewerDouble(() => findingsMessage());
    const ports = doubles({ leftovers: [name] });
    const summary = await runCampaign(checked, { ...ports, reviewer: { agent: reviewer } });
    const run = summary.runs[0];
    expect(run?.outcome).toBe('completed');
    const loop = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'review', 'loop.json'), 'utf8')) as {
      outcome: string;
      reason: string;
    };
    expect(loop).toMatchObject({ outcome: 'failed', reason: expect.stringContaining(name) });
    expect(reviewer.requests).toEqual([]);
    expect(ports.recorded.removes).not.toContain(name);
  });

  it('removes the reviewer container when its round ends', async () => {
    const reviewer = reviewerDouble(() => findingsMessage());
    const { checked } = loopCampaign();
    const ports = doubles();
    await runCampaign(checked, { ...ports, reviewer: { agent: reviewer } });
    // The run's container is container-1, the round's reviewer container-2.
    expect(ports.recorded.removes).toEqual(['container-2', 'container-1']);
    expect(ports.recorded.creates[1]).toMatchObject({ name: expect.stringMatching(/-review-1$/) });
  });
});

describe('the command line gives the runner its reviewer (REQ-RUN-15 for the reviewer agent)', () => {
  it('runs a campaign with the injected reviewer', async () => {
    const { checked } = loopCampaign();
    priceCampaign(checked.campaign.file);
    const reviewer = reviewerDouble(() => findingsMessage());
    const { out, io: streams } = io();
    expect(
      await main(['campaign', 'run', checked.campaign.file], streams, { ...doubles(), reviewer }),
      out.stderr,
    ).toBe(0);
    expect(reviewer.requests).toHaveLength(1);
  });

  it('refuses a reviewer that spends without the spending flag, naming it', async () => {
    const loop = { ...reviewLoopYaml(), agent: { name: 'claude-code', version: '2.1.300' } };
    const { checked } = loopCampaign({ loop });
    priceCampaign(checked.campaign.file);
    const { out, io: streams } = io();
    expect(await main(['campaign', 'run', checked.campaign.file], streams, doubles())).toBe(2);
    expect(out.stderr).toMatch(/review_loop/);
    expect(out.stderr).toMatch(/--allow-spending/);
  });

  it("runs and records a dry run's loop (REQ-CLI-05)", async () => {
    const root = tempDir('bench-dry-loop-');
    cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
    copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
    writeArmsNamed(root, ['baseline', 'baseline-docs', 'wingfoil']);
    mkdirSync(join(root, 'review'));
    writeFileSync(join(root, 'review', 'prompt.md'), REVIEW_PROMPT);
    writeFileSync(join(root, 'review', 'fixer-prompt.md'), FIXER_PROMPT);
    writeDryRunProfile(root, stringify({ ...dryRunProfileYaml(), review_loop: reviewLoopYaml() }));
    const reviewer = reviewerDouble(() => findingsMessage());
    const { out, io: streams } = io();
    const code = await main(
      ['scenario', 'dry-run', 'T3@1.0', '--arm', 'baseline'],
      streams,
      { ...doubles(), reviewer },
      root,
    );
    expect(code, out.stderr).toBe(0);
    const loopFile = join(root, 'results', 'dry-runs', '1', 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r1');
    expect(existsSync(join(loopFile, 'review', 'loop.json'))).toBe(true);
    expect(reviewer.requests).toHaveLength(1);
  });
});
