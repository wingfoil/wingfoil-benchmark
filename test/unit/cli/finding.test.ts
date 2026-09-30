import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { aggregatedExecution, bench } from '../../support/finding-fixture.js';
import { EXECUTION } from '../../support/score-fixture.js';

const ARGS = ['--scenario', 'T3@1.0', '--metric', 'M-Q1', '--arms', 'baseline,wingfoil', '--as', 'bug'];
const ID = 'abcdef012345-1-t3-1.0-m-q1-baseline+wingfoil';

describe('bench finding (REQ-CLI-07, F5.4, task-044)', () => {
  it('writes findings/<id>.md, says where, and refuses to write it again', async () => {
    const { root } = await aggregatedExecution();
    const first = await bench(root, 'finding', EXECUTION, ...ARGS);
    expect(first).toEqual({ code: 0, stdout: `finding: findings/${ID}.md\n`, stderr: '' });
    const bytes = readFileSync(join(root, 'findings', `${ID}.md`));
    const again = await bench(root, 'finding', EXECUTION, ...ARGS);
    expect(again).toMatchObject({
      code: 1,
      stderr: `findings/${ID}.md: exists already; it is never overwritten\n`,
    });
    rmSync(join(root, 'findings', `${ID}.md`));
    expect((await bench(root, 'finding', EXECUTION, ...ARGS)).code).toBe(0);
    expect(readFileSync(join(root, 'findings', `${ID}.md`))).toEqual(bytes);
    expect(readdirSync(join(root, 'findings'))).toEqual([`${ID}.md`]);
  });

  it('is a usage error without each of its options, or with an --as it does not know', async () => {
    const { root } = await aggregatedExecution();
    for (const drop of ['--scenario', '--metric', '--arms', '--as']) {
      const index = ARGS.indexOf(drop);
      const args = ARGS.filter((_, i) => i !== index && i !== index + 1);
      expect((await bench(root, 'finding', EXECUTION, ...args)).code, drop).toBe(2);
    }
    const wrong = ARGS.map((arg) => (arg === 'bug' ? 'task' : arg));
    expect((await bench(root, 'finding', EXECUTION, ...wrong)).code).toBe(2);
    expect((await bench(root, 'finding', ...ARGS)).code).toBe(2);
    expect(existsSync(join(root, 'findings'))).toBe(false);
  });

  it('refuses what the execution does not hold, writing nothing', async () => {
    const { root } = await aggregatedExecution();
    const unknown = await bench(
      root,
      'finding',
      EXECUTION,
      ...ARGS.map((arg) => (arg === 'M-Q1' ? 'M-X' : arg)),
    );
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toMatch(/^--metric: M-X is not one of M-Q1, /);
    const notAggregated = await bench(root, 'finding', 'abcdef012345/7', ...ARGS);
    expect(notAggregated.code).toBe(1);
    expect(existsSync(join(root, 'findings'))).toBe(false);
  });
});
