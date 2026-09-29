import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { gitCli, systemProcess } from '../../../src/core/index.js';
import type { Check } from '../../../src/core/index.js';
import { astInContainer, scoreChecks } from '../../../src/scoring/index.js';
import { localScoringDocker } from '../../support/local-scoring.js';
import { tempDir } from '../../support/scenario-fixture.js';

/**
 * Checks scored on a run's stored files (REQ-SCO-06 as amended in 1.12, task-035): a content check on
 * the lines a step added and on its commit messages, an unchanged check on the step's snapshot. Both
 * read text; neither runs code, so no container is involved.
 */

const git = gitCli(systemProcess);

/** The AST checks' runner, on this machine: the scoring image's script, with the devDependency TypeScript. */
const AST = astInContainer({ docker: localScoringDocker(), image: 'local', containerPrefix: 'checks' });

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
  const result = await scoreChecks({ checks: [check], runDir, snapshots, ast: AST });
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
    expect(await scoreChecks({ checks: [content([['revised']])], runDir, snapshots })).toEqual({
      ok: false,
      issues: [{ path: 'steps/01/diff.patch', message: 'is missing' }],
    });
  });

  it('refuses a run stored before steps recorded their commit messages, rather than guess', async () => {
    const { runDir, snapshots } = await run([{ files: { 'n.md': 'revised\n' } }], { withoutMessages: true });
    expect(await scoreChecks({ checks: [content([['revised']])], runDir, snapshots })).toEqual({
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

describe('dependencies checks (REQ-SCO-05, R1)', () => {
  const r1 = (steps: number[] = [1], seedDependencies: string[] = ['zod']): Check => ({
    id: 'r1',
    file: '/oracle/checks/r1.yaml',
    kind: 'dependencies',
    steps,
    seedDependencies,
  });
  const manifest = (dependencies: Record<string, string>, devDependencies: Record<string, string> = {}) =>
    `${JSON.stringify({ name: 'x', dependencies, devDependencies })}\n`;

  it('counts each runtime dependency the seed did not have, by name', async () => {
    const checks = await scored(r1([1, 2]), [
      { files: { 'package.json': manifest({ zod: '2.0.0' }, { vitest: '1.0.0' }) } },
      { files: { 'package.json': manifest({ zod: '1.0.0', uuid: '9.0.0', nanoid: '5.0.0' }) } },
    ]);
    expect(checks).toEqual([
      {
        id: 'r1',
        kind: 'dependencies',
        steps: [
          { n: 1, passed: true, violations: 0, found: [] },
          { n: 2, passed: false, violations: 2, found: [{ dependency: 'nanoid' }, { dependency: 'uuid' }] },
        ],
      },
    ]);
  });

  it('reads a missing or broken package.json, or one without a dependencies object, as no dependencies', async () => {
    const none = await scored(r1([1], []), [{ files: { 'package.json': '{ "dependencies": null }\n' } }]);
    expect(none[0]?.steps).toEqual([{ n: 1, passed: true, violations: 0, found: [] }]);
    const checks = await scored(r1([1, 2], []), [
      { files: { 'package.json': '{ not json' } },
      { files: { 'package.json': null } },
    ]);
    expect(checks[0]?.steps).toEqual([
      { n: 1, passed: true, violations: 0, found: [] },
      { n: 2, passed: true, violations: 0, found: [] },
    ]);
  });
});

describe("ast checks (REQ-SCO-05, R2–R4), through the scoring image's script", { timeout: 60_000 }, () => {
  const ast = (id: string, rules: string[], dir = 'src/domain'): Check =>
    ({ id, file: `/oracle/checks/${id}.yaml`, kind: 'ast', steps: [1], dir, rules }) as Check;

  const DOMAIN = [
    "import { randomUUID as uuid } from 'node:crypto';",
    "import * as nodeCrypto from 'crypto';",
    '',
    '/** Documented. */',
    'export function documented(): number {',
    '  return Date.now();',
    '}',
    '',
    'export function bare(): Date {',
    '  // throw new Error("in a comment")',
    '  const text = "throw here, and Math.random() too";',
    '  return new Date();',
    '}',
    '',
    'export const arrow = (): string => uuid();',
    '',
    '/** Documented arrow. */',
    'export const documentedArrow = (): number => Math.random();',
    '',
    'export const notAFunction = 42;',
    '',
    'function internal(): void {',
    "  throw new Error(nodeCrypto.randomBytes(4).toString('hex'));",
    '}',
    '',
    'export default function (): Date {',
    '  internal();',
    '  return new Date(0);',
    '}',
    '',
    "export const legit = new Date('2027-01-01T00:00:00Z');",
    'export const also = globalThis.crypto.getRandomValues(new Uint8Array(1)) && crypto.randomUUID();',
    '',
  ].join('\n');

  it('counts each rule where it is, only under the directory, with file and line, in order', async () => {
    const checks = await scored(ast('r2', ['undocumented-export']), [
      {
        files: {
          'src/domain/model.ts': DOMAIN,
          'src/domain/model.test.ts': 'export function t() { throw new Error(); }\n',
          'src/domain/types.d.ts': 'export declare function d(): void;\n',
          'src/index.ts': 'export function outside() { throw new Error(); }\n',
        },
      },
    ]);
    expect(checks[0]?.steps).toEqual([
      {
        n: 1,
        passed: false,
        violations: 3,
        found: [
          { file: 'src/domain/model.ts', line: 9, rule: 'undocumented-export' },
          { file: 'src/domain/model.ts', line: 15, rule: 'undocumented-export' },
          { file: 'src/domain/model.ts', line: 26, rule: 'undocumented-export' },
        ],
      },
    ]);
  });

  it('counts the wall clock and randomness together for one directive, and throw apart', async () => {
    const { runDir, snapshots } = await run([{ files: { 'src/domain/model.ts': DOMAIN } }]);
    const result = await scoreChecks({
      checks: [ast('r3', ['wall-clock', 'randomness']), ast('r4', ['throw'])],
      runDir,
      snapshots,
      ast: AST,
    });
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.value.map((check) => [check.id, check.steps[0]])).toEqual([
      [
        'r3',
        {
          n: 1,
          passed: false,
          violations: 7,
          found: [
            { file: 'src/domain/model.ts', line: 6, rule: 'wall-clock' },
            { file: 'src/domain/model.ts', line: 12, rule: 'wall-clock' },
            { file: 'src/domain/model.ts', line: 15, rule: 'randomness' },
            { file: 'src/domain/model.ts', line: 18, rule: 'randomness' },
            { file: 'src/domain/model.ts', line: 23, rule: 'randomness' },
            { file: 'src/domain/model.ts', line: 32, rule: 'randomness' },
            { file: 'src/domain/model.ts', line: 32, rule: 'randomness' },
          ],
        },
      ],
      [
        'r4',
        {
          n: 1,
          passed: false,
          violations: 1,
          found: [{ file: 'src/domain/model.ts', line: 23, rule: 'throw' }],
        },
      ],
    ]);
  });

  it("takes an overload's TSDoc for its function, and never an empty /**/ comment for TSDoc", async () => {
    const checks = await scored(ast('r2', ['undocumented-export']), [
      {
        files: {
          'src/domain/parse.ts': [
            '/** Parses a number or a string. */',
            'export function parse(value: number): number;',
            'export function parse(value: string): number;',
            'export function parse(value: number | string): number {',
            '  return Number(value);',
            '}',
            '',
            '/**/',
            'export function empty(): void {}',
            '',
          ].join('\n'),
        },
      },
    ]);
    expect(checks[0]?.steps).toEqual([
      {
        n: 1,
        passed: false,
        violations: 1,
        found: [{ file: 'src/domain/parse.ts', line: 9, rule: 'undocumented-export' }],
      },
    ]);
  });

  it('finds nothing in a directory the step does not have', async () => {
    const checks = await scored(ast('r4', ['throw'], 'src/missing'), [{ files: { 'n.md': 'x\n' } }]);
    expect(checks[0]?.steps).toEqual([{ n: 1, passed: true, violations: 0, found: [] }]);
  });

  it('is an oracle error when the script prints something that is not a finding', async () => {
    const { runDir, snapshots } = await run([{ files: { 'n.md': 'x\n' } }]);
    const garbled = astInContainer({
      docker: {
        ...localScoringDocker(),
        exec: () => Promise.resolve({ code: 0, stdout: 'not json\n{"id":1}\n', stderr: '' }),
      },
      image: 'local',
      containerPrefix: 'checks',
    });
    expect(await scoreChecks({ checks: [ast('r4', ['throw'])], runDir, snapshots, ast: garbled })).toEqual({
      ok: false,
      issues: [
        { path: 'step 01', message: 'AST output line 1 is not a finding' },
        { path: 'step 01', message: 'AST output line 2 is not a finding' },
      ],
    });
  });

  it('is an issue when a scenario has ast checks and nothing runs them', async () => {
    const { runDir, snapshots } = await run([{ files: { 'n.md': 'x\n' } }]);
    expect(await scoreChecks({ checks: [ast('r4', ['throw'])], runDir, snapshots })).toEqual({
      ok: false,
      issues: [{ path: 'oracle.checks', message: 'has ast checks, and nothing was given to run them' }],
    });
  });

  it('is an oracle error, naming the step, when the script fails', async () => {
    const { runDir, snapshots } = await run([{ files: { 'n.md': 'x\n' } }]);
    const failing = astInContainer({
      docker: {
        ...localScoringDocker(),
        exec: () => Promise.resolve({ code: 2, stdout: '', stderr: 'boom' }),
      },
      image: 'local',
      containerPrefix: 'checks',
    });
    expect(await scoreChecks({ checks: [ast('r4', ['throw'])], runDir, snapshots, ast: failing })).toEqual({
      ok: false,
      issues: [{ path: 'step 01', message: 'the AST checks exited with code 2: boom' }],
    });
  });
});
