import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { fakeAgent, loadFakeScript } from '../../../src/agents/index.js';
import type { ProcessResult } from '../../../src/core/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = { T0: { '1': ['touch hello.txt'], '2': ['echo hi > hello.txt'] } };

function scriptFile(content: unknown = SCRIPT): string {
  const dir = tempDir('bench-script-');
  const file = join(dir, 'script.json');
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  return file;
}

function exec(results: ProcessResult[] = []) {
  const commands: string[][] = [];
  return {
    commands,
    run: (command: readonly string[]) => {
      commands.push([...command]);
      return Promise.resolve(results.shift() ?? { code: 0, stdout: '', stderr: '' });
    },
  };
}

describe('loadFakeScript', () => {
  it('reads a script of commands per scenario and step', () => {
    const result = loadFakeScript(scriptFile());
    expect(result.ok && result.value.T0?.['1']).toEqual(['touch hello.txt']);
  });

  it.each([
    ['{"T0": {"1": "touch x"}}', 'T0.1'],
    ['{"T0": {"0": ["x"]}}', 'T0'],
    ['[]', 'script.json'],
    ['not json', 'script.json'],
  ])('reports a malformed script (%s)', (content, path) => {
    const result = loadFakeScript(scriptFile(content));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe(path);
  });

  it('reports a script that does not exist', () => {
    const result = loadFakeScript(join(tempDir('bench-script-'), 'missing.json'));
    expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual(['missing.json']);
  });
});

describe('the scripted fake agent', () => {
  it('runs the commands its script declares for the step', async () => {
    const runner = exec();
    const outcome = await fakeAgent(SCRIPT).runStep({ scenarioId: 'T0', step: 2, run: runner.run });
    expect(runner.commands).toEqual([['sh', '-c', 'echo hi > hello.txt']]);
    expect(outcome).toEqual({ commands: ['echo hi > hello.txt'] });
  });

  it('fails when the script says nothing about the step, so that nothing passes silently', async () => {
    const runner = exec();
    await expect(fakeAgent(SCRIPT).runStep({ scenarioId: 'T0', step: 3, run: runner.run })).rejects.toThrow(
      /no scripted commands for T0 step 3/,
    );
    expect(runner.commands).toEqual([]);
  });

  it('fails when a command fails, naming its output', async () => {
    const runner = exec([{ code: 2, stdout: '', stderr: 'boom' }]);
    await expect(fakeAgent(SCRIPT).runStep({ scenarioId: 'T0', step: 1, run: runner.run })).rejects.toThrow(
      /touch hello.txt.*boom/s,
    );
  });
});
