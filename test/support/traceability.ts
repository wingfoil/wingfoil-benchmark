import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/** One Gherkin scenario: the file it is in, its feature tags (inherited ones first) and its title. */
export interface GherkinScenario {
  readonly file: string;
  readonly features: readonly string[];
  readonly title: string;
}

const FEATURE_TAG = /^@F\d+\.\d+$/;
const CONTAINER_LINE = /^(Feature|Rule):/;
const SCENARIO_LINE = /^(?:Scenario Outline|Scenario Template|Scenario|Example):\s*(.+?)\s*$/;

/**
 * Every scenario of a `.feature` file, with its `@F<n>.<m>` tags: those of the enclosing Feature or
 * Rule first, then its own. Comment lines keep pending tags; CRLF files are read as LF.
 */
export function parseFeatureFile(file: string, text: string): GherkinScenario[] {
  const scenarios: GherkinScenario[] = [];
  let inherited: string[] = [];
  let pending: string[] = [];
  for (const line of text.split(/\r?\n/).map((l) => l.trim())) {
    if (line === '' || line.startsWith('#')) continue;
    if (line.startsWith('@')) {
      pending.push(
        ...line
          .split(/\s+/)
          .filter((tag) => FEATURE_TAG.test(tag))
          .map((tag) => tag.slice(1)),
      );
      continue;
    }
    if (CONTAINER_LINE.test(line)) {
      inherited = line.startsWith('Feature') ? pending : [...inherited, ...pending];
    }
    const title = SCENARIO_LINE.exec(line)?.[1];
    if (title) scenarios.push({ file, features: [...new Set([...inherited, ...pending])], title });
    pending = [];
  }
  return scenarios;
}

/** The expected acceptance test title of a scenario: its feature tags, then its title. */
export function acceptanceTitle(scenario: GherkinScenario): string {
  return [...scenario.features.map((feature) => `@${feature}`), scenario.title].join(' ');
}

/** Every scenario of every `.feature` file in `acceptanceDir`, files in name order. */
export function readScenarios(acceptanceDir: string): GherkinScenario[] {
  return readdirSync(acceptanceDir)
    .filter((name) => name.endsWith('.feature'))
    .sort()
    .flatMap((name) => parseFeatureFile(name, readFileSync(join(acceptanceDir, name), 'utf8')));
}

const STARTED = new Set(['in-progress', 'in-review', 'approved', 'done']);
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/** Features of every task that has started (`in-progress` or later). */
export function startedFeatures(taskDir: string): Set<string> {
  const features = new Set<string>();
  for (const name of readdirSync(taskDir)
    .filter((n) => n.endsWith('.md'))
    .sort()) {
    const frontmatter = FRONTMATTER.exec(readFileSync(join(taskDir, name), 'utf8'))?.[1];
    const task = parse(frontmatter ?? '') as { status?: string; features?: string[] } | null;
    if (task?.status && STARTED.has(task.status)) task.features?.forEach((feature) => features.add(feature));
  }
  return features;
}

const COMMENTS = /\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm;
const TEST_CALL =
  /\b(?:it|test)(?:\.each\([^)]*\))?\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/g;

/**
 * Titles of the `it(…)` and `test(…)` calls in the test files of `testDir` that start with `@F`, found by
 * a static scan. Comments are ignored, and so are `it.skip`/`it.todo`, which do not verify anything.
 */
export function acceptanceTestTitles(testDir: string): Set<string> {
  const titles = new Set<string>();
  for (const name of readdirSync(testDir)
    .filter((n) => n.endsWith('.test.ts'))
    .sort()) {
    const source = readFileSync(join(testDir, name), 'utf8').replace(COMMENTS, '');
    for (const match of source.matchAll(TEST_CALL)) {
      const title = (match[1] ?? match[2] ?? match[3] ?? '').replace(/\\(.)/g, '$1');
      if (title.startsWith('@F')) titles.add(title);
    }
  }
  return titles;
}
