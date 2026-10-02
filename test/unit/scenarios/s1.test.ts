import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import type { Scenario } from '../../../src/core/index.js';
import { loadScenario } from '../../../src/scenario/index.js';
import { runSuite } from '../../../src/scoring/index.js';
import type { SuiteReport } from '../../../src/scoring/index.js';
import { localScoringDocker } from '../../support/local-scoring.js';
import { repoPath } from '../../support/paths.js';
import { referenceSnapshot } from '../../support/reference.js';
import { tempDir } from '../../support/scenario-fixture.js';

const REFERENCE = repoPath('test/fixtures/reference/S1');

/** S1@1.0 as the repository holds it (F6.1). */
function s1(root = repoPath('scenarios')): Scenario {
  const loaded = loadScenario(root, 'S1', '1.0');
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  return loaded.value;
}

/** One suite of S1 on `snapshot`, run for real by the local scoring double. */
async function score(scenario: Scenario, id: string, snapshot: string): Promise<SuiteReport> {
  const suite = scenario.oracle.suites.find((candidate) => candidate.id === id);
  if (suite === undefined) throw new Error(`no suite ${id}`);
  const report = await runSuite({
    docker: localScoringDocker(),
    image: 'local',
    container: `s1-${id}`,
    scenario,
    suite,
    snapshotDir: snapshot,
  });
  if (!report.ok) throw new Error(JSON.stringify(report.issues));
  return report.value;
}

/** How many tests reported each status, and whether a file failed as a whole. */
function tally(report: SuiteReport): Record<string, number> {
  const counts: Record<string, number> = { pass: 0, fail: 0, skip: 0, files: report.failedFiles.length };
  for (const test of report.tests) counts[test.status] = (counts[test.status] ?? 0) + 1;
  return counts;
}

/** The census of each suite (adr-004): what its tests count on any snapshot. */
const COUNTED = { pointer: 12, patch: 92 + 16, 'merge-patch': 15, 'create-patch': 30 };
const DISABLED = { pointer: 0, patch: 3 + 1, 'merge-patch': 0, 'create-patch': 0 };
/** The suites scored up to step 4, before `createPatch` (task-050). */
const UP_TO_STEP_4 = ['pointer', 'patch', 'merge-patch'] as const;

// The hidden tests really run, one Node process per suite and snapshot: seconds, not milliseconds, and
// more under a full run's load (as S2's and S3's).
describe('S1@1.0 (F6.1)', { timeout: 120_000 }, () => {
  let scenario: Scenario;
  beforeAll(() => {
    scenario = s1();
  });

  it("declares S1.md's card: C and D, its questions, no capability, a hold-out", () => {
    expect(scenario.categories).toEqual({ primary: 'C', secondary: ['D'] });
    expect(scenario.profiles).toEqual(['solo-developer', 'team-developer']);
    expect(scenario.gqm).toEqual(['Q-C1', 'Q-C2', 'Q-D3', 'G-X1', 'G-X2']);
    expect(scenario.capabilities).toEqual([]);
    expect(scenario.holdout).toBe(true);
    expect(scenario.steps.map((step) => step.n)).toEqual([1, 2, 3, 4, 5]);
  });

  it('binds Pointer to step 1, Patch to steps 2–5, Merge Patch to steps 4–5 and createPatch to step 5 (§6)', () => {
    expect(scenario.oracle.suites.map(({ id, afterSteps }) => ({ id, afterSteps }))).toEqual([
      { id: 'pointer', afterSteps: [1] },
      { id: 'patch', afterSteps: [2, 3, 4, 5] },
      { id: 'merge-patch', afterSteps: [4, 5] },
      { id: 'create-patch', afterSteps: [5] },
    ]);
  });

  it('pins the conformance suite by its commit and the RFC examples by their sha256 (dl-002)', () => {
    const pins = scenario.oracle.thirdParty.map(({ license, pin, files }) => ({
      license,
      pin: 'commit' in pin ? pin.commit : 'sha256',
      files: files.map((file) => relative(scenario.dir, file)),
    }));
    expect(pins).toEqual([
      {
        license: 'Apache-2.0',
        pin: '2a928f9044aad35c74e2788d498bcf2c6b91adea',
        files: ['oracle/patch/tests.json', 'oracle/patch/spec_tests.json'],
      },
      { license: 'BSD-3-Clause', pin: 'sha256', files: ['oracle/pointer/rfc6901-section5.json'] },
      { license: 'BSD-3-Clause', pin: 'sha256', files: ['oracle/merge-patch/rfc7386-appendix-a.json'] },
    ]);
  });

  it('carries the notices its third-party licenses require, beside the oracle and outside every suite', () => {
    const notice = readFileSync(join(scenario.dir, 'oracle/licenses/NOTICE.md'), 'utf8');
    for (const entry of scenario.oracle.thirdParty) {
      for (const file of entry.files) expect(notice).toContain(relative(scenario.dir, file));
      expect(notice).toContain(entry.license);
    }
    expect(readFileSync(join(scenario.dir, 'oracle/licenses/Apache-2.0.txt'), 'utf8')).toMatch(
      /Apache License\s+Version 2\.0/,
    );
    const bsd = readFileSync(join(scenario.dir, 'oracle/licenses/BSD-3-Clause-IETF.txt'), 'utf8');
    expect(bsd).toContain('Copyright (c) 2013 IETF Trust and the persons identified as the document authors');
    expect(bsd).toContain('Copyright (c) 2014 IETF Trust and the persons identified as the document authors');
  });

  it('refuses an RFC example changed after it was pinned', () => {
    const root = tempDir('bench-s1-');
    const copy = join(root, 'S1', '1.0');
    cpSync(scenario.dir, copy, { recursive: true });
    const file = join(copy, 'oracle/merge-patch/rfc7386-appendix-a.json');
    writeFileSync(file, readFileSync(file, 'utf8').replace('"a"', '"z"'));
    expect(loadScenario(root, 'S1', '1.0')).toMatchObject({
      ok: false,
      issues: [{ path: 'oracle.third_party[2].sha256' }],
    });
  });

  it.each(Object.entries(COUNTED))(
    'passes no test of %s on the seed, and counts each case once (adr-004 decision 10)',
    async (id, counted) => {
      const report = await score(scenario, id, referenceSnapshot(scenario.seedDir, REFERENCE, 0));
      expect(tally(report)).toEqual({
        pass: 0,
        fail: counted,
        skip: DISABLED[id as keyof typeof DISABLED],
        files: 0,
      });
      const names = report.tests.map((test) => [test.file, ...test.path].join(' > '));
      expect(new Set(names).size).toBe(names.length);
    },
  );

  it('passes every Pointer example after the reference step 1', async () => {
    const report = await score(scenario, 'pointer', referenceSnapshot(scenario.seedDir, REFERENCE, 1));
    expect(tally(report)).toMatchObject({ pass: COUNTED.pointer, fail: 0 });
  });

  it('leaves Patch cases for step 3 to fix, and passes them all after it (§6)', async () => {
    const two = tally(await score(scenario, 'patch', referenceSnapshot(scenario.seedDir, REFERENCE, 2)));
    const three = tally(await score(scenario, 'patch', referenceSnapshot(scenario.seedDir, REFERENCE, 3)));
    expect(two.fail).toBeGreaterThan(0);
    expect(two.pass).toBeGreaterThan(COUNTED.patch / 2);
    expect(three).toMatchObject({ pass: COUNTED.patch, fail: 0 });
  });

  it('passes every suite up to step 4 after the reference step 4: no regression, and Merge Patch', async () => {
    const snapshot = referenceSnapshot(scenario.seedDir, REFERENCE, 4);
    for (const id of UP_TO_STEP_4) {
      expect(tally(await score(scenario, id, snapshot))).toMatchObject({ pass: COUNTED[id], fail: 0 });
    }
  });

  it('passes every suite after the reference step 5: no regression, and every createPatch pair (task-050)', async () => {
    const snapshot = referenceSnapshot(scenario.seedDir, REFERENCE, 5);
    for (const [id, counted] of Object.entries(COUNTED)) {
      expect(tally(await score(scenario, id, snapshot))).toMatchObject({ pass: counted, fail: 0 });
    }
  });

  it('fails the pairs whose bound a whole-document replace passes, when createPatch replaces the root (P2)', async () => {
    const snapshot = referenceSnapshot(scenario.seedDir, REFERENCE, 5);
    const index = join(snapshot, 'src', 'index.ts');
    writeFileSync(
      index,
      readFileSync(index, 'utf8').replace(
        /export \{ createPatch \} from '\.\/create-patch\.js';/,
        'export function createPatch(_from: unknown, to: unknown): unknown {\n' +
          "  return [{ op: 'replace', path: '', value: to }];\n" +
          '}',
      ),
    );
    const pairs = JSON.parse(
      readFileSync(join(scenario.dir, 'oracle/create-patch/pairs.json'), 'utf8'),
    ) as Pair[];
    const bounded = pairs.filter(
      (pair) => JSON.stringify([{ op: 'replace', path: '', value: pair.to }]).length > pair.max,
    );
    expect(bounded.length).toBeGreaterThanOrEqual(20);
    expect(tally(await score(scenario, 'create-patch', snapshot)).fail).toBe(bounded.length);
  });

  it('fails the Patch cases with a result when applyPatch mutates its input (§4, the non-mutation check)', async () => {
    const snapshot = referenceSnapshot(scenario.seedDir, REFERENCE, 3);
    const index = join(snapshot, 'src', 'index.ts');
    writeFileSync(
      index,
      readFileSync(index, 'utf8').replace(
        /export \{ applyPatch \} from '\.\/patch\.js';/,
        "import { applyPatch as apply } from './patch.js';\n" +
          'export function applyPatch(document: unknown, patch: unknown): unknown {\n' +
          "  if (document !== null && typeof document === 'object') (document as { touched?: boolean }).touched = true;\n" +
          '  return apply(document, patch as never);\n' +
          '}',
      ),
    );
    const cases = [
      ...(JSON.parse(readFileSync(join(scenario.dir, 'oracle/patch/tests.json'), 'utf8')) as Case[]),
      ...(JSON.parse(readFileSync(join(scenario.dir, 'oracle/patch/spec_tests.json'), 'utf8')) as Case[]),
    ];
    const mutable = cases.filter(
      (entry) => entry.disabled !== true && entry.error === undefined && isObject(entry.doc),
    ).length;
    expect(tally(await score(scenario, 'patch', snapshot)).fail).toBeGreaterThanOrEqual(mutable);
  });
});

interface Pair {
  readonly to: unknown;
  readonly max: number;
}

interface Case {
  readonly doc?: unknown;
  readonly error?: string;
  readonly disabled?: boolean;
}

function isObject(value: unknown): boolean {
  return value !== null && typeof value === 'object';
}
