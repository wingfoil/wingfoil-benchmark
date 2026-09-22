import { symlinkSync } from 'node:fs';
import { join } from 'node:path';

import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

// REQ-ARC-02: modules depend only downwards, and scoring and runner never import each other.
const eslint = new ESLint({ cwd: REPO_ROOT });
const RULE = 'bench/module-boundaries';

async function violations(file: string, source: string): Promise<number> {
  const [result] = await eslint.lintText(source, { filePath: `${REPO_ROOT}/${file}` });
  return (result?.messages ?? []).filter((message) => message.ruleId === RULE).length;
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
  // Loading typescript-eslint takes seconds on a cold start: do it once, outside the per-test timeout.
  beforeAll(async () => {
    await violations('src/core/warm-up.ts', '');
  }, 60_000);

  it.each(allowed)('%s may run: %s', async (file, source) => {
    expect(await violations(file, source)).toBe(0);
  });

  it.each(forbidden)('%s must not run: %s', async (file, source) => {
    expect(await violations(file, source)).toBe(1);
  });

  it('names the problem when a module imports src/ itself', async () => {
    const [result] = await eslint.lintText(reexport('..'), { filePath: `${REPO_ROOT}/src/core/a.ts` });
    expect(result?.messages.map((message) => message.message)).toEqual([
      "module 'core' must not import from outside its own module directory (REQ-ARC-02)",
    ]);
  });

  it('applies the rule when the repository is reached through a symbolic link', async () => {
    const link = join(tempDir('bench-link-'), 'repo');
    symlinkSync(REPO_ROOT, link);
    const linked = new ESLint({ cwd: link });
    const [result] = await linked.lintText(reexport('../scenario/index.js'), {
      filePath: join(link, 'src/core/a.ts'),
    });
    expect((result?.messages ?? []).filter((message) => message.ruleId === RULE)).toHaveLength(1);
  }, 60_000);
});
