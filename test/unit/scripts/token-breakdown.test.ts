// task-122 — scripts/token-breakdown.mjs: where a run's tokens go, read from its transcripts (dl-032 item 6).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/token-breakdown.mjs');
const EXECUTION = 'c0ffee000001/1';

interface Cell {
  readonly model: string;
  readonly scenario: string;
  readonly arm: string;
  readonly calls: number;
  readonly total: number;
  readonly resumed: number;
  readonly processed: Record<string, number>;
  readonly output: Record<string, number>;
  readonly commands: Record<string, { calls: number; mean_output_chars: number }>;
}

interface Summary {
  readonly cells: readonly Cell[];
  readonly extras: readonly {
    readonly model: string;
    readonly against: string;
    readonly total: number;
    readonly processed: Record<string, number>;
  }[];
}

const line = (event: unknown) => `${JSON.stringify(event)}\n`;

/** A Claude Code call: its id, usage and content blocks. */
const call = (id: string, fresh: number, cached: number, content: unknown[]) =>
  line({
    type: 'assistant',
    message: {
      id,
      content,
      usage: {
        input_tokens: 0,
        cache_creation_input_tokens: fresh,
        cache_read_input_tokens: cached,
        output_tokens: 1,
      },
    },
  });
const result = (id: string, chars: number) =>
  line({
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'x'.repeat(chars) }] },
  });
const bash = (id: string, command: string) => ({ type: 'tool_use', id, name: 'Bash', input: { command } });

/**
 * A Claude Code step: a call that runs `wingfoil workflow next` (its input 36 characters of JSON), its 364-character
 * output, a second call that answers, then a resumed session's one call. 400 new tokens reach the second call.
 */
const CLAUDE_STEP =
  line({ type: 'system', subtype: 'init' }) +
  call('m1', 1000, 0, [bash('t1', 'wingfoil workflow next')]) +
  result('t1', 364) +
  call('m2', 400, 1000, [{ type: 'text', text: 'Please approve.' }]) +
  line({ type: 'result', usage: { output_tokens: 60 } }) +
  line({ type: 'system', subtype: 'init' }) +
  call('m3', 50, 1400, [{ type: 'text', text: 'Done.' }]) +
  line({ type: 'result', usage: { output_tokens: 10 } });

/** A Codex turn: a command with a 400-character output, then a message; 10 000 tokens processed in the turn. */
const CODEX_STEP =
  line({ type: 'thread.started', thread_id: 'a' }) +
  line({
    type: 'item.completed',
    item: {
      type: 'command_execution',
      command: 'cat docs/memory/task/t.md',
      aggregated_output: 'y'.repeat(400),
    },
  }) +
  line({ type: 'item.completed', item: { type: 'agent_message', text: 'z'.repeat(40) } }) +
  line({ type: 'turn.completed', usage: { input_tokens: 10_000, output_tokens: 100 } });

function results(runs: readonly { arm: string; model: string; transcript: string }[]): string {
  const root = tempDir('bench-token-breakdown-');
  for (const run of runs) {
    const dir = join(root, EXECUTION, 'runs', 'S1@1.0', run.arm, run.model, 'r1');
    mkdirSync(join(dir, 'steps', '01'), { recursive: true });
    writeFileSync(
      join(dir, 'run.json'),
      JSON.stringify({ scenario: 'S1', arm: run.arm, model: run.model, repetition: 1 }),
    );
    writeFileSync(join(dir, 'steps', '01', 'transcript.jsonl'), run.transcript);
  }
  return root;
}

function breakdown(root: string, ...flags: string[]): string {
  const out = spawnSync(process.execPath, [SCRIPT, ...flags, root, EXECUTION], { encoding: 'utf8' });
  expect(out.status, out.stderr).toBe(0);
  return out.stdout;
}

describe('scripts/token-breakdown.mjs (task-122, dl-032 item 6)', () => {
  it("attributes a Claude Code call's new tokens to what was added before it, by characters, and the rest to the base", () => {
    const summary = JSON.parse(
      breakdown(results([{ arm: 'wingfoil', model: 'm', transcript: CLAUDE_STEP }])),
    ) as Summary;
    const [cell] = summary.cells;
    expect(cell).toMatchObject({ calls: 3, total: 1000 + 1400 + 1450, resumed: 1450 });
    // m2's 400 new tokens: the tool call's input (36 characters) and its output (364): 36 and 364 tokens, read by m2
    // and m3. m3's 50 new tokens: m2's text (15 characters) and the resumed session's reply (1), read by m3 only.
    expect(cell?.processed['wingfoil workflow next']).toBe(364 * 2);
    expect(cell?.processed['agent messages']).toBe(Math.round(36 * 2 + (50 * 15) / 16));
    expect(cell?.processed['requests and replies']).toBe(Math.round(50 / 16));
    expect(cell?.processed.base).toBe(1000 + (1400 - 400) + (1450 - 450));
    expect(cell?.commands['wingfoil workflow next']).toEqual({ calls: 1, mean_output_chars: 364 });
    // The first session's 60 output tokens by characters: the tool call (36) and m2's text (15); the second's 10, text.
    expect(cell?.output['wingfoil workflow next']).toBe(Math.round((60 * 36) / 51));
    expect(cell?.output['agent messages']).toBe(Math.round((60 * 15) / 51 + 10));
  });

  it("estimates a Codex item's tokens from its characters, one call per completed item, the turn's rest the base", () => {
    const summary = JSON.parse(
      breakdown(results([{ arm: 'wingfoil', model: 'm', transcript: CODEX_STEP }])),
    ) as Summary;
    const [cell] = summary.cells;
    // Two calls of 5000 each; the command (25 characters) and its output (400) are read by the second.
    expect(cell).toMatchObject({ calls: 2, total: 10_000, resumed: 0 });
    expect(cell?.processed.documents).toBe(100);
    expect(cell?.processed.base).toBe(Math.round(10_000 - 100 - 25 / 4));
  });

  it("states the wingfoil arm's extra over its docs control and the baseline, category by category", () => {
    const quiet =
      line({ type: 'system', subtype: 'init' }) +
      call('n1', 1000, 0, [{ type: 'text', text: 'Done.' }]) +
      line({ type: 'result', usage: { output_tokens: 5 } });
    const root = results([
      { arm: 'wingfoil', model: 'm', transcript: CLAUDE_STEP },
      { arm: 'baseline-docs', model: 'm', transcript: quiet },
      { arm: 'baseline', model: 'm', transcript: quiet },
    ]);
    const summary = JSON.parse(breakdown(root)) as Summary;
    expect(summary.extras.map((extra) => [extra.against, extra.total])).toEqual([
      ['baseline-docs', 2850],
      ['baseline', 2850],
    ]);
    expect(summary.extras[0]?.processed['wingfoil workflow next']).toBe(728);
    expect(breakdown(root, '--markdown')).toContain(
      "**m: wingfoil's extra tokens processed over baseline-docs",
    );
  });

  it.each([
    ['wingfoil workflow next 2>&1', 'wingfoil workflow next'],
    ["cat README.md && wingfoil --format json memory search --status pending'", 'wingfoil memory search'],
    ['wingfoil workflow finalize; wingfoil workflow next', 'wingfoil workflow finalize'],
    ['wingfoil init --help', 'wingfoil other'],
    ["/bin/bash -lc 'wingfoil workflow status && wingfoil workflow next'", 'wingfoil workflow status'],
    ["/bin/bash -lc 'cd .wingfoil && cat directives/custom/x.md'", 'documents'],
    ['sed -n 1,40p docs/memory/task/task-001.md', 'documents'],
    ['npm test 2>&1 | tail', 'code and tests'],
    ['ls; cat package.json', 'project files'],
  ])('puts the output of `%s` under %s', (command, category) => {
    const step =
      line({ type: 'system', subtype: 'init' }) +
      call('c1', 1000, 0, [bash('t', command)]) +
      result('t', 400) +
      call('c2', 400, 1000, [{ type: 'text', text: 'ok' }]);
    const summary = JSON.parse(
      breakdown(results([{ arm: 'wingfoil', model: 'm', transcript: step }])),
    ) as Summary;
    expect(summary.cells[0]?.processed[category]).toBeGreaterThan(300);
  });

  it('reads a wrapped Codex command by its first wingfoil sub-command, and leaves a failed turn out', () => {
    const step =
      line({ type: 'thread.started', thread_id: 'a' }) +
      line({
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command: "/bin/bash -lc 'wingfoil directives list --role developer && wingfoil memory search x'",
          aggregated_output: 'd'.repeat(800),
        },
      }) +
      line({ type: 'item.completed', item: { type: 'agent_message', text: 'ok' } }) +
      line({ type: 'turn.completed', usage: { input_tokens: 4000, output_tokens: 10 } }) +
      line({ type: 'turn.started' }) +
      line({ type: 'item.completed', item: { type: 'agent_message', text: 'lost' } }) +
      line({ type: 'turn.failed' });
    const summary = JSON.parse(
      breakdown(results([{ arm: 'wingfoil', model: 'm', transcript: step }])),
    ) as Summary;
    const [cell] = summary.cells;
    expect(cell?.processed['wingfoil directives list']).toBe(200);
    expect(cell?.processed['wingfoil memory search']).toBe(0);
    expect(cell).toMatchObject({ calls: 2, total: 4000 });
    expect(cell?.commands['wingfoil directives list']).toEqual({ calls: 1, mean_output_chars: 800 });
  });

  it('keeps what a failed Codex turn added in the context of the next priced turn', () => {
    const step =
      line({ type: 'thread.started', thread_id: 'a' }) +
      line({
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command: 'wingfoil directives list',
          aggregated_output: 'd'.repeat(800),
        },
      }) +
      line({ type: 'item.completed', item: { type: 'agent_message', text: 'then' } }) +
      line({ type: 'turn.failed' }) +
      line({ type: 'item.completed', item: { type: 'agent_message', text: 'retry' } }) +
      line({ type: 'turn.completed', usage: { input_tokens: 5000, output_tokens: 10 } });
    const summary = JSON.parse(
      breakdown(results([{ arm: 'wingfoil', model: 'm', transcript: step }])),
    ) as Summary;
    const [cell] = summary.cells;
    expect(cell).toMatchObject({ calls: 1, total: 5000 });
    expect(cell?.processed['wingfoil directives list']).toBe(200);
    expect(cell?.commands['wingfoil directives list']).toEqual({ calls: 1, mean_output_chars: 800 });
  });

  it('refuses to run without its arguments', () => {
    const out = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('usage: token-breakdown.mjs');
  });
});
