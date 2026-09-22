import { symlinkSync } from 'node:fs';
import { join } from 'node:path';

import { ESLint, Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

import { moduleBoundaries } from '../../../eslint/module-boundaries.js';
import { REPO_ROOT } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

// REQ-ARC-02: modules depend only downwards, and scoring and runner never import each other.
const RULE = 'bench/module-boundaries';
const SRC_ROOT = join(REPO_ROOT, 'src');

/** The rule alone, run in-process on `source` as if it were `file` (relative to `root`). */
function lint(file: string, source: string, root = REPO_ROOT): Linter.LintMessage[] {
  const config: Linter.Config = {
    files: ['**/*.{ts,mts}'],
    languageOptions: { parser: tseslint.parser as Linter.Parser },
    plugins: { bench: { rules: { 'module-boundaries': moduleBoundaries } } },
    rules: { [RULE]: ['error', { srcRoot: SRC_ROOT }] },
  };
  return new Linter({ configType: 'flat', cwd: root }).verify(source, config, join(root, file));
}

function violations(file: string, source: string): number {
  return lint(file, source).filter((message) => message.ruleId === RULE).length;
}

const reexport = (target: string) => `export * from '${target}';\n`;

const allowed: [string, string][] = [
  ['src/scenario/a.ts', reexport('../core/index.js')],
  ['src/campaign/a.ts', reexport('../core/index.js')],
  ['src/runner/a.ts', reexport('../campaign/index.js')],
  ['src/runner/a.ts', reexport('../agents/index.js')],
  ['src/scoring/a.ts', reexport('../results/index.js')],
  ['src/cli/a.ts', reexport('../runner/index.js')],
  ['src/cli/a.ts', reexport('../scoring/index.js')],
  ['src/core/a.ts', reexport('./result.js')],
  ['src/core/a.ts', reexport('./scenario/sub.js')],
  ['src/runner/a.ts', reexport('./scoring/x.js')],
  ['src/runner/sub/a.ts', reexport('../../core/index.js')],
  ['src/core/a.ts', reexport('agents')],
  ['src/core/a.ts', reexport('node:path')],
];

const forbidden: [string, string][] = [
  ['src/core/a.ts', reexport('../scenario/index.js')],
  ['src/core/a.ts', reexport('../cli/index.js')],
  ['src/scenario/a.ts', reexport('../campaign/index.js')],
  ['src/campaign/a.ts', reexport('../runner/index.js')],
  ['src/agents/a.ts', reexport('../cli/index.js')],
  ['src/runner/a.ts', reexport('../scoring/index.js')],
  ['src/scoring/a.ts', reexport('../runner/index.js')],
  ['src/site/a.ts', reexport('../cli/index.js')],
  ['src/runner/sub/a.ts', reexport('../../scoring/index.js')],
  ['src/core/a.ts', `export const m = import('../scenario/index.js');\n`],
  ['src/core/a.ts', `import type { X } from '../scenario/index.js';\nexport type Y = X;\n`],
  ['src/runner/a.ts', reexport('../core/scenario.js')],
  ['src/core/a.ts', reexport('../util/x.js')],
  ['src/x.ts', reexport('./runner/index.js')],
  ['src/core/a.mts', reexport('../scenario/index.js')],
  ['src/core/a.ts', reexport(`${REPO_ROOT}src/scenario/index.js`)],
  ['src/core/a.ts', `export type T = import('../scenario/index.js').X;\n`],
  ['src/core/a.ts', 'export const m = import(`../scenario/index.js`);\n'],
];

describe('REQ-ARC-02 dependency rule', () => {
  it.each(allowed)('%s may run: %s', (file, source) => {
    expect(violations(file, source)).toBe(0);
  });

  it.each(forbidden)('%s must not run: %s', (file, source) => {
    expect(violations(file, source)).toBe(1);
  });

  it('names the problem when a module imports src/ itself', () => {
    expect(lint('src/core/a.ts', reexport('..')).map((message) => message.message)).toEqual([
      "module 'core' must not import from outside its own module directory (REQ-ARC-02)",
    ]);
  });

  it('applies the rule when the repository is reached through a symbolic link', () => {
    const link = join(tempDir('bench-link-'), 'repo');
    symlinkSync(REPO_ROOT, link);
    expect(lint('src/core/a.ts', reexport('../scenario/index.js'), link)).toHaveLength(1);
  });
});

describe('REQ-ARC-02 dependency rule in the project configuration', () => {
  const eslint = new ESLint({ cwd: REPO_ROOT });

  async function projectViolations(file: string, source: string): Promise<number> {
    const [result] = await eslint.lintText(source, { filePath: join(REPO_ROOT, file) });
    return (result?.messages ?? []).filter((message) => message.ruleId === RULE).length;
  }

  // Loading typescript-eslint takes seconds on a cold start: allow for it in this one test.
  it('reports forbidden imports in src/ and leaves tests alone', async () => {
    expect(await projectViolations('src/core/a.ts', reexport('../scenario/index.js'))).toBe(1);
    expect(await projectViolations('src/core/a.mts', reexport('../scenario/index.js'))).toBe(1);
    expect(await projectViolations('test/unit/a.test.ts', reexport('../../src/core/scenario.js'))).toBe(0);
  }, 60_000);
});
