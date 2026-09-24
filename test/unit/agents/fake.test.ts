import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { fakeAgent, loadFakeScript } from '../../../src/agents/index.js';
import type { ProcessResult } from '../../../src/core/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = {
  T0: {
    '1': { commands: ['touch hello.txt'] },
    '2': { commands: ['echo hi > hello.txt'] },
    '3': { session: 'not-the-one-it-was-given', commands: ['true'] },
  },
};

/** What the runner asks for: a fresh session per step (F2.2). */
function request(step: number, run: (command: readonly string[]) => Promise<ProcessResult>) {
  return {
    scenarioId: 'T0',
    step,
    prompt: `do step ${step}`,
    model: 'fake-model',
    sessionId: `session-${step}`,
    run,
  };
}

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
    expect(result.ok && result.value.T0?.['1']).toEqual({ commands: ['touch hello.txt'] });
  });

  it.each([
    ['{"T0": {"1": "touch x"}}', 'T0.1'],
    ['{"T0": {"1": {"commands": []}}}', 'T0.1.commands'],
    ['{"T0": {"0": {"commands": ["x"]}}}', 'T0.0'],
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

  it('refuses a script larger than a script has any reason to be', () => {
    const file = scriptFile(`{"T0": {"1": {"commands": ["${'x'.repeat(1024 * 1024)}"]}}}`);
    const result = loadFakeScript(file);
    expect(result.ok ? [] : result.issues.map((issue) => issue.message)).toEqual([
      expect.stringMatching(/^is larger than 1048576 bytes/),
    ]);
  });
});

describe('the scripted fake agent', () => {
  it('runs the commands its script declares for the step', async () => {
    const runner = exec();
    const outcome = await fakeAgent(SCRIPT).runStep(request(2, runner.run));
    expect(runner.commands).toEqual([['sh', '-c', 'echo hi > hello.txt']]);
    // It answers with the session it was given: the ordinary case (F2.2).
    expect(outcome).toEqual({ sessionId: 'session-2' });
  });

  it("can answer with a different session, so that the runner's check has something to catch", async () => {
    const runner = exec();
    const outcome = await fakeAgent(SCRIPT).runStep(request(3, runner.run));
    expect(outcome).toEqual({ sessionId: 'not-the-one-it-was-given' });
  });

  it('fails when the script says nothing about the step, so that nothing passes silently', async () => {
    const runner = exec();
    await expect(fakeAgent(SCRIPT).runStep(request(9, runner.run))).rejects.toThrow(
      /no scripted commands for T0 step 9/,
    );
    expect(runner.commands).toEqual([]);
  });

  it('fails when a command fails, naming its output', async () => {
    const runner = exec([{ code: 2, stdout: '', stderr: 'boom' }]);
    await expect(fakeAgent(SCRIPT).runStep(request(1, runner.run))).rejects.toThrow(/touch hello.txt.*boom/s);
  });
});
