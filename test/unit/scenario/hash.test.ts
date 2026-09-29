import { cpSync, mkdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadScenario, scenarioHash } from '../../../src/scenario/index.js';
import { repoPath } from '../../support/paths.js';
import { tempDir, writeScenario } from '../../support/scenario-fixture.js';

/** A copy of T3's version directory in a fresh place. */
function copy(): string {
  const dir = join(tempDir('bench-hash-'), 'T3', '1.0');
  cpSync(repoPath('test/fixtures/scenarios/T3/1.0'), dir, { recursive: true });
  return dir;
}

describe('scenarioHash (REQ-FMT-09)', () => {
  it('is a sha256 of the directory, the same wherever the directory is', () => {
    const a = scenarioHash(copy());
    expect(a).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(scenarioHash(copy())).toBe(a);
  });

  it('does not depend on the order files were written in', () => {
    const one = join(tempDir('bench-hash-'), 'v');
    const two = join(tempDir('bench-hash-'), 'v');
    mkdirSync(join(one, 'b'), { recursive: true });
    mkdirSync(join(two, 'b'), { recursive: true });
    writeFileSync(join(one, 'a.md'), 'a');
    writeFileSync(join(one, 'b', 'c.md'), 'c');
    writeFileSync(join(two, 'b', 'c.md'), 'c');
    writeFileSync(join(two, 'a.md'), 'a');
    expect(scenarioHash(one)).toBe(scenarioHash(two));
  });

  it.each([
    [
      'scenario.yaml',
      (dir: string) => writeFileSync(join(dir, 'scenario.yaml'), '# changed\n', { flag: 'a' }),
    ],
    ['a prompt', (dir: string) => writeFileSync(join(dir, 'prompts', '01.md'), 'Another request.\n')],
    ['a seed file', (dir: string) => writeFileSync(join(dir, 'seed', 'README.md'), '# Orders\n')],
    ['a new seed file', (dir: string) => writeFileSync(join(dir, 'seed', 'NEW.md'), 'new\n')],
    ['the oracle', (dir: string) => writeFileSync(join(dir, 'oracle', 'public', 'cancel.test.ts'), '//\n')],
    [
      'a file renamed',
      (dir: string) => {
        writeFileSync(join(dir, 'prompts', '03.md'), 'Refuse a second cancellation of the same order.\n');
        unlinkSync(join(dir, 'prompts', '02.md'));
      },
    ],
    [
      'an arm configuration',
      (dir: string) => {
        mkdirSync(join(dir, 'arms', 'wingfoil'), { recursive: true });
        writeFileSync(join(dir, 'arms', 'wingfoil', 'rule.md'), 'A rule.\n');
      },
    ],
  ])('changes when %s changes', (_, change) => {
    const dir = copy();
    const before = scenarioHash(dir);
    change(dir);
    expect(scenarioHash(dir)).not.toBe(before);
  });

  it('hashes a symbolic link by its target, so that pointing it elsewhere is a change', () => {
    const dir = copy();
    symlinkSync('README.md', join(dir, 'seed', 'LINK.md'));
    const before = scenarioHash(dir);
    unlinkSync(join(dir, 'seed', 'LINK.md'));
    symlinkSync('src/orders.ts', join(dir, 'seed', 'LINK.md'));
    expect(scenarioHash(dir)).not.toBe(before);
  });

  it("is what loadScenario reports as the scenario's hash", () => {
    const dir = copy();
    const result = loadScenario(join(dir, '..', '..'), 'T3', '1.0');
    expect(result.ok && result.value.hash).toBe(scenarioHash(dir));
  });

  it('covers a vendored third-party file, whatever its pin (dl-002)', () => {
    const dir = join(writeScenario(), 'S9', '1.0');
    const before = scenarioHash(dir);
    writeFileSync(join(dir, 'oracle', 'first', 'vendor', 'cases.json'), '[]\n');
    expect(scenarioHash(dir)).not.toBe(before);
  });
});
