#!/usr/bin/env node
// The approver's corpus (task-106): every invocation's final assistant message in the local results' transcripts,
// which is what the neutral approver classifies (REQ-RUN-06). Claude Code: each `result` event's `result`. Codex: the
// last `agent_message` of each thread (from one `thread.started` to the next). Every invocation's last message, failed
// ones included, which the runner never classifies; `#k` numbers the non-empty ones. Transcripts are git-ignored (published
// as release assets), so the corpus is extracted from a checkout that holds them and committed as text only.
//
//   node scripts/approver-corpus.mjs <results-dir> > test/fixtures/approver/corpus.json
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2];
if (root === undefined) {
  process.stderr.write('usage: approver-corpus.mjs <results-dir>\n');
  process.exit(2);
}

function* transcripts(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* transcripts(path);
    else if (name === 'transcript.jsonl') yield path;
  }
}

function finalMessages(text) {
  const out = [];
  let codex;
  for (const line of text.split('\n')) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === 'result' && typeof event.result === 'string')
      out.push({ agent: 'claude-code', text: event.result });
    if (event.type === 'thread.started') {
      if (codex !== undefined) out.push({ agent: 'codex', text: codex });
      codex = '';
    }
    if (
      event.type === 'item.completed' &&
      event.item?.type === 'agent_message' &&
      typeof event.item.text === 'string'
    )
      codex = event.item.text;
  }
  if (codex) out.push({ agent: 'codex', text: codex });
  return out.filter((m) => m.text.trim() !== '');
}

const corpus = [];
for (const path of transcripts(root)) {
  const source = relative(root, path).replace(/\/transcript\.jsonl$/, '');
  finalMessages(readFileSync(path, 'utf8')).forEach((m, i) =>
    corpus.push({ source: `${source}#${i + 1}`, ...m }),
  );
}
process.stdout.write(`${JSON.stringify(corpus, null, 1)}\n`);
