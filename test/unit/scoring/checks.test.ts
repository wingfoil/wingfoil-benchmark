import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { gitCli, systemProcess } from '../../../src/core/index.js';
import type { Check } from '../../../src/core/index.js';
import { scoreChecks } from '../../../src/scoring/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

/**
 * Checks scored on a run's stored files (REQ-SCO-06 as amended in 1.12, task-035): a content check on
 * the lines a step added and on its commit messages, an unchanged check on the step's snapshot. Both
 * read text; neither runs code, so no container is involved.
 */

const git = gitCli(systemProcess);

/** What a step writes (a file's content, or `null` to delete it), and the messages it committed with. */
interface Step {
  readonly files: Readonly<Record<string, string | Buffer | null>>;
  readonly messages?: readonly string[];
}

const SEED = {
  'README.md': 'A rental service.\nBookings are for whole days.\n',
  'src/tax.ts':
    'export const RATE = 22;\n\n/** Tax on shipping. */\nexport function shippingTax(c: number): number {\n  return c;\n}\n',
};

/**
 * A run stored as the runner stores one: each step's patch from the previous snapshot, its commit
 * messages in `commits.json` (unless `withoutMessages`), and its snapshot as a directory.
 */
async function run(steps: readonly Step[], options: { withoutMessages?: boolean } = {}) {
  const workspace = tempDir('bench-checks-ws-');
  const runDir = tempDir('bench-checks-run-');
  const snapshotsDir = tempDir('bench-checks-snap-');
  const write = (files: Step['files']) => {
    for (const [path, content] of Object.entries(files)) {
      const target = join(workspace, path);
      if (content === null) rmSync(target);
      else {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content);
      }
    }
  };
  await git.init(workspace);
  write(SEED);
  await git.commitAll(workspace, 'seed');
  let previous = await git.tree(workspace, 'HEAD');
  const snapshots = new Map<number, string>();
  for (const [index, step] of steps.entries()) {
    const number = String(index + 1).padStart(2, '0');
    write(step.files);
    await git.commitAll(workspace, `step ${number}`, { allowEmpty: true });
    const tree = await git.tree(workspace, 'HEAD');
    mkdirSync(join(runDir, 'steps', number), { recursive: true });
    writeFileSync(join(runDir, 'steps', number, 'diff.patch'), await git.patchOf(workspace, previous, tree));
    if (options.withoutMessages !== true) {
      writeFileSync(
        join(runDir, 'steps', number, 'commits.json'),
        `${JSON.stringify({ messages: step.messages ?? [] }, undefined, 2)}\n`,
      );
    }
    const snapshot = join(snapshotsDir, number);
    cpSync(workspace, snapshot, { recursive: true, filter: (source) => !source.endsWith('.git') });
    snapshots.set(index + 1, snapshot);
    previous = tree;
  }
  return { runDir, snapshots };
}

function content(patterns: string[][], steps: number[] = [1]): Check {
  return { id: 'revision', file: '/oracle/checks/revision.yaml', kind: 'content', steps, patterns };
}

const REGION = {
  path: 'src/tax.ts',
  from: 3,
  to: 6,
  lines: ['/** Tax on shipping. */', 'export function shippingTax(c: number): number {', '  return c;', '}'],
};

function unchanged(steps: number[] = [1]): Check {
  return {
    id: 'kept',
    file: '/oracle/checks/kept.yaml',
    kind: 'unchanged',
    steps,
    regions: [{ path: 'README.md', from: 1, to: 1, lines: ['A rental service.'] }, REGION],
  };
}

async function scored(check: Check, steps: readonly Step[], options?: { withoutMessages?: boolean }) {
  const { runDir, snapshots } = await run(steps, options);
  const result = scoreChecks({ checks: [check], runDir, snapshots });
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.value;
}

describe('content checks (REQ-SCO-06)', () => {
  it('passes when every group matches in the lines the step added to one file, and says which', async () => {
    const checks = await scored(content([['whole days', 'full days'], ['revised']]), [
      { files: { 'docs/NOTES.md': '# Notes\n\nD3 revised: bookings are no longer whole\n   Days only.\n' } },
    ]);
    expect(checks).toEqual([
      { id: 'revision', kind: 'content', steps: [{ n: 1, passed: true, where: { file: 'docs/NOTES.md' } }] },
    ]);
  });

  it('matches case-insensitively, with runs of whitespace folded on both sides', async () => {
    const checks = await scored(content([['WHOLE   days'], ['Revised']]), [
      { files: { 'n.md': 'whole\tdays, REVISED\n' } },
    ]);
    expect(checks[0]?.steps).toEqual([{ n: 1, passed: true, where: { file: 'n.md' } }]);
  });

  it('fails when the groups match only in different files', async () => {
    const checks = await scored(content([['whole days'], ['revised']]), [
      { files: { 'a.md': 'whole days\n', 'b.md': 'revised\n' } },
    ]);
    expect(checks[0]?.steps).toEqual([{ n: 1, passed: false }]);
  });

  it('reads only the lines the step added, never what the file already said', async () => {
    const checks = await scored(content([['whole days'], ['revised']]), [
      { files: { 'README.md': `${SEED['README.md']}Revised: hourly rentals added.\n` } },
    ]);
    expect(checks[0]?.steps).toEqual([{ n: 1, passed: false }]);
  });

  it('matches a commit message of the step, named by its position', async () => {
    const checks = await scored(content([['whole days'], ['revised']]), [
      {
        files: { 'src/a.ts': 'export const a = 1;\n' },
        messages: ['Add a', 'D3 revised: no longer whole days only\n\nWhy: hourly rentals.'],
      },
    ]);
    expect(checks[0]?.steps).toEqual([{ n: 1, passed: true, where: { commit: 2 } }]);
  });

  it('leaves binary and deleted files out, and scores each of its steps apart', async () => {
    const checks = await scored(content([['revised']], [1, 2]), [
      { files: { 'blob.bin': Buffer.from([0, 1, 2, 0x72, 0x65, 0x76, 0x69, 0x73, 0x65, 0x64, 0]) } },
      { files: { 'README.md': null } },
    ]);
    expect(checks[0]?.steps).toEqual([
      { n: 1, passed: false },
      { n: 2, passed: false },
    ]);
  });

  it('records a step the run never reached as not reached', async () => {
    const checks = await scored(content([['revised']], [1, 2]), [{ files: { 'n.md': 'revised\n' } }]);
    expect(checks[0]?.steps).toEqual([
      { n: 1, passed: true, where: { file: 'n.md' } },
      { n: 2, not_reached: true },
    ]);
  });

  it('passes the same record whatever form a harness gives it: a decision-log or a notes file (F4.8)', async () => {
    const check = content([['whole days'], ['revised', 'supersede']]);
    const wingfoil = await scored(check, [
      {
        files: {
          '.wingfoil/memory/decision-log/dl-002-hourly-rentals.md':
            '---\nid: dl-002-hourly-rentals\ntype: decision-log\nstatus: pending\n---\n\n## Decision\n\nSupersedes dl-001: bookings are no longer whole days only.\n',
        },
        messages: ['wf(decision-log): add dl-002-hourly-rentals'],
      },
    ]);
    const plain = await scored(check, [
      { files: { 'NOTES.md': 'Decision revised: bookings were whole days only; now hours too.\n' } },
    ]);
    expect(wingfoil[0]?.steps).toEqual([
      { n: 1, passed: true, where: { file: '.wingfoil/memory/decision-log/dl-002-hourly-rentals.md' } },
    ]);
    expect(plain[0]?.steps).toEqual([{ n: 1, passed: true, where: { file: 'NOTES.md' } }]);
  });

  it('names a file git quotes in its patch by its real name', async () => {
    const checks = await scored(content([['revised']]), [
      { files: { 'notes/décision\t"1".md': 'revised\n' } },
    ]);
    expect(checks[0]?.steps).toEqual([{ n: 1, passed: true, where: { file: 'notes/décision\t"1".md' } }]);
  });

  it("is an issue, not a failed check, when a step's patch is missing", async () => {
    const { runDir, snapshots } = await run([{ files: { 'n.md': 'revised\n' } }]);
    rmSync(join(runDir, 'steps', '01', 'diff.patch'));
    expect(scoreChecks({ checks: [content([['revised']])], runDir, snapshots })).toEqual({
      ok: false,
      issues: [{ path: 'steps/01/diff.patch', message: 'is missing' }],
    });
  });

  it('refuses a run stored before steps recorded their commit messages, rather than guess', async () => {
    const { runDir, snapshots } = await run([{ files: { 'n.md': 'revised\n' } }], { withoutMessages: true });
    expect(scoreChecks({ checks: [content([['revised']])], runDir, snapshots })).toEqual({
      ok: false,
      issues: [
        {
          path: 'steps/01/commits.json',
          message: 'is missing: the run was stored before steps recorded their commit messages (task-035)',
        },
      ],
    });
  });
});

describe('unchanged checks (REQ-SCO-06 as amended)', () => {
  it("passes when every region's seed lines still stand, together, in their file, wherever they moved", async () => {
    const checks = await scored(unchanged(), [
      { files: { 'src/tax.ts': `// Rounding fixed.\nexport const HALF = 0.5;\n\n${SEED['src/tax.ts']}` } },
    ]);
    expect(checks).toEqual([{ id: 'kept', kind: 'unchanged', steps: [{ n: 1, passed: true }] }]);
  });

  it('fails on an edited line, naming the first region that did not hold', async () => {
    const checks = await scored(unchanged([1, 2]), [
      { files: { 'n.md': 'nothing here\n' } },
      { files: { 'src/tax.ts': SEED['src/tax.ts'].replace('  return c;', '  return 0;') } },
    ]);
    expect(checks[0]?.steps).toEqual([
      { n: 1, passed: true },
      { n: 2, passed: false, region: 1 },
    ]);
  });

  it('fails when the file is gone, or only reformatted', async () => {
    const gone = await scored(unchanged(), [{ files: { 'src/tax.ts': null } }]);
    const reformatted = await scored(unchanged(), [
      { files: { 'src/tax.ts': SEED['src/tax.ts'].replace('  return c;', '    return c;') } },
    ]);
    expect(gone[0]?.steps).toEqual([{ n: 1, passed: false, region: 1 }]);
    expect(reformatted[0]?.steps).toEqual([{ n: 1, passed: false, region: 1 }]);
  });

  it('reads a file with no final newline as the same lines', async () => {
    const checks = await scored(unchanged(), [{ files: { 'src/tax.ts': SEED['src/tax.ts'].trimEnd() } }]);
    expect(checks[0]?.steps).toEqual([{ n: 1, passed: true }]);
  });

  it('needs no commit messages: a run stored before task-035 is still scored', async () => {
    const checks = await scored(unchanged(), [{ files: {} }], { withoutMessages: true });
    expect(checks[0]?.steps).toEqual([{ n: 1, passed: true }]);
  });
});
