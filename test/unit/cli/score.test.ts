import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { AgentPort } from '../../../src/agents/index.js';
import { main } from '../../../src/cli/index.js';
import { gitCli, systemProcess } from '../../../src/core/index.js';
import { CANCEL, EXECUTION, RUN_PATH, scoringDocker, storedRun } from '../../support/score-fixture.js';
import { tempDir } from '../../support/scenario-fixture.js';

const NO_AGENT: AgentPort = {
  runStep: () => Promise.reject(new Error('scoring runs no agent')),
  resume: () => Promise.reject(new Error('scoring runs no agent')),
};

async function score(root: string, ...argv: string[]) {
  const { docker, recorded } = scoringDocker();
  let stdout = '';
  let stderr = '';
  const code = await main(
    ['score', ...argv],
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    { docker, git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, stderr, recorded };
}

describe('bench score (REQ-CLI-06)', () => {
  const previous = process.env.BENCH_HOLDOUT_PATH;
  afterEach(() => {
    if (previous === undefined) delete process.env.BENCH_HOLDOUT_PATH;
    else process.env.BENCH_HOLDOUT_PATH = previous;
  });

  it('scores every run of an execution, writes its score.json and says M-Q1 in one line per run', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });

    const result = await score(fixture.root, EXECUTION);

    expect(result).toMatchObject({
      code: 0,
      stdout: 'T3@1.0 baseline fake-model r1: step 01 0/1, step 02 1/1, final 1/1\n',
      stderr: '',
    });
    expect(existsSync(join(fixture.runDir, 'score.json'))).toBe(true);
    // The scoring image is built once, from its own directory, and tagged by its content.
    expect(result.recorded.builds).toEqual([expect.stringMatching(/^bench-score:[0-9a-f]{12}$/)]);
  });

  it('scores a dry run the same way (F6.x in W7): its score stays with it', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    const dryRun = join(fixture.root, 'results', 'dry-runs', '1');
    const { cpSync } = await import('node:fs');
    cpSync(fixture.executionDir, dryRun, { recursive: true });

    const result = await score(fixture.root, 'dry-runs/1');

    expect(result.code).toBe(0);
    expect(existsSync(join(dryRun, RUN_PATH, 'score.json'))).toBe(true);
  });

  it('says why a run could not be scored, scores the others, and exits 1', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    const file = join(fixture.runDir, 'run.json');
    const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(file, JSON.stringify({ ...record, setup: { duration_ms: 1 } }));

    const result = await score(fixture.root, EXECUTION);

    expect(result).toMatchObject({
      code: 1,
      stdout: '',
      stderr:
        'T3@1.0 baseline fake-model r1: run.json: was stored before runs recorded what their snapshots are rebuilt from (task-027)\n',
    });
    expect(existsSync(join(fixture.runDir, 'score.json'))).toBe(false);
  });

  it('names an execution that does not exist, or holds no run', async () => {
    const root = tempDir('bench-repo-');
    expect(await score(root, 'abcdef012345/9')).toMatchObject({
      code: 1,
      stderr: 'results/abcdef012345/9: no such execution\n',
    });
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(root, 'results', 'abcdef012345', '9'), { recursive: true });
    expect(await score(root, 'abcdef012345/9')).toMatchObject({
      code: 1,
      stderr: 'results/abcdef012345/9: holds no run\n',
    });
  });

  it('names a run whose scenario version is not in the repository', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    const { rmSync } = await import('node:fs');
    rmSync(join(fixture.root, 'scenarios', 'T3'), { recursive: true });
    const result = await score(fixture.root, EXECUTION);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/^T3@1\.0 baseline fake-model r1: scenario\.yaml: /);
  });

  it('checks a hold-out it is given, from the option or the variable, before scoring anything (REQ-CLI-10)', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    const nowhere = join(tempDir('bench-holdout-'), 'nowhere');
    expect(await score(fixture.root, EXECUTION, '--holdout', nowhere)).toMatchObject({
      code: 1,
      stdout: '',
      stderr: `--holdout: ${nowhere} does not exist\n`,
    });
    process.env.BENCH_HOLDOUT_PATH = nowhere;
    expect((await score(fixture.root, EXECUTION)).stderr).toBe(
      `BENCH_HOLDOUT_PATH: ${nowhere} does not exist\n`,
    );
  });

  it.each([
    [[]],
    [['abcdef012345']],
    [['abcdef012345/0']],
    [['ABCDEF012345/1']],
    [['../x/1']],
    [['abcdef012345/1', 'extra']],
    [['abcdef012345/1', '--holdout']],
    [['abcdef012345/1', '--other', 'x']],
  ])('refuses the arguments %j with the usage', async (argv) => {
    const result = await score(tempDir('bench-repo-'), ...argv);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/^usage: bench/);
  });
});
