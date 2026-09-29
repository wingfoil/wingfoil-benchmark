import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { DockerPort, ProcessResult } from '../../../src/core/index.js';
import { measuredFiles, parseQuality, qualityInContainer } from '../../../src/scoring/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

/**
 * M-Q2 on the host's side (REQ-SCO-04, task-041): which files a run changed, what the image's
 * `quality.mjs` said of them, and the container it ran in.
 */

function tree(files: Readonly<Record<string, string>>): string {
  const root = tempDir('bench-quality-');
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const SEED = {
  'package.json': '{ "type": "module" }\n',
  'src/list.ts': 'export const list = [];\n',
  'src/kept.ts': 'export const kept = 1;\n',
  'README.md': '# Seed\n',
};

describe('measuredFiles (REQ-SCO-04 as amended in 1.16)', () => {
  it('measures the source files the run added or changed; tests are measured but not coverage targets', () => {
    const snapshot = tree({
      ...SEED,
      'src/list.ts': 'export const list = [1];\n',
      'src/add.mts': 'export const add = 1;\n',
      'src/view.tsx': 'export const view = 1;\n',
      'lib/tool.cjs': 'module.exports = 1;\n',
      'test/list.test.ts': "import './x';\n",
      'src/add.spec.ts': "import './x';\n",
      'src/__tests__/deep.ts': "import './x';\n",
      'tests/more.ts': "import './x';\n",
      'NOTES.md': 'Changed.\n',
    });
    expect(measuredFiles({ seedDir: tree(SEED), snapshot, setupPatch: '' })).toEqual({
      measured: [
        'lib/tool.cjs',
        'src/__tests__/deep.ts',
        'src/add.mts',
        'src/add.spec.ts',
        'src/list.ts',
        'src/view.tsx',
        'test/list.test.ts',
        'tests/more.ts',
      ],
      coverageTargets: ['lib/tool.cjs', 'src/add.mts', 'src/list.ts', 'src/view.tsx'],
    });
  });

  it('leaves out declaration files, node_modules, and every path the setup touched, whatever the harness', () => {
    const snapshot = tree({
      ...SEED,
      'src/types.d.ts': 'export type T = 1;\n',
      'node_modules/dep/index.js': 'module.exports = 1;\n',
      '.harness/tool.js': 'module.exports = 1;\n',
      'src/kept.ts': 'export const kept = 2;\n',
      'src/new.ts': 'export const fresh = 1;\n',
    });
    const setupPatch =
      'diff --git a/.harness/tool.js b/.harness/tool.js\nnew file mode 100644\n--- /dev/null\n+++ b/.harness/tool.js\n' +
      'diff --git a/src/kept.ts b/src/kept.ts\nindex 1..2 100644\n--- a/src/kept.ts\n+++ b/src/kept.ts\n' +
      'diff --git "a/odd name.ts" "b/odd name.ts"\nnew file mode 100644\n';
    expect(measuredFiles({ seedDir: tree(SEED), snapshot, setupPatch })).toEqual({
      measured: ['src/new.ts'],
      coverageTargets: ['src/new.ts'],
    });
  });

  it('measures nothing for a run that changed no source file', () => {
    const snapshot = tree({ ...SEED, 'NOTES.md': 'Only notes.\n' });
    expect(measuredFiles({ seedDir: tree(SEED), snapshot, setupPatch: '' })).toEqual({
      measured: [],
      coverageTargets: [],
    });
  });
});

const LINE = {
  lint: { findings: 2, lines: 120 },
  complexity: { functions: 9, sum: 14, max: 4 },
  duplication: { duplicated_lines: 0, lines: 120 },
  coverage: { covered: 50, total: 80, tests: 'passed' },
};

describe('parseQuality', () => {
  it("reads quality.mjs's one line", () => {
    expect(parseQuality(`${JSON.stringify(LINE)}\n`)).toEqual({ ok: true, value: LINE });
  });

  it('refuses anything else, naming what is wrong', () => {
    const result = parseQuality('{"lint": {}}\n');
    expect(result.ok).toBe(false);
    expect(parseQuality('').ok).toBe(false);
    expect(
      parseQuality(`${JSON.stringify({ ...LINE, coverage: { ...LINE.coverage, tests: 'maybe' } })}\n`).ok,
    ).toBe(false);
  });
});

describe('qualityInContainer (REQ-SCO-01)', () => {
  function docker(answer: ProcessResult) {
    const calls: string[] = [];
    const unused = (): never => {
      throw new Error('not a scoring call');
    };
    const port: DockerPort = {
      build: unused,
      createScoring: (request) => {
        calls.push(`create ${request.name} ${request.readOnly.length} mounts`);
        return Promise.resolve('q-1');
      },
      start: () => Promise.resolve(),
      copyTo: (_container, _source, target) => {
        calls.push(`copy ${target}`);
        return Promise.resolve();
      },
      exec: (_container, command) => {
        calls.push(`exec ${command.join(' ')}`);
        return Promise.resolve(answer);
      },
      remove: (container) => {
        calls.push(`remove ${container}`);
        return Promise.resolve();
      },
      create: unused,
      runOnce: unused,
      mountsOf: unused,
      containersNamed: unused,
    };
    return { port, calls };
  }

  it("runs the image's quality.mjs on the final snapshot, with no mount, bounded, and removes the container", async () => {
    const { port, calls } = docker({ code: 0, stdout: `${JSON.stringify(LINE)}\n`, stderr: '' });
    const run = qualityInContainer({
      docker: port,
      image: 'bench-score:x',
      containerPrefix: 'bench-score-t',
    });
    const files = { measured: ['src/a.ts', 'test/a.test.ts'], coverageTargets: ['src/a.ts'] };
    expect(await run({ snapshot: '/snap', files })).toEqual({ ok: true, value: LINE });
    expect(calls).toEqual([
      'create bench-score-t-quality 0 mounts',
      'copy /score/snapshot',
      `exec timeout --kill-after=10 600 node /opt/score/quality.mjs snapshot ${JSON.stringify(files)}`,
      'remove q-1',
    ]);
  });

  it('is an oracle error when the script fails, and still removes the container', async () => {
    const { port, calls } = docker({ code: 1, stdout: '', stderr: 'boom\n' });
    const run = qualityInContainer({ docker: port, image: 'bench-score:x', containerPrefix: 'p' });
    expect(await run({ snapshot: '/snap', files: { measured: ['a.ts'], coverageTargets: [] } })).toEqual({
      ok: false,
      issues: [{ path: 'final', message: 'the static-quality measure exited with code 1: boom' }],
    });
    expect(calls.at(-1)).toBe('remove q-1');
  });
});
