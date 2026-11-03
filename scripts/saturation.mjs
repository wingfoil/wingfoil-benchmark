#!/usr/bin/env node
// K6 (scenario conventions, amendment 1.5): whether a scenario version is saturated in the published executions, the
// catalogue's (site-content/catalog.yaml): every run of every arm, the slices' included, at the maximum of its final
// public hidden tests. A version 1.1 records its 1.0's answer (task-131).
//
//   node scripts/saturation.mjs <scenario> <version>
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const [scenario, version] = process.argv.slice(2);
if (scenario === undefined || version === undefined) {
  process.stderr.write('usage: node scripts/saturation.mjs <scenario> <version>\n');
  process.exit(2);
}
const catalog = parse(readFileSync('site-content/catalog.yaml', 'utf8')).executions;
let runs = 0;
let atMaximum = 0;
const below = new Map();
for (const execution of Object.keys(catalog)) {
  const file = join('results', execution, 'aggregate.json');
  if (!existsSync(file)) continue;
  const aggregate = JSON.parse(readFileSync(file, 'utf8'));
  for (const group of [...aggregate.groups, ...aggregate.slices]) {
    if (group.scenario !== scenario || group.version !== version) continue;
    for (const value of group.metrics.m_q1.final.m_q1.values) {
      runs += 1;
      if (value.total > 0 && value.passed === value.total) atMaximum += 1;
      else below.set(`${execution} ${group.arm}`, (below.get(`${execution} ${group.arm}`) ?? 0) + 1);
    }
  }
}
const executions = new Set([...below.keys()].map((key) => key.split(' ')[0]));
const arms = new Set([...below.keys()].map((key) => key.split(' ')[1]));
process.stdout.write(
  `${scenario}@${version}: ${atMaximum} of ${runs} runs at their final public maximum; ` +
    `saturated: ${runs > 0 && atMaximum === runs}\n` +
    `below the maximum: ${runs - atMaximum} runs, in ${arms.size} arms across ${executions.size} executions\n`,
);
