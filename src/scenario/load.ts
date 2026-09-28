import { existsSync, lstatSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { ARM_NAME, fail, ok, parseWith, readYamlFile, scenarioSchema } from '../core/index.js';
import type { Issue, Result, Scenario, ScenarioFile } from '../core/index.js';

import { scenarioHash } from './hash.js';

const SCENARIO_FILE = 'scenario.yaml';

/** Where a scenario keeps its configuration per arm, one directory per arm name (dl-005). */
const ARMS_DIR = 'arms';

type Kind = 'file' | 'directory';

/** A path declared by `scenario.yaml`: the field that declares it, its value, and what it must be. */
interface Declared {
  readonly path: string;
  readonly relative: string;
  readonly kind: Kind;
}

/**
 * Load `<scenariosRoot>/<id>/<version>/scenario.yaml` (REQ-ARC-03, REQ-FMT-04) and return it with
 * absolute paths. Issues are reported in a stable order: schema issues in schema order; then id and
 * version against their directories; then every declared path on disk, in declaration order; then
 * the entries of `arms/`; then every overlap between what the agent sees and what it must not see.
 */
export function loadScenario(scenariosRoot: string, id: string, version: string): Result<Scenario> {
  const dir = resolve(scenariosRoot, id, version);
  const read = readYamlFile(resolve(dir, SCENARIO_FILE));
  if (!read.ok) return read;
  const parsed = parseWith(scenarioSchema, read.value, SCENARIO_FILE);
  if (!parsed.ok) return parsed;

  const spec = parsed.value;
  const seed: Declared = { path: 'seed', relative: spec.seed, kind: 'directory' };
  const others = otherPaths(spec);
  const arms = armEntries(dir);
  const issues = [
    ...identityIssues(spec, id, version),
    ...fileIssues([seed, ...others], dir),
    ...arms.issues,
  ];
  if (issues.length === 0) issues.push(...overlapIssues(seed, others, arms.declared, dir));
  return issues.length > 0 ? fail(issues) : ok(toScenario(spec, dir, arms.declared));
}

function identityIssues(spec: ScenarioFile, id: string, version: string): Issue[] {
  const issues: Issue[] = [];
  if (spec.id !== id) issues.push({ path: 'id', message: `'${spec.id}' differs from its directory '${id}'` });
  if (spec.version !== version) {
    issues.push({ path: 'version', message: `'${spec.version}' differs from its directory '${version}'` });
  }
  return issues;
}

/** Every path the file declares besides the seed, in declaration order. */
function otherPaths(spec: ScenarioFile): Declared[] {
  return [
    ...spec.steps.map((step, index): Declared => ({
      path: `steps[${index}].prompt_file`,
      relative: step.prompt_file,
      kind: 'file',
    })),
    { path: 'oracle.public_tests', relative: spec.oracle.public_tests, kind: 'directory' },
    ...spec.oracle.checks.map((check, index): Declared => ({
      path: `oracle.checks[${index}]`,
      relative: check,
      kind: 'file',
    })),
  ];
}

/**
 * The directories of `arms/`, found by name (dl-005): each must be a real directory named like an arm.
 * A scenario with no `arms/` has none.
 */
function armEntries(dir: string): { declared: Declared[]; issues: Issue[] } {
  const root = resolve(dir, ARMS_DIR);
  if (!existsSync(root)) return { declared: [], issues: [] };
  const declared: Declared[] = [];
  const issues: Issue[] = [];
  for (const name of readdirSync(root).sort()) {
    const relative = `${ARMS_DIR}/${name}`;
    const stats = lstatSync(resolve(root, name));
    if (stats.isSymbolicLink()) issues.push({ path: ARMS_DIR, message: `'${relative}' is a symbolic link` });
    else if (!stats.isDirectory())
      issues.push({ path: ARMS_DIR, message: `'${relative}' is not a directory` });
    else if (!ARM_NAME.test(name))
      issues.push({ path: ARMS_DIR, message: `'${relative}' is not an arm name` });
    else declared.push({ path: `${ARMS_DIR}.${name}`, relative, kind: 'directory' });
  }
  return { declared, issues };
}

function fileIssues(declared: readonly Declared[], dir: string): Issue[] {
  const root = realpathSync(dir);
  return declared.flatMap(({ path, relative, kind }): Issue[] => {
    const target = resolve(dir, relative);
    if (!exists(target, kind)) return [{ path, message: `${kind} '${relative}' does not exist` }];
    if (!isInside(realpathSync(target), root)) {
      return [{ path, message: `'${relative}' leads outside the scenario directory` }];
    }
    return [];
  });
}

/**
 * What the agent sees must be disjoint from what it must not see (REQ-RUN-02). The seed is copied into
 * the run container, so it must not contain or lie inside `scenario.yaml`, any step prompt, any
 * oracle path or any arm's configuration; a step prompt is given to the agent in every arm, so it must
 * not be or lie inside `scenario.yaml`, an oracle path or an arm's configuration — the baseline arm
 * must not receive a rule (K3, dl-005). Checked on real paths; every overlap is reported, seed first,
 * in declaration order.
 */
function overlapIssues(
  seed: Declared,
  others: readonly Declared[],
  arms: readonly Declared[],
  dir: string,
): Issue[] {
  const scenarioFile = { path: SCENARIO_FILE, relative: SCENARIO_FILE };
  const prompts = others.filter(({ path }) => path.startsWith('steps['));
  const hidden = [scenarioFile, ...others.filter(({ path }) => path.startsWith('oracle.')), ...arms];
  const pairs = [
    ...[scenarioFile, ...others, ...arms].map((other) => [seed, other] as const),
    ...prompts.flatMap((prompt) => hidden.map((other) => [prompt, other] as const)),
  ];
  const realOf = (relative: string) => realpathSync(resolve(dir, relative));
  return pairs
    .filter(([a, b]) => overlap(realOf(a.relative), realOf(b.relative)))
    .map(([a, b]) => ({ path: a.path, message: `'${a.path}' overlaps ${b.path}` }));
}

function overlap(a: string, b: string): boolean {
  return isInside(a, b) || isInside(b, a);
}

function exists(path: string, kind: Kind): boolean {
  if (!existsSync(path)) return false;
  const stats = statSync(path);
  return kind === 'file' ? stats.isFile() : stats.isDirectory();
}

/** Whether `path` is `root` or below it; both are real paths, so symbolic links cannot escape. */
function isInside(path: string, root: string): boolean {
  return path === root || path.startsWith(root + sep);
}

function toScenario(spec: ScenarioFile, dir: string, arms: readonly Declared[]): Scenario {
  return {
    id: spec.id,
    version: spec.version,
    dir,
    categories: spec.categories,
    profiles: spec.profiles,
    gqm: spec.gqm,
    capabilities: spec.capabilities,
    seedDir: resolve(dir, spec.seed),
    steps: spec.steps.map((step) => ({ n: step.n, promptPath: resolve(dir, step.prompt_file) })),
    oracle: {
      publicTestsDir: resolve(dir, spec.oracle.public_tests),
      checks: spec.oracle.checks.map((check) => resolve(dir, check)),
      thirdParty: spec.oracle.third_party,
    },
    holdout: spec.holdout,
    hash: scenarioHash(dir),
    armDirs: Object.fromEntries(
      arms.map(({ relative }) => [relative.slice(ARMS_DIR.length + 1), resolve(dir, relative)]),
    ),
  };
}
