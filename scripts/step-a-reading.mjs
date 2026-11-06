#!/usr/bin/env node
// Step A read from what was already run (task-137, dl-021 step A): how each wingfoil run went through WingFoil's
// workflow cycle, read from its transcripts, and the hypotheses H1, H2 and H8 restated on the engine, read from the
// executions' aggregates. It writes nothing under results/, runs no agent and spends nothing.
//
// The cycle, per run: the requests (steps), the `wingfoil` commands of each kind (every sub-command of a chained shell
// command counts; a loop counts once), the workflow instances started, the finalizes, the sessions that ended asking
// for an approval with "Please approve", the approver's replies (run.json), and the agent's `wingfoil memory approve`
// commands (a loop over several documents counts once): after "Approved. Proceed.", after another reply (a question's, a scenario approver's), or
// in a session no reply in its step preceded.
//
// The ratios, per execution, scenario and model: wingfoil ÷ baseline in cost (H1) and turns (H2), wingfoil ÷
// baseline-docs in cost (H8), the means of each group's runs, and the comparison as every page reports it (REQ-RES-03
// as amended in 1.49: better or worse only beyond the variance).
//
//   node scripts/step-a-reading.mjs <results-dir> <execution-or-dry-run>… > reading.json
//   node scripts/step-a-reading.mjs --markdown <results-dir> <execution-or-dry-run>…
//
// An execution is `<campaign-id>/<n>`, a dry run `dry-runs/<n>`. The transcripts are git-ignored: the results
// directory must be a checkout that holds them.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

import { compare, reported } from '../dist/results/compare.js';

/** Every `wingfoil <group> <verb>` of a shell command, in order. */
const WINGFOIL =
  /(?:^|[\s;&|('"])wingfoil\s+(?:--\S+\s+\S+\s+)*(workflow|memory|directives)\s+([a-z][a-z-]*)/g;

/** The verbs the cycle counts, in the order the tables print them. */
export const VERBS = [
  'workflow status',
  'workflow next',
  'workflow start',
  'workflow finalize',
  'memory add',
  'memory submit',
  'memory approve',
  'directives list',
];

/** The `wingfoil` verbs of one shell command. */
export function verbsOf(command) {
  return [...String(command ?? '').matchAll(WINGFOIL)].map((m) => `${m[1]} ${m[2]}`);
}

const ASKS = /\bplease approve\b/i;
const APPROVED = 'Approved. Proceed.';

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

/**
 * One step's sessions, from its transcript (Claude Code's stream-json or Codex's events): each session's `wingfoil`
 * verbs and whether its last message asks for an approval.
 */
export function stepSessions(list) {
  const sessions = [];
  let current;
  const open = () => {
    current = { verbs: [], last: '' };
    sessions.push(current);
  };
  for (const event of list) {
    if ((event.type === 'system' && event.subtype === 'init') || event.type === 'thread.started') {
      open();
      continue;
    }
    if (current === undefined) open();
    if (event.type === 'assistant') {
      for (const block of event.message?.content ?? []) {
        if (block.type === 'tool_use' && typeof block.input?.command === 'string')
          current.verbs.push(...verbsOf(block.input.command));
        else if (block.type === 'text' && typeof block.text === 'string') current.last = block.text;
      }
    } else if (event.type === 'result' && typeof event.result === 'string') {
      current.last = event.result;
    } else if (event.type === 'item.completed') {
      const item = event.item ?? {};
      if (item.type === 'command_execution') current.verbs.push(...verbsOf(item.command));
      else if (item.type === 'agent_message' && typeof item.text === 'string') current.last = item.text;
    }
  }
  return sessions.map((s) => ({ verbs: s.verbs, asks: ASKS.test(s.last) }));
}

function* runDirs(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (existsSync(join(path, 'run.json'))) yield path;
    else yield* runDirs(path);
  }
}

/** One wingfoil run's cycle, summed over its steps. */
export function runCycle(dir) {
  const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8'));
  const replies = Array.isArray(run.interventions) ? run.interventions : [];
  const counts = Object.fromEntries(VERBS.map((verb) => [verb, 0]));
  const cycle = {
    steps: 0,
    asked: 0,
    replies: replies.length,
    approvedOnApproval: 0,
    approvedOnOtherReply: 0,
    approvedWithoutReply: 0,
  };
  for (const step of run.steps ?? []) {
    const file = join(dir, 'steps', String(step.n).padStart(2, '0'), 'transcript.jsonl');
    if (!existsSync(file)) continue;
    cycle.steps += 1;
    const stepReplies = replies.filter((r) => r.step === step.n).map((r) => String(r.reply ?? ''));
    stepSessions(events(file)).forEach((session, index) => {
      if (session.asks) cycle.asked += 1;
      for (const verb of session.verbs) {
        if (verb in counts) counts[verb] += 1;
        // A resumed session (index > 0) follows the step's reply number index - 1; the first one had none in this
        // step. An approval counts as given only by "Approved. Proceed." (the arm's manual).
        if (verb === 'memory approve') {
          if (index === 0) cycle.approvedWithoutReply += 1;
          else if (stepReplies[index - 1]?.startsWith(APPROVED)) cycle.approvedOnApproval += 1;
          else cycle.approvedOnOtherReply += 1;
        }
      }
    });
  }
  return {
    scenario: `${run.scenario}@${run.version}`,
    model: run.model,
    repetition: run.repetition,
    agent: `${run.agent?.name ?? '?'} ${run.agent?.version ?? '?'}`,
    approver_policy: run.approver_policy,
    arm_digest: run.arm_digest,
    ...cycle,
    replies_text: [...new Set(replies.map((r) => r.reply))].sort(),
    verbs: counts,
  };
}

/** Every wingfoil run of an execution or a dry run, with a transcript. */
export function cycles(resultsDir, source) {
  const out = [];
  for (const dir of runDirs(join(resultsDir, source, 'runs'))) {
    if (!dir.split('/').includes('wingfoil')) continue;
    const cycle = runCycle(dir);
    if (cycle.steps > 0) out.push({ source, ...cycle });
  }
  return out;
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const ratio = (a, b) => (b === 0 ? null : Math.round((a / b) * 100) / 100);

/** An execution's groups, its slices' included, keyed by scenario, model and arm. */
function groupsOf(resultsDir, execution) {
  const aggregate = JSON.parse(readFileSync(join(resultsDir, execution, 'aggregate.json'), 'utf8'));
  const groups = new Map();
  for (const group of [...(aggregate.groups ?? []), ...(aggregate.slices ?? [])])
    groups.set(`${group.scenario}@${group.version}|${group.model}|${group.arm}`, group);
  return groups;
}

function side(group, metric) {
  const figures = group.metrics.cost[metric];
  return { runs: figures.runs, values: figures.values };
}

/** wingfoil against `other` on one cost metric: the means' ratio and the comparison as pages report it. */
function against(wingfoil, other, metric) {
  const base = side(other, metric);
  const arm = side(wingfoil, metric);
  return {
    ratio: ratio(mean(arm.values), mean(base.values)),
    n: `${arm.values.length}/${base.values.length}`,
    reported: reported(compare('lower', base, arm)),
  };
}

/** The ratios of an execution's wingfoil groups: H1 (cost, baseline), H2 (turns, baseline), H8 (cost, docs). */
export function ratios(resultsDir, execution) {
  const groups = groupsOf(resultsDir, execution);
  const out = [];
  for (const [key, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (group.arm !== 'wingfoil') continue;
    const [scenario, model] = key.split('|');
    const baseline = groups.get(`${scenario}|${model}|baseline`);
    const docs = groups.get(`${scenario}|${model}|baseline-docs`);
    out.push({
      execution,
      scenario,
      model,
      h1: baseline === undefined ? null : against(group, baseline, 'cost_eur'),
      h2: baseline === undefined ? null : against(group, baseline, 'turns'),
      h8: docs === undefined ? null : against(group, docs, 'cost_eur'),
    });
  }
  return out;
}

/** H8's reading (v0.1.md §11): the mean of the per-scenario ratios over S1, S2, S3 and S8, per execution and model. */
export function h8Means(rows) {
  const out = new Map();
  for (const r of rows) {
    if (r.h8 === null || r.h8.ratio === null || !/^S(1|2|3|8)@/.test(r.scenario)) continue;
    const key = `${r.execution}|${r.model}`;
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(r.h8.ratio);
  }
  return [...out.entries()].map(([key, values]) => {
    const [execution, model] = key.split('|');
    return { execution, model, scenarios: values.length, mean: Math.round(mean(values) * 100) / 100, values };
  });
}

/**
 * What an execution pins that a reading across two executions must state: from its campaign file, and the WingFoil
 * commit its first wingfoil run installed (`run.json`'s `harness`).
 */
export function pins(resultsDir, execution) {
  const campaign = parse(readFileSync(join(resultsDir, execution, 'campaign.yaml'), 'utf8'));
  let commit = null;
  for (const dir of runDirs(join(resultsDir, execution, 'runs'))) {
    if (!dir.split('/').includes('wingfoil')) continue;
    commit = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8')).harness?.commit ?? null;
    break;
  }
  return {
    execution,
    approver_policy: campaign.approver_policy ?? null,
    wingfoil: campaign.harnesses?.wingfoil?.version ?? null,
    wingfoil_commit: commit === null ? null : String(commit).slice(0, 12),
    wingfoil_digest: campaign.arm_digests?.wingfoil ?? null,
    agent: `${campaign.agent?.name ?? '?'} ${campaign.agent?.version ?? '?'}`,
  };
}

/** The reading of every source: the cycles of all, and the ratios and pins of the executions. */
export function reading(resultsDir, sources) {
  const executions = sources.filter((source) => !source.startsWith('dry-runs/'));
  return {
    cycles: sources.flatMap((source) => cycles(resultsDir, source)),
    ratios: executions.flatMap((execution) => ratios(resultsDir, execution)),
    h8: h8Means(executions.flatMap((execution) => ratios(resultsDir, execution))),
    pins: executions.map((execution) => pins(resultsDir, execution)),
  };
}

const cell = (r) => (r === null ? '—' : `${r.ratio}× (${r.n}, ${r.reported})`);

/** The reading as Markdown tables: the cycle's means per source, scenario and model; the ratios; the pins. */
export function markdown(result) {
  const lines = [];
  lines.push('**The cycle per wingfoil run** (means over the runs of each source, scenario and model)', '');
  lines.push(
    '| Source | Scenario | Model | Runs | Requests | `workflow start` | `finalize` | `next` | `status` | ' +
      'Asked "Please approve" | Replies | `memory approve` commands after "Approved. Proceed." | ' +
      'after another reply | with no reply in the step |',
  );
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const groups = new Map();
  for (const c of result.cycles) {
    const key = `${c.source}|${c.scenario}|${c.model}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const m = (list, pick) => Math.round(mean(list.map(pick)) * 10) / 10;
  for (const [key, list] of groups) {
    const [source, scenario, model] = key.split('|');
    lines.push(
      `| ${source} | ${scenario} | ${model} | ${list.length} | ${m(list, (c) => c.steps)} | ` +
        `${m(list, (c) => c.verbs['workflow start'])} | ${m(list, (c) => c.verbs['workflow finalize'])} | ` +
        `${m(list, (c) => c.verbs['workflow next'])} | ${m(list, (c) => c.verbs['workflow status'])} | ` +
        `${m(list, (c) => c.asked)} | ${m(list, (c) => c.replies)} | ${m(list, (c) => c.approvedOnApproval)} | ` +
        `${m(list, (c) => c.approvedOnOtherReply)} | ${m(list, (c) => c.approvedWithoutReply)} |`,
    );
  }
  lines.push(
    '',
    '**H1, H2 and H8 on the engine** (wingfoil ÷ its comparison; n wingfoil/other; as pages report it)',
    '',
  );
  lines.push(
    '| Execution | Scenario | Model | H1 cost ÷ baseline | H2 turns ÷ baseline | H8 cost ÷ baseline-docs |',
  );
  lines.push('|---|---|---|---|---|---|');
  for (const r of result.ratios)
    lines.push(
      `| ${r.execution} | ${r.scenario} | ${r.model} | ${cell(r.h1)} | ${cell(r.h2)} | ${cell(r.h8)} |`,
    );
  lines.push(
    '',
    "**H8's mean** (wingfoil ÷ baseline-docs in cost, the mean of S1, S2, S3 and S8's ratios)",
    '',
  );
  lines.push('| Execution | Model | Scenarios | Mean | Per scenario |');
  lines.push('|---|---|---|---|---|');
  for (const h of result.h8)
    lines.push(`| ${h.execution} | ${h.model} | ${h.scenarios} | ${h.mean}× | ${h.values.join(', ')} |`);
  lines.push('', '**What each execution pins**', '');
  lines.push('| Execution | Approver policy | WingFoil | WingFoil commit | wingfoil arm digest | Agent |');
  lines.push('|---|---|---|---|---|---|');
  for (const p of result.pins)
    lines.push(
      `| ${p.execution} | ${p.approver_policy} | ${p.wingfoil} | ${p.wingfoil_commit} | ${p.wingfoil_digest} | ${p.agent} |`,
    );
  return `${lines.join('\n')}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const md = args[0] === '--markdown';
  const [resultsDir, ...sources] = md ? args.slice(1) : args;
  if (resultsDir === undefined || sources.length === 0) {
    process.stderr.write('usage: step-a-reading.mjs [--markdown] <results-dir> <execution-or-dry-run>…\n');
    process.exit(2);
  }
  const result = reading(resultsDir, sources);
  process.stdout.write(md ? markdown(result) : `${JSON.stringify(result, null, 2)}\n`);
}
