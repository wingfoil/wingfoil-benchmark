#!/usr/bin/env node
// The configuring sessions read from their records (task-143, REQ-RUN-20): one row per scenario version and configured
// arm, from the newest record of `scenarios/<id>/<version>/configured/<arm>.json`, and the sum of every record's cost.
// It runs no agent, spends nothing and writes nothing; it prints a Markdown table for docs/calibration/configuring.md.
//
// Usage: node scripts/configuring-reading.mjs [root]   (root: the repository, by default the working directory)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const scenarios = join(root, 'scenarios');

const rows = [];
let total = 0;
let sessions = 0;
for (const id of existsSync(scenarios) ? readdirSync(scenarios).sort() : []) {
  const dir = join(scenarios, id);
  if (!statSync(dir).isDirectory()) continue;
  for (const version of readdirSync(dir).sort()) {
    const configured = join(dir, version, 'configured');
    if (!existsSync(configured) || !statSync(configured).isDirectory()) continue;
    for (const file of readdirSync(configured)
      .filter((name) => name.endsWith('.json'))
      .sort()) {
      const records = JSON.parse(readFileSync(join(configured, file), 'utf8'));
      for (const record of records) {
        total += record.cost_eur;
        sessions += 1;
      }
      const newest = records.at(-1);
      // A session that ended before its step reported no usage counts none (REQ-RUN-20 as amended in 1.53).
      const usage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        turns: 0,
        ...newest.usage,
      };
      const tokens =
        usage.inputTokens + usage.outputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
      const files = (newest.files ?? []).map((entry) => `\`${entry.path}\``).join(', ');
      rows.push(
        `| ${id}@${version} | ${file.replace(/\.json$/, '')} | ${records.length} | ${newest.outcome} | ` +
          `${newest.cost_eur.toFixed(4)} | ${newest.wall_time_s.toFixed(1)} | ${usage.turns} | ` +
          `${usage.outputTokens} | ${tokens} | ${files} |`,
      );
    }
  }
}

console.log(
  '| Version | Configured arm | Sessions | Outcome | Cost (EUR) | Wall time (s) | Turns | Output tokens | ' +
    'All tokens | Files written |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const row of rows) console.log(row);
console.log('');
console.log(`Sessions: ${sessions}; their cost: ${total.toFixed(4)} EUR.`);
