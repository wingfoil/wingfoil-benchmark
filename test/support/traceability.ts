import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
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
 * Every scenario of a `.feature` file, with its `@F<n>.<m>` tags: those of the Feature, then those of
 * the enclosing Rule (each Rule only its own), then the scenario's. Comment lines keep pending tags; CRLF files are read as LF.
 */
export function parseFeatureFile(file: string, text: string): GherkinScenario[] {
  const scenarios: GherkinScenario[] = [];
  let featureTags: string[] = [];
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
      if (line.startsWith('Feature')) featureTags = pending;
      inherited = [...featureTags, ...(line.startsWith('Rule') ? pending : [])];
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

/**
 * The scenarios the started tasks require an acceptance test for (task-064, the approver's choice of 2026-10-06): a
 * task whose `acceptance` names scenarios as `<file>#<title>` requires those; a task that names none requires every
 * scenario of its `features`, as before. A named scenario that does not exist is reported in `unknown`, so that a
 * renamed one cannot drop out silently. A bare `<file>.feature` entry stays information, as in v0.1's tasks.
 */
export function requiredScenarios(
  taskDir: string,
  scenarios: readonly GherkinScenario[],
): { required: GherkinScenario[]; unknown: string[] } {
  const required = new Set<GherkinScenario>();
  const unknown: string[] = [];
  for (const name of readdirSync(taskDir)
    .filter((n) => n.endsWith('.md'))
    .sort()) {
    const frontmatter = FRONTMATTER.exec(readFileSync(join(taskDir, name), 'utf8'))?.[1];
    const task = parse(frontmatter ?? '') as {
      status?: string;
      features?: string[];
      acceptance?: string[];
    } | null;
    if (!task?.status || !STARTED.has(task.status)) continue;
    const named = (task.acceptance ?? []).filter((entry) => entry.includes('#'));
    if (named.length === 0) {
      for (const scenario of scenarios)
        if (scenario.features.some((feature) => task.features?.includes(feature))) required.add(scenario);
      continue;
    }
    for (const entry of named) {
      const [file, title] = [entry.slice(0, entry.indexOf('#')), entry.slice(entry.indexOf('#') + 1)];
      const scenario = scenarios.find((candidate) => candidate.file === file && candidate.title === title);
      if (scenario === undefined) unknown.push(`${name}: ${entry}`);
      else required.add(scenario);
    }
  }
  return { required: scenarios.filter((scenario) => required.has(scenario)), unknown };
}

/** The front matter fields the bug link check reads, from a task or a bug. */
interface LinkedElement {
  readonly id: string;
  readonly status?: string;
  readonly fixes?: readonly string[];
  readonly fixed_by?: string;
}

/**
 * Every element of `dir` by id, read from its front matter, files in name order. A file without an id, or repeating
 * an id already read, is reported in `problems` and left out.
 */
function readElements(dir: string, problems: string[]): Map<string, LinkedElement> {
  const elements = new Map<string, LinkedElement>();
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .sort()) {
    const frontmatter = FRONTMATTER.exec(readFileSync(join(dir, name), 'utf8'))?.[1];
    const element = parse(frontmatter ?? '') as LinkedElement | null;
    if (!element?.id) problems.push(`${name} has no id`);
    else if (elements.has(element.id)) problems.push(`${name} repeats the id ${element.id}`);
    else elements.set(element.id, element);
  }
  return elements;
}

/** A task's `fixes` as a list: empty when absent, and when it is not a list (reported by the caller). */
function fixesOf(task: LinkedElement): readonly string[] {
  return Array.isArray(task.fixes) ? task.fixes : [];
}

/**
 * Where a task's `fixes` and a bug's `fixed_by` disagree (bug-005, task-058): a `fixes` that is not a list, or an
 * entry naming no bug; a `fixed_by` naming no task, or a task that does not list the bug; a `fixed` bug without
 * `fixed_by` or whose task is not `done`; a `done` task whose bug is neither `fixed` nor `deprecated`; an element
 * without an id, or two with one id. Empty when the links agree.
 */
export function bugLinkProblems(taskDir: string, bugDir: string): string[] {
  const problems: string[] = [];
  const tasks = readElements(taskDir, problems);
  const bugs = readElements(bugDir, problems);
  for (const task of tasks.values()) {
    if (task.fixes !== undefined && !Array.isArray(task.fixes))
      problems.push(`${task.id} has a fixes that is not a list`);
    for (const bugId of fixesOf(task)) {
      const bug = bugs.get(bugId);
      if (!bug) problems.push(`${task.id} fixes ${bugId}, which does not exist`);
      else if (task.status === 'done' && bug.status !== 'fixed' && bug.status !== 'deprecated')
        problems.push(`${task.id} is done but ${bugId} is ${bug.status}, not fixed`);
    }
  }
  for (const bug of bugs.values()) {
    if (bug.fixed_by === undefined) {
      if (bug.status === 'fixed') problems.push(`${bug.id} is fixed but names no fixed_by task`);
      continue;
    }
    const task = tasks.get(bug.fixed_by);
    if (!task) problems.push(`${bug.id} is fixed_by ${bug.fixed_by}, which does not exist`);
    else if (!fixesOf(task).includes(bug.id))
      problems.push(`${bug.id} is fixed_by ${task.id}, whose fixes does not list it`);
    else if (bug.status === 'fixed' && task.status !== 'done')
      problems.push(`${bug.id} is fixed by ${task.id}, which is ${task.status}, not done`);
  }
  return problems;
}

/** Modifiers after which a test does not verify anything. */
const NOT_VERIFYING = new Set(['skip', 'todo', 'skipIf', 'runIf', 'fails']);

/** Whether `callee` is `it`/`test`, possibly with modifiers (`.only`, `.each(…)`), none of them skipping. */
function isTestCallee(callee: ts.Expression): boolean {
  if (ts.isIdentifier(callee)) return callee.text === 'it' || callee.text === 'test';
  if (ts.isPropertyAccessExpression(callee)) {
    return !NOT_VERIFYING.has(callee.name.text) && isTestCallee(callee.expression);
  }
  if (ts.isCallExpression(callee)) return isTestCallee(callee.expression);
  if (ts.isTaggedTemplateExpression(callee)) return isTestCallee(callee.tag);
  return false;
}

/** Whether `callee` is `describe`/`suite` with a modifier chain that skips it (`.skip`, `.todo`, …). */
function isSkippedSuite(callee: ts.Expression): boolean {
  if (ts.isPropertyAccessExpression(callee)) {
    return NOT_VERIFYING.has(callee.name.text)
      ? isSuiteRoot(callee.expression)
      : isSkippedSuite(callee.expression);
  }
  if (ts.isCallExpression(callee)) return isSkippedSuite(callee.expression);
  if (ts.isTaggedTemplateExpression(callee)) return isSkippedSuite(callee.tag);
  return false;
}

function isSuiteRoot(callee: ts.Expression): boolean {
  if (ts.isIdentifier(callee)) return callee.text === 'describe' || callee.text === 'suite';
  if (ts.isPropertyAccessExpression(callee)) return isSuiteRoot(callee.expression);
  if (ts.isCallExpression(callee)) return isSuiteRoot(callee.expression);
  return false;
}

/**
 * Titles of the test calls in the test files of `testDir` that start with `@F`, read from the
 * TypeScript syntax tree: comments and non-test calls never count, and neither do `skip`/`todo`
 * tests or tests inside skipped suites. Titles computed at run time (template literals with `${}`)
 * are not collected. A static scan cannot see that a test sits in dead code, that `it` is shadowed by
 * a local function, or that a test body is empty.
 */
export function acceptanceTestTitles(testDir: string): Set<string> {
  const titles = new Set<string>();
  for (const name of readdirSync(testDir)
    .filter((n) => n.endsWith('.test.ts'))
    .sort()) {
    const file = ts.createSourceFile(name, readFileSync(join(testDir, name), 'utf8'), ts.ScriptTarget.Latest);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && isSkippedSuite(node.expression)) return;
      if (ts.isCallExpression(node) && isTestCallee(node.expression)) {
        const [title] = node.arguments;
        if (
          title &&
          (ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title)) &&
          title.text.startsWith('@F')
        ) {
          titles.add(title.text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return titles;
}
