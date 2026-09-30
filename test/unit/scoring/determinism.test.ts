import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { DockerPort } from '../../../src/core/index.js';
import {
  determinismPaths,
  interfaceFiles,
  interfaceInContainer,
  parseInterface,
} from '../../../src/scoring/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

function snapshot(files: readonly string[]): string {
  const root = tempDir('bench-determinism-snap-');
  for (const path of files) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), 'x\n');
  }
  return root;
}

const SETUP_PATCH =
  'diff --git a/CLAUDE.md b/CLAUDE.md\nnew file mode 100644\n--- /dev/null\n+++ b/CLAUDE.md\n@@ -0,0 +1 @@\n+The manual.\n' +
  'diff --git a/.wingfoil/dna.yaml b/.wingfoil/dna.yaml\n';

describe('determinismPaths (M-R3, REQ-SCO-07 as amended in 1.17, task-042)', () => {
  it("is every file of the snapshot less the setup's paths and the generated ones, sorted", () => {
    const root = snapshot([
      'package.json',
      'src/b.ts',
      'src/a.ts',
      'CLAUDE.md',
      '.wingfoil/dna.yaml',
      'package-lock.json',
      'packages/x/yarn.lock',
      'pnpm-lock.yaml',
      'npm-shrinkwrap.json',
      'dist/index.js',
      'packages/x/build/out.js',
      'coverage/lcov.info',
      'tsconfig.tsbuildinfo',
      'node_modules/y/index.js',
      'distant/keep.ts',
    ]);
    expect(determinismPaths({ snapshot: root, setupPatch: SETUP_PATCH })).toEqual([
      'distant/keep.ts',
      'package.json',
      'src/a.ts',
      'src/b.ts',
    ]);
  });
});

describe('interfaceFiles (M-R2, task-042)', () => {
  it('is the TypeScript sources among the paths, less declaration files and tests', () => {
    expect(
      interfaceFiles([
        'README.md',
        'src/a.ts',
        'src/a.test.ts',
        'src/b.d.ts',
        'src/c.mts',
        'src/d.tsx',
        'src/e.js',
      ]),
    ).toEqual(['src/a.ts', 'src/c.mts', 'src/d.tsx']);
  });
});

describe('parseInterface (task-042)', () => {
  it('reads one JSON string per line', () => {
    expect(parseInterface('"a.ts: export const a;"\n"b.ts: export const b;"\n')).toEqual({
      ok: true,
      value: ['a.ts: export const a;', 'b.ts: export const b;'],
    });
  });

  it('is an oracle error on a line that is not JSON', () => {
    expect(parseInterface('not json\n')).toEqual({
      ok: false,
      issues: [{ path: 'final', message: 'interface output line 1 is not an entry' }],
    });
  });

  it('is an oracle error on a line that is not one', () => {
    expect(parseInterface('"a"\n{"no": 1}\n')).toEqual({
      ok: false,
      issues: [{ path: 'final', message: 'interface output line 2 is not an entry' }],
    });
  });
});

describe('interfaceInContainer (task-042)', () => {
  it('is an oracle error when the script exits other than 0, and removes its container all the same', async () => {
    const removed: string[] = [];
    const unused = (): never => {
      throw new Error('not a scoring call');
    };
    const docker: DockerPort = {
      build: () => Promise.resolve(),
      createScoring: () => Promise.resolve('c1'),
      start: () => Promise.resolve(),
      copyTo: () => Promise.resolve(),
      exec: () => Promise.resolve({ code: 124, stdout: '', stderr: 'killed\n' }),
      remove: (container) => {
        removed.push(container);
        return Promise.resolve();
      },
      create: unused,
      runOnce: unused,
      mountsOf: unused,
      containersNamed: unused,
    };
    const run = interfaceInContainer({ docker, image: 'bench-score:x', containerPrefix: 'p' });
    expect(await run({ snapshot: '/tmp/none', files: ['a.ts'] })).toEqual({
      ok: false,
      issues: [{ path: 'final', message: 'the interface extraction exited with code 124: killed' }],
    });
    expect(removed).toEqual(['c1']);
  });
});
