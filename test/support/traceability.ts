import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export interface GherkinScenario {
  readonly file: string;
  readonly features: readonly string[];
  readonly title: string;
}

const FEATURE_TAG = /^@F\d+\.\d+$/;
const SCENARIO_LINE = /^\s*Scenario(?: Outline)?:\s*(.+?)\s*$/;

/** Every scenario of a `.feature` file, with its `@F<n>.<m>` tags in declaration order. */
export function parseFeatureFile(file: string, text: string): GherkinScenario[] {
  const scenarios: GherkinScenario[] = [];
  let tags: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('@')) {
      tags.push(...trimmed.split(/\s+/));
      continue;
    }
    const match = SCENARIO_LINE.exec(line);
    if (match?.[1]) {
      scenarios.push({
        file,
        features: tags.filter((tag) => FEATURE_TAG.test(tag)).map((tag) => tag.slice(1)),
        title: match[1],
      });
    }
    if (trimmed !== '') tags = [];
  }
  return scenarios;
}

/** The expected acceptance test title of a scenario: its feature tags, then its title. */
export function acceptanceTitle(scenario: GherkinScenario): string {
  return [...scenario.features.map((feature) => `@${feature}`), scenario.title].join(' ');
}

export function readScenarios(acceptanceDir: string): GherkinScenario[] {
  return readdirSync(acceptanceDir)
    .filter((name) => name.endsWith('.feature'))
    .sort()
    .flatMap((name) => parseFeatureFile(name, readFileSync(join(acceptanceDir, name), 'utf8')));
}

const STARTED = new Set(['in-progress', 'in-review', 'approved', 'done']);

/** Features of every task that has started (`in-progress` or later). */
export function startedFeatures(taskDir: string): Set<string> {
  const features = new Set<string>();
  for (const name of readdirSync(taskDir)
    .filter((n) => n.endsWith('.md'))
    .sort()) {
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(taskDir, name), 'utf8'))?.[1];
    const task = parse(frontmatter ?? '') as { status?: string; features?: string[] } | null;
    if (task?.status && STARTED.has(task.status)) task.features?.forEach((feature) => features.add(feature));
  }
  return features;
}

const TITLE_LITERAL = /(['"`])(@F\d+\.\d+ [^'"`]+)\1/g;

/** Acceptance test titles found by a static scan of the test files. */
export function acceptanceTestTitles(testDir: string): Set<string> {
  const titles = new Set<string>();
  for (const name of readdirSync(testDir).filter((n) => n.endsWith('.test.ts'))) {
    for (const match of readFileSync(join(testDir, name), 'utf8').matchAll(TITLE_LITERAL)) {
      if (match[2]) titles.add(match[2]);
    }
  }
  return titles;
}
