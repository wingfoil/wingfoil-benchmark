import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/**
 * The scoring image's `quality.mjs` (REQ-SCO-04 as amended in 1.16, task-041), run on this machine with
 * the same pinned tools: ESLint with the benchmark's configuration, jscpd's binary, c8 over `npm test`.
 * `npm run test:docker` runs it in the real image.
 */

function snapshot(files: Readonly<Record<string, string>>): string {
  const root = tempDir('bench-quality-snap-');
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

interface Measure {
  lint: { findings: number; lines: number };
  complexity: { functions: number; sum: number; max: number };
  duplication: { duplicated_lines: number; lines: number };
  coverage: { covered: number; total: number; tests: string };
}

function measure(root: string, measured: string[], coverageTargets: string[]): Measure {
  const result = spawnSync(
    process.execPath,
    [repoPath('docker/score-image/quality.mjs'), root, JSON.stringify({ measured, coverageTargets })],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(`quality.mjs exited ${result.status}: ${result.stderr}`);
  return JSON.parse(result.stdout) as Measure;
}

const BRANCHY =
  '/** Sign. */\nexport function sign(n: number): number {\n  if (n > 0) return 1;\n  if (n < 0) return -1;\n  return 0;\n}\n\n' +
  '/** Twice. */\nexport const twice = (n: number): number => n * 2;\n';
const TESTED =
  "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { sign } from '../src/sign.ts';\n\n" +
  "test('sign of a positive number', () => {\n  assert.equal(sign(3), 1);\n});\n";

describe('quality.mjs (REQ-SCO-04, task-041)', { timeout: 120_000 }, () => {
  it("reads each function's complexity, and counts lint findings on the measured lines", () => {
    const root = snapshot({
      'package.json': '{ "type": "module" }\n',
      'src/sign.ts': BRANCHY,
      'src/loose.ts': '/** Loose. */\nexport function loose(): void {\n  debugger;\n}\n',
    });
    const result = measure(root, ['src/loose.ts', 'src/sign.ts'], []);
    expect(result.complexity).toEqual({ functions: 3, sum: 5, max: 3 });
    expect(result.lint).toEqual({ findings: 1, lines: 13 });
  });

  it("applies the benchmark's configuration, never the project's", () => {
    const root = snapshot({
      'package.json': '{ "type": "module" }\n',
      'eslint.config.js': 'export default [{ rules: { "no-debugger": "off" } }, { ignores: ["**/*"] }];\n',
      'src/loose.ts': '/** Loose. */\nexport function loose(): void {\n  debugger;\n}\n',
    });
    expect(measure(root, ['src/loose.ts'], []).lint.findings).toBe(1);
  });

  it('counts a file that does not parse as one finding', () => {
    const root = snapshot({ 'package.json': '{}\n', 'src/broken.ts': 'export const = ;\n' });
    expect(measure(root, ['src/broken.ts'], []).lint).toEqual({ findings: 1, lines: 1 });
  });

  it('measures duplicated lines among the measured files', () => {
    const block = Array.from(
      { length: 12 },
      (_, index) =>
        `export function f${index}(a: number, b: number): number {\n  return a * ${index} + b - ${index};\n}\n`,
    ).join('');
    const root = snapshot({ 'package.json': '{}\n', 'src/a.ts': block, 'src/b.ts': block });
    const { duplication } = measure(root, ['src/a.ts', 'src/b.ts'], []);
    expect(duplication.lines).toBe(72);
    expect(duplication.duplicated_lines).toBeGreaterThan(0);
  });

  it("covers the targets through the project's own npm test, under c8", () => {
    const root = snapshot({
      'package.json': '{ "type": "module", "scripts": { "test": "node --test \\"test/*.test.ts\\"" } }\n',
      'src/sign.ts': BRANCHY,
      'test/sign.test.ts': TESTED,
    });
    const { coverage } = measure(root, ['src/sign.ts', 'test/sign.test.ts'], ['src/sign.ts']);
    expect(coverage.tests).toBe('passed');
    expect(coverage.total).toBeGreaterThan(0);
    expect(coverage.covered).toBeGreaterThan(0);
    expect(coverage.covered).toBeLessThan(coverage.total);
  });

  it('counts coverage when the tests fail too, and says so', () => {
    const root = snapshot({
      'package.json': '{ "type": "module", "scripts": { "test": "node --test \\"test/*.test.ts\\"" } }\n',
      'src/sign.ts': BRANCHY,
      'test/sign.test.ts': TESTED.replace('sign(3), 1', 'sign(3), 2'),
    });
    const { coverage } = measure(root, ['src/sign.ts'], ['src/sign.ts']);
    expect(coverage.tests).toBe('failed');
    expect(coverage.covered).toBeGreaterThan(0);
  });

  it('covers nothing in a project with no test script, and still counts the targets', () => {
    const root = snapshot({ 'package.json': '{ "type": "module" }\n', 'src/sign.ts': BRANCHY });
    const { coverage } = measure(root, ['src/sign.ts'], ['src/sign.ts']);
    expect(coverage).toEqual({ covered: 0, total: expect.any(Number), tests: 'none' });
    expect(coverage.total).toBeGreaterThan(0);
  });

  it('says the same thing twice (REQ-SCO-03)', () => {
    const root = snapshot({
      'package.json': '{ "type": "module", "scripts": { "test": "node --test \\"test/*.test.ts\\"" } }\n',
      'src/sign.ts': BRANCHY,
      'test/sign.test.ts': TESTED,
    });
    const files = [['src/sign.ts', 'test/sign.test.ts'], ['src/sign.ts']] as const;
    expect(measure(root, [...files[0]], [...files[1]])).toEqual(measure(root, [...files[0]], [...files[1]]));
  });
});
