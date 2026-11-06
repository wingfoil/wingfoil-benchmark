// task-137 — scripts/step-a-reading.mjs: the step-A arm's cycle and H1, H2, H8, read from stored results, nothing
// written.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';

interface Cycle {
  readonly source: string;
  readonly scenario: string;
  readonly steps: number;
  readonly asked: number;
  readonly replies: number;
  readonly approvedOnApproval: number;
  readonly approvedOnOtherReply: number;
  readonly approvedWithoutReply: number;
  readonly verbs: Record<string, number>;
}
interface Against {
  readonly ratio: number | null;
  readonly n: string;
  readonly reported: string;
}
interface Reading {
  readonly cycles: readonly Cycle[];
  readonly ratios: readonly { execution: string; scenario: string; h1: Against; h2: Against; h8: Against }[];
  readonly h8: readonly { execution: string; model: string; scenarios: number; mean: number }[];
  readonly pins: readonly { execution: string; approver_policy: string; wingfoil: string; agent: string }[];
}
interface Module {
  reading(resultsDir: string, sources: readonly string[]): Reading;
  markdown(result: Reading): string;
  verbsOf(command: string): string[];
}

const line = (event: unknown) => `${JSON.stringify(event)}\n`;
const init = () => line({ type: 'system', subtype: 'init' });
const bash = (command: string) =>
  line({
    type: 'assistant',
    message: { id: command, content: [{ type: 'tool_use', id: command, input: { command } }] },
  });
const result = (text: string) => line({ type: 'result', subtype: 'success', result: text });

/** One wingfoil run: `steps` are each step's sessions, a session a list of commands and its last message. */
function writeRun(
  dir: string,
  steps: readonly (readonly { commands: readonly string[]; last: string }[])[],
  replies: readonly { step: number; reply: string }[],
): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'run.json'),
    JSON.stringify({
      scenario: 'S1',
      version: '1.0',
      model: 'm',
      repetition: 1,
      agent: { name: 'claude-code', version: '9.9.9' },
      approver_policy: 'v5',
      arm_digest: 'abc',
      harness: { tool: 'wingfoil', version: 'v0.3.1', commit: '870bd4406f3b9bba5ecde7a5f8198b80c2a98583' },
      steps: steps.map((_, i) => ({ n: i + 1 })),
      interventions: replies.map((r) => ({ ...r, kind: 'approval' })),
    }),
  );
  steps.forEach((sessions, i) => {
    const stepDir = join(dir, 'steps', String(i + 1).padStart(2, '0'));
    mkdirSync(stepDir, { recursive: true });
    writeFileSync(
      join(stepDir, 'transcript.jsonl'),
      sessions.map((s) => init() + s.commands.map(bash).join('') + result(s.last)).join(''),
    );
  });
}

const figures = (values: readonly number[]) => ({
  n: values.length,
  runs: values.map((_, i) => `r${i}`),
  values,
});
const group = (arm: string, cost: readonly number[], turns: readonly number[]) => ({
  scenario: 'S1',
  version: '1.0',
  arm,
  model: 'm',
  metrics: { cost: { cost_eur: figures(cost), turns: figures(turns) } },
});

/** Every file under `dir` with its size and time: what "writes nothing" compares. */
function snapshot(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const path = join(d, name);
      const stat = statSync(path);
      if (stat.isDirectory()) walk(path);
      else out.push(`${path} ${stat.size} ${stat.mtimeMs}`);
    }
  };
  walk(dir);
  return out;
}

describe('scripts/step-a-reading.mjs (task-137)', { timeout: 600_000 }, () => {
  let mod: Module;
  beforeAll(async () => {
    execFileSync('npm', ['run', 'build'], { cwd: repoPath('.'), encoding: 'utf8' });
    mod = (await import(repoPath('scripts/step-a-reading.mjs'))) as Module;
  }, 300_000);

  function fixture(): string {
    const results = tempDir('step-a-reading-');
    const execution = join(results, 'f00d00000001', '1');
    // Each request opens its instance, asks at its gate, and approves after the reply.
    const asked = [
      {
        commands: [
          'wingfoil workflow status; wingfoil workflow next',
          'wingfoil workflow start sw-life-cycle',
        ],
        last: 'Done. Please approve task-001.',
      },
      {
        commands: [
          'wingfoil memory approve task-001 --reason "Approved. Proceed."',
          'wingfoil workflow finalize',
        ],
        last: 'Approved and finalized.',
      },
    ];
    writeRun(
      join(execution, 'runs', 'S1@1.0', 'wingfoil', 'm', 'r1'),
      [asked, asked],
      [
        { step: 1, reply: 'Approved. Proceed.' },
        { step: 2, reply: 'Approved. Proceed.' },
      ],
    );
    writeFileSync(
      join(execution, 'aggregate.json'),
      JSON.stringify({
        groups: [
          // cost within the variance (ranges overlap); turns beyond it
          group('baseline', [1.5, 2.5, 3.5], [10, 11, 12]),
          group('baseline-docs', [0.5, 0.5, 0.5], [20, 20, 20]),
          group('wingfoil', [1, 2, 3], [30, 31, 32]),
        ],
        slices: [],
      }),
    );
    writeFileSync(
      join(execution, 'campaign.yaml'),
      'agent: { name: claude-code, version: 9.9.9 }\napprover_policy: v5\n' +
        'harnesses:\n  wingfoil: { tool: wingfoil, version: v0.3.1 }\narm_digests: { wingfoil: abc }\n',
    );
    // A dry run whose gates are answered late in one batch: steps 1 and 2 stop on a statement, step 3 asks and,
    // after the one reply, approves the three tasks; and an approval with no reply in its step.
    const statement = {
      commands: ['wingfoil workflow next'],
      last: 'This waits on the approval of task-001.',
    };
    writeRun(
      join(results, 'dry-runs', '7', 'runs', 'S1@1.0', 'wingfoil', 'm', 'r1'),
      [
        [statement],
        [statement],
        [
          { commands: ['wingfoil workflow next'], last: 'Please approve task-001, task-002 and task-003.' },
          {
            commands: [
              'wingfoil memory approve task-001 && wingfoil memory approve task-002',
              'wingfoil memory approve task-003',
            ],
            last: 'Approved.',
          },
        ],
        [{ commands: ['wingfoil memory approve task-004'], last: 'Approved on my own.' }],
        [
          { commands: ['wingfoil workflow next'], last: 'Should I approve task-005?' },
          { commands: ['wingfoil memory approve task-005'], last: 'Approved on a question.' },
        ],
      ],
      [
        { step: 3, reply: 'Approved. Proceed.' },
        { step: 5, reply: 'No further input is available. Make the most reasonable choice.' },
      ],
    );
    return results;
  }

  it("splits a Codex step's threads and reads its commands and last message", () => {
    const results = tempDir('step-a-reading-codex-');
    const dir = join(results, 'dry-runs', '8', 'runs', 'S1@1.0', 'wingfoil', 'm', 'r1');
    writeRun(dir, [[]], [{ step: 1, reply: 'Approved. Proceed.' }]);
    const command = (text: string) =>
      line({ type: 'item.completed', item: { type: 'command_execution', command: text } });
    const message = (text: string) => line({ type: 'item.completed', item: { type: 'agent_message', text } });
    writeFileSync(
      join(dir, 'steps', '01', 'transcript.jsonl'),
      line({ type: 'thread.started' }) +
        command("/bin/bash -lc 'wingfoil workflow status && wingfoil workflow next'") +
        message('Done. Please approve task-001.') +
        line({ type: 'turn.completed', usage: {} }) +
        line({ type: 'thread.started' }) +
        command('/bin/bash -lc \'wingfoil memory approve task-001 --reason "Approved. Proceed."\'') +
        command("/bin/bash -lc 'wingfoil workflow finalize'") +
        message('Approved and finalized.') +
        line({ type: 'turn.completed', usage: {} }),
    );
    const { cycles } = mod.reading(results, ['dry-runs/8']);
    expect(cycles[0]).toMatchObject({
      steps: 1,
      asked: 1,
      replies: 1,
      approvedOnApproval: 1,
      approvedOnOtherReply: 0,
      approvedWithoutReply: 0,
    });
    expect(cycles[0]?.verbs).toMatchObject({
      'workflow status': 1,
      'workflow next': 1,
      'workflow finalize': 1,
    });
  });

  it('counts every wingfoil verb of a chained command', () => {
    expect(mod.verbsOf('cat README.md && wingfoil workflow status; wingfoil workflow next | head')).toEqual([
      'workflow status',
      'workflow next',
    ]);
  });

  it('reads a run whose requests each open an instance and pass their gate after the reply', () => {
    const { cycles } = mod.reading(fixture(), ['f00d00000001/1']);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toMatchObject({
      steps: 2,
      asked: 2,
      replies: 2,
      approvedOnApproval: 2,
      approvedOnOtherReply: 0,
      approvedWithoutReply: 0,
    });
    expect(cycles[0]?.verbs).toMatchObject({
      'workflow start': 2,
      'workflow finalize': 2,
      'workflow next': 2,
      'workflow status': 2,
    });
  });

  it("reads gates answered late in one batch, an approval no reply in its step allowed, and one on a question's reply", () => {
    const { cycles } = mod.reading(fixture(), ['dry-runs/7']);
    expect(cycles[0]).toMatchObject({
      steps: 5,
      asked: 1,
      replies: 2,
      approvedOnApproval: 3,
      approvedOnOtherReply: 1,
      approvedWithoutReply: 1,
    });
  });

  it('reports a ratio within the variance without ▲/▼, and one beyond it', () => {
    const { ratios } = mod.reading(fixture(), ['f00d00000001/1']);
    expect(ratios).toEqual([
      {
        execution: 'f00d00000001/1',
        scenario: 'S1@1.0',
        model: 'm',
        h1: { ratio: 0.8, n: '3/3', reported: 'within the variance' },
        h2: { ratio: 2.82, n: '3/3', reported: 'worse' },
        h8: { ratio: 4, n: '3/3', reported: 'worse' },
      },
    ]);
  });

  it("states each execution's pins and leaves dry runs out of the ratios", () => {
    const result = mod.reading(fixture(), ['f00d00000001/1', 'dry-runs/7']);
    expect(result.pins).toEqual([
      {
        execution: 'f00d00000001/1',
        approver_policy: 'v5',
        wingfoil: 'v0.3.1',
        wingfoil_commit: '870bd4406f3b',
        wingfoil_digest: 'abc',
        agent: 'claude-code 9.9.9',
      },
    ]);
    expect(result.ratios.map((r) => r.execution)).toEqual(['f00d00000001/1']);
    expect(result.h8).toEqual([
      { execution: 'f00d00000001/1', model: 'm', scenarios: 1, mean: 4, values: [4] },
    ]);
    expect(mod.markdown(result)).toContain('| dry-runs/7 | S1@1.0 | m | 1 | 5 |');
  });

  it('writes nothing under the results directory, through the command line too', () => {
    const results = fixture();
    const before = snapshot(results);
    mod.reading(results, ['f00d00000001/1', 'dry-runs/7']);
    execFileSync('node', [repoPath('scripts/step-a-reading.mjs'), '--markdown', results, 'f00d00000001/1'], {
      encoding: 'utf8',
    });
    expect(snapshot(results)).toEqual(before);
  });
});
