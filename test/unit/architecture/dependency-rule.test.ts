import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// REQ-ARC-02: modules depend only downwards, and scoring and runner never import each other.
const eslint = new ESLint();

async function restrictedImports(file: string, source: string): Promise<number> {
  const [result] = await eslint.lintText(source, { filePath: file });
  return (result?.messages ?? []).filter((message) => message.ruleId === 'no-restricted-imports').length;
}

const allowed: [string, string][] = [
  ['src/scenario/a.ts', '../core/index.js'],
  ['src/campaign/a.ts', '../core/index.js'],
  ['src/runner/a.ts', '../campaign/index.js'],
  ['src/runner/a.ts', '../agents/index.js'],
  ['src/scoring/a.ts', '../results/index.js'],
  ['src/cli/a.ts', '../runner/index.js'],
  ['src/cli/a.ts', '../scoring/index.js'],
  ['src/core/a.ts', './result.js'],
];

const forbidden: [string, string][] = [
  ['src/core/a.ts', '../scenario/index.js'],
  ['src/core/a.ts', '../cli/index.js'],
  ['src/scenario/a.ts', '../campaign/index.js'],
  ['src/campaign/a.ts', '../runner/index.js'],
  ['src/agents/a.ts', '../cli/index.js'],
  ['src/runner/a.ts', '../scoring/index.js'],
  ['src/scoring/a.ts', '../runner/index.js'],
  ['src/site/a.ts', '../cli/index.js'],
];

describe('REQ-ARC-02 dependency rule', () => {
  it.each(allowed)('%s may import %s', async (file, target) => {
    expect(await restrictedImports(file, `export * from '${target}';\n`)).toBe(0);
  });

  it.each(forbidden)('%s must not import %s', async (file, target) => {
    expect(await restrictedImports(file, `export * from '${target}';\n`)).toBe(1);
  });
});
