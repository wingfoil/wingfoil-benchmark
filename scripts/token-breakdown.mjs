#!/usr/bin/env node
// Where a run's tokens go (task-122, dl-032 item 6): each step's transcript read as the context a model call re-reads.
// A call reads the base (system prompt, tools, the manual, the request) and every item the step added before it (the
// agent's messages and tool calls, each tool's output, the approver's replies), so an item costs its size once for
// every later call of the step; a resumed session re-reads the history it resumes. Items are put in categories by the
// command or tool that produced them; the base is what the measured tokens leave once the items are attributed.
//
// Claude Code records each call's usage: an item's size is the new tokens of the next call (input + cache creation),
// shared by the items added since the previous call by their characters. Codex records a turn's usage only: an item's
// size is its characters ÷ 4 (an estimate), and the turn's calls are counted as one per completed item.
//
//   node scripts/token-breakdown.mjs <results-dir> <campaign-id>/<n>… > breakdown.json
//   node scripts/token-breakdown.mjs --markdown <results-dir> <campaign-id>/<n>…
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** The categories, in the order the tables print them. */
export const CATEGORIES = [
  'base',
  'wingfoil workflow next',
  'wingfoil workflow status',
  'wingfoil workflow finalize',
  'wingfoil workflow start',
  'wingfoil memory search',
  'wingfoil memory add',
  'wingfoil memory submit',
  'wingfoil memory approve',
  'wingfoil directives list',
  'wingfoil directives show',
  'wingfoil other',
  'documents',
  'code and tests',
  'project files',
  'agent messages',
  'requests and replies',
  'other',
];

const WINGFOIL = /(?:^|[\s;&|(])wingfoil\s+(?:--\S+\s+\S+\s+)*(workflow|memory|directives)\s+([a-z][a-z-]*)/;

/** The category of a tool call's output, from its command or its file. */
export function categoryOf(command) {
  const text = String(command ?? '');
  const wingfoil = WINGFOIL.exec(text);
  if (wingfoil !== null) {
    const name = `wingfoil ${wingfoil[1]} ${wingfoil[2]}`;
    return CATEGORIES.includes(name) ? name : 'wingfoil other';
  }
  if (/(?:^|[\s'"/])(?:docs\/memory|\.wingfoil)\//.test(text)) return 'documents';
  if (/(?:^|[\s'"/])(?:src|test|tests)\/|\b(?:npm (?:run )?test|vitest|tsc|node --test|npx tsx)\b/.test(text))
    return 'code and tests';
  if (/\b(?:README\.md|package\.json|CHANGELOG|ls|find|tree|git (?:log|status|diff|show))\b/.test(text))
    return 'project files';
  return 'other';
}

function events(path) {
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // A partial last line of a killed session: nothing to read.
    }
  }
  return out;
}

const chars = (value) => (typeof value === 'string' ? value.length : JSON.stringify(value ?? '').length);

/** A Claude Code tool call's command or file, which decides its output's category. */
function claudeCommand(block) {
  const input = block.input ?? {};
  if (typeof input.command === 'string') return input.command;
  const file = input.file_path ?? input.path ?? input.notebook_path ?? input.pattern ?? '';
  return block.name === 'Edit' || block.name === 'Write' || block.name === 'MultiEdit'
    ? `src/ ${file}`
    : String(file);
}

/**
 * A Claude Code step: its calls in order (each with its processed tokens and the items added before it) and its
 * sessions' output tokens. An item is `{ category, chars }`.
 */
function claudeStep(list) {
  const calls = [];
  const outputs = [];
  const commands = new Map();
  let pending = [];
  let session = -1;
  let lastId;
  let sessionOutput = [];
  for (const event of list) {
    if (event.type === 'system' && event.subtype === 'init') {
      session += 1;
      // A resumed session's first call carries the approver's reply, or the request: it is not the agent's own.
      if (session > 0) pending.push({ category: 'requests and replies', chars: 1 });
      continue;
    }
    if (event.type === 'assistant') {
      const message = event.message ?? {};
      if (message.id !== lastId) {
        const usage = message.usage ?? {};
        const fresh = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
        calls.push({
          session,
          fresh,
          processed: fresh + (usage.cache_read_input_tokens ?? 0),
          added: pending,
        });
        pending = [];
        lastId = message.id;
      }
      for (const block of message.content ?? []) {
        if (block.type === 'tool_use') {
          const command = claudeCommand(block);
          commands.set(block.id, command);
          const item = { category: 'agent messages', chars: chars(block.input), output: categoryOf(command) };
          pending.push(item);
          sessionOutput.push(item);
        } else if (block.type === 'text' || block.type === 'thinking') {
          const item = {
            category: 'agent messages',
            chars: chars(block.text ?? block.thinking),
            output: 'agent messages',
          };
          pending.push(item);
          sessionOutput.push(item);
        }
      }
      continue;
    }
    if (event.type === 'user') {
      const content = event.message?.content;
      if (typeof content === 'string') {
        pending.push({ category: 'requests and replies', chars: content.length });
        continue;
      }
      for (const block of content ?? []) {
        if (block.type === 'tool_result') {
          const command = commands.get(block.tool_use_id);
          pending.push({ category: categoryOf(command), chars: chars(block.content), command });
        } else if (block.type === 'text')
          pending.push({ category: 'requests and replies', chars: chars(block.text) });
      }
      continue;
    }
    if (event.type === 'result') {
      outputs.push({ tokens: event.usage?.output_tokens ?? 0, items: sessionOutput });
      sessionOutput = [];
      lastId = undefined;
    }
  }
  return { calls, outputs, measured: true };
}

/** A Codex step: one call per completed item, every item's size estimated, each turn's usage spread over its calls. */
function codexStep(list) {
  const calls = [];
  const outputs = [];
  let session = -1;
  let turn = [];
  let turnItems = [];
  const close = (usage) => {
    const processed = usage?.input_tokens ?? 0;
    // The turn's calls share its processed tokens; the items' estimated sizes are attributed first, the base after.
    for (const call of turn) call.turnProcessed = processed / Math.max(turn.length, 1);
    calls.push(...turn);
    outputs.push({ tokens: usage?.output_tokens ?? 0, items: turnItems });
    turn = [];
    turnItems = [];
  };
  let pending = [];
  for (const event of list) {
    if (event.type === 'thread.started') {
      session += 1;
      if (session > 0) pending.push({ category: 'requests and replies', chars: 1 });
      continue;
    }
    if (event.type === 'item.completed') {
      const item = event.item ?? {};
      turn.push({ session, added: pending });
      pending = [];
      if (item.type === 'command_execution') {
        const own = {
          category: 'agent messages',
          chars: chars(item.command),
          output: categoryOf(item.command),
        };
        turnItems.push(own);
        pending.push(own, {
          category: categoryOf(item.command),
          chars: chars(item.aggregated_output),
          command: item.command,
        });
      } else if (item.type === 'agent_message' || item.type === 'reasoning') {
        const own = { category: 'agent messages', chars: chars(item.text), output: 'agent messages' };
        turnItems.push(own);
        pending.push(own);
      } else if (item.type === 'file_change') {
        const own = { category: 'agent messages', chars: chars(item.changes), output: 'code and tests' };
        turnItems.push(own);
        pending.push(own);
      }
      continue;
    }
    if (event.type === 'turn.completed') close(event.usage);
  }
  return { calls, outputs, measured: false };
}

const empty = () => Object.fromEntries(CATEGORIES.map((category) => [category, 0]));

/**
 * One step's tokens by category: `processed` (each call's context re-read, items attributed by their size times the
 * later calls, the base the rest), `output`, `resumed` (processed in the calls of a resumed session) and the wingfoil
 * commands' calls and output characters.
 */
export function stepBreakdown(list) {
  const codex = list.some((event) => event.type === 'thread.started');
  const step = codex ? codexStep(list) : claudeStep(list);
  const processed = empty();
  const output = empty();
  const commands = {};
  let resumed = 0;
  let total = 0;
  const present = [];
  step.calls.forEach((call, index) => {
    // An item's size: measured (Claude Code, the call's new tokens shared by characters) or estimated (Codex, ÷ 4).
    // The step's first call adds nothing of the step's own: its new tokens are the base.
    const addedChars = call.added.reduce((sum, item) => sum + item.chars, 0);
    for (const item of call.added) {
      item.tokens = step.measured
        ? index === 0 || addedChars === 0
          ? 0
          : (call.fresh * item.chars) / addedChars
        : item.chars / 4;
      present.push(item);
      if (item.command !== undefined && item.category.startsWith('wingfoil')) {
        const entry = (commands[item.category] ??= { calls: 0, output_chars: 0 });
        entry.calls += 1;
        entry.output_chars += item.chars;
      }
    }
    const callProcessed = step.measured ? call.processed : call.turnProcessed;
    let attributed = 0;
    for (const item of present) {
      processed[item.category] += item.tokens;
      attributed += item.tokens;
    }
    processed.base += callProcessed - attributed;
    total += callProcessed;
    if (call.session > 0) resumed += callProcessed;
  });
  for (const turn of step.outputs) {
    const size = turn.items.reduce((sum, item) => sum + item.chars, 0);
    if (size === 0) output['agent messages'] += turn.tokens;
    else for (const item of turn.items) output[item.output] += (turn.tokens * item.chars) / size;
  }
  return { processed, output, total, resumed, commands, calls: step.calls.length, measured: step.measured };
}

function* runDirs(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (existsSync(join(path, 'run.json'))) yield path;
    else yield* runDirs(path);
  }
}

/** Every run of an execution with a transcript, summed over its steps. */
export function executionBreakdown(resultsDir, execution) {
  const runs = [];
  for (const dir of runDirs(join(resultsDir, execution, 'runs'))) {
    const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8'));
    const stepsDir = join(dir, 'steps');
    if (!existsSync(stepsDir)) continue;
    const sum = {
      processed: empty(),
      output: empty(),
      total: 0,
      resumed: 0,
      calls: 0,
      commands: {},
      steps: 0,
    };
    let measured = true;
    for (const step of readdirSync(stepsDir).sort()) {
      const file = join(stepsDir, step, 'transcript.jsonl');
      if (!existsSync(file)) continue;
      const b = stepBreakdown(events(file));
      measured &&= b.measured;
      for (const c of CATEGORIES) {
        sum.processed[c] += b.processed[c];
        sum.output[c] += b.output[c];
      }
      sum.total += b.total;
      sum.resumed += b.resumed;
      sum.calls += b.calls;
      sum.steps += 1;
      for (const [name, entry] of Object.entries(b.commands)) {
        const into = (sum.commands[name] ??= { calls: 0, output_chars: 0 });
        into.calls += entry.calls;
        into.output_chars += entry.output_chars;
      }
    }
    if (sum.steps === 0) continue;
    runs.push({
      scenario: run.scenario,
      arm: run.arm,
      model: run.model,
      repetition: run.repetition,
      measured,
      ...sum,
    });
  }
  return runs;
}

const round = (value) => Math.round(value);

/** The runs' means per model, scenario and arm, and the wingfoil arm's extra over its docs control and the baseline. */
export function summarize(runs) {
  const groups = new Map();
  for (const run of runs) {
    const key = `${run.model}\u0000${run.scenario}\u0000${run.arm}`;
    groups.set(key, [...(groups.get(key) ?? []), run]);
  }
  const mean = (list, pick) => list.reduce((sum, run) => sum + pick(run), 0) / list.length;
  const cells = [...groups.entries()]
    .map(([key, list]) => {
      const [model, scenario, arm] = key.split('\u0000');
      const commands = {};
      for (const run of list)
        for (const [name, entry] of Object.entries(run.commands)) {
          const into = (commands[name] ??= { calls: 0, output_chars: 0 });
          into.calls += entry.calls / list.length;
          into.output_chars += entry.output_chars;
        }
      for (const entry of Object.values(commands)) {
        entry.mean_output_chars =
          entry.calls === 0 ? 0 : round(entry.output_chars / (entry.calls * list.length));
        entry.calls = Math.round(entry.calls * 10) / 10;
        delete entry.output_chars;
      }
      return {
        model,
        scenario,
        arm,
        n: list.length,
        measured: list.every((run) => run.measured),
        total: round(mean(list, (run) => run.total)),
        resumed: round(mean(list, (run) => run.resumed)),
        calls: Math.round(mean(list, (run) => run.calls) * 10) / 10,
        processed: Object.fromEntries(
          CATEGORIES.map((c) => [c, round(mean(list, (run) => run.processed[c]))]),
        ),
        output: Object.fromEntries(CATEGORIES.map((c) => [c, round(mean(list, (run) => run.output[c]))])),
        commands,
      };
    })
    .sort((a, b) =>
      `${a.model}\u0000${a.scenario}\u0000${a.arm}`.localeCompare(
        `${b.model}\u0000${b.scenario}\u0000${b.arm}`,
        'en',
        {
          numeric: true,
        },
      ),
    );
  const find = (model, scenario, arm) =>
    cells.find((cell) => cell.model === model && cell.scenario === scenario && cell.arm === arm);
  const extras = cells
    .filter((cell) => cell.arm === 'wingfoil')
    .flatMap((cell) =>
      ['baseline-docs', 'baseline'].flatMap((against) => {
        const other = find(cell.model, cell.scenario, against);
        if (other === undefined) return [];
        const by = Object.fromEntries(CATEGORIES.map((c) => [c, cell.processed[c] - other.processed[c]]));
        return [
          {
            model: cell.model,
            scenario: cell.scenario,
            against,
            total: cell.total - other.total,
            resumed: cell.resumed - other.resumed,
            processed: by,
          },
        ];
      }),
    );
  return { cells, extras };
}

function markdown(summary) {
  const lines = [];
  // Calls a run, the base each call re-reads, and the tokens processed, per model and arm (means over the scenarios).
  const byArm = new Map();
  for (const cell of summary.cells) {
    const key = `${cell.model}\u0000${cell.arm}`;
    byArm.set(key, [...(byArm.get(key) ?? []), cell]);
  }
  lines.push('**Calls, base and tokens processed per run (means over the scenarios)**', '');
  lines.push(
    '| Model | Arm | Calls | Base per call (thousands) | Processed (thousands) | In resumed sessions (thousands) |',
  );
  lines.push('|---|---|---|---|---|---|');
  for (const [key, cells] of byArm) {
    const [model, arm] = key.split('\u0000');
    const avg = (pick) => cells.reduce((sum, cell) => sum + pick(cell), 0) / cells.length;
    lines.push(
      `| ${model} | ${arm} | ${avg((c) => c.calls).toFixed(1)} | ${avg((c) => c.processed.base / c.calls / 1000).toFixed(1)} | ` +
        `${avg((c) => c.total / 1000).toFixed(0)} | ${avg((c) => c.resumed / 1000).toFixed(0)} |`,
    );
  }
  lines.push('');
  lines.push("**The wingfoil arm's WingFoil commands per run (means over the scenarios)**", '');
  lines.push('| Model | Command | Calls a run | Mean output (characters) |');
  lines.push('|---|---|---|---|');
  const models = [...new Set(summary.cells.map((cell) => cell.model))];
  for (const model of models) {
    const cells = summary.cells.filter((cell) => cell.model === model && cell.arm === 'wingfoil');
    const names = [...new Set(cells.flatMap((cell) => Object.keys(cell.commands)))];
    const rows = names.map((name) => {
      const entries = cells.map((cell) => cell.commands[name] ?? { calls: 0, mean_output_chars: 0 });
      const calls = entries.reduce((sum, e) => sum + e.calls, 0) / cells.length;
      const used = entries.filter((e) => e.calls > 0);
      const size =
        used.length === 0 ? 0 : used.reduce((sum, e) => sum + e.mean_output_chars, 0) / used.length;
      return { name, calls, size };
    });
    for (const row of rows.sort((x, y) => y.calls - x.calls))
      if (row.calls >= 0.5)
        lines.push(`| ${model} | ${row.name} | ${row.calls.toFixed(1)} | ${row.size.toFixed(0)} |`);
  }
  lines.push('');
  const extraModels = [...new Set(summary.extras.map((e) => e.model))];
  // Each component's share of the extra over the docs control, summed over the scenarios: what the reading cites.
  const share = (rows, pick) => {
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    return total === 0 ? 0 : (100 * rows.reduce((sum, row) => sum + pick(row), 0)) / total;
  };
  const wingfoilOf = (row) =>
    Object.entries(row.processed)
      .filter(([c]) => c.startsWith('wingfoil'))
      .reduce((sum, [, v]) => sum + v, 0);
  lines.push(
    "**Shares of the wingfoil arm's extra tokens processed over its docs control (all scenarios, %)**",
    '',
  );
  lines.push(
    '| Model | Extra per run (thousands) | Base | In resumed sessions | WingFoil outputs | Documents | Agent messages | ' +
      'directives list | memory search | workflow status | workflow start |',
  );
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const model of extraModels) {
    const rows = summary.extras.filter((e) => e.model === model && e.against === 'baseline-docs');
    if (rows.length === 0) continue;
    const perRun = rows.reduce((sum, row) => sum + row.total, 0) / rows.length / 1000;
    const pct = (pick) => share(rows, pick).toFixed(0);
    lines.push(
      `| ${model} | ${perRun.toFixed(0)} | ${pct((r) => r.processed.base)} | ${pct((r) => r.resumed)} | ` +
        `${pct(wingfoilOf)} | ${pct((r) => r.processed.documents)} | ${pct((r) => r.processed['agent messages'])} | ` +
        `${pct((r) => r.processed['wingfoil directives list'])} | ${pct((r) => r.processed['wingfoil memory search'])} | ` +
        `${pct((r) => r.processed['wingfoil workflow status'])} | ${pct((r) => r.processed['wingfoil workflow start'])} |`,
    );
  }
  lines.push('');
  for (const against of ['baseline-docs', 'baseline']) {
    for (const model of extraModels) {
      const rows = summary.extras.filter((e) => e.model === model && e.against === against);
      if (rows.length === 0) continue;
      const shown = CATEGORIES.filter((c) =>
        rows.some((row) => Math.abs(row.processed[c]) >= 0.01 * Math.abs(row.total)),
      );
      lines.push(`**${model}: wingfoil's extra tokens processed over ${against}, per run (thousands)**`, '');
      lines.push(`| Scenario | Extra | In resumed sessions | ${shown.join(' | ')} |`);
      lines.push(`|---|---|---|${shown.map(() => '---').join('|')}|`);
      for (const row of rows)
        lines.push(
          `| ${row.scenario} | ${(row.total / 1000).toFixed(0)} | ${(row.resumed / 1000).toFixed(0)} | ` +
            `${shown.map((c) => (row.processed[c] / 1000).toFixed(0)).join(' | ')} |`,
        );
      lines.push('');
    }
  }
  return lines.join('\n');
}

const isMain = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const args = process.argv.slice(2);
  const asMarkdown = args[0] === '--markdown';
  const [resultsDir, ...executions] = asMarkdown ? args.slice(1) : args;
  if (resultsDir === undefined || executions.length === 0) {
    process.stderr.write('usage: token-breakdown.mjs [--markdown] <results-dir> <campaign-id>/<n>…\n');
    process.exit(2);
  }
  const runs = executions.flatMap((execution) => executionBreakdown(resultsDir, execution));
  const summary = summarize(runs);
  process.stdout.write(asMarkdown ? `${markdown(summary)}\n` : `${JSON.stringify(summary, undefined, 2)}\n`);
}
