import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { parse } from 'yaml';

import { fail, formatPath, ok, scenarioSchema } from '../core/index.js';
import type { Issue, Result, Scenario, ScenarioFile } from '../core/index.js';

const SCENARIO_FILE = 'scenario.yaml';

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
 * whether the seed overlaps anything the agent must not see.
 */
export function loadScenario(scenariosRoot: string, id: string, version: string): Result<Scenario> {
  const dir = resolve(scenariosRoot, id, version);
  const file = resolve(dir, SCENARIO_FILE);
  if (!existsSync(file)) {
    return fail([{ path: SCENARIO_FILE, message: `not found in ${dir}` }]);
  }

  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    return fail([{ path: SCENARIO_FILE, message: `cannot be read: ${(error as Error).message}` }]);
  }

  let data: unknown;
  try {
    data = parse(text);
  } catch (error) {
    return fail([{ path: SCENARIO_FILE, message: `is not valid YAML: ${(error as Error).message}` }]);
  }
  if (data === null || data === undefined) return fail([{ path: SCENARIO_FILE, message: 'is empty' }]);

  const parsed = scenarioSchema.safeParse(data, {
    error: (issue) =>
      issue.code === 'invalid_type' && issue.input === undefined ? 'is required' : undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues.flatMap(toIssues));

  const spec = parsed.data;
  const seed: Declared = { path: 'seed', relative: spec.seed, kind: 'directory' };
  const others = otherPaths(spec);
  const issues = [...identityIssues(spec, id, version), ...fileIssues([seed, ...others], dir)];
  if (issues.length === 0) issues.push(...seedOverlap(seed, others, dir));
  return issues.length > 0 ? fail(issues) : ok(toScenario(spec, dir));
}

/** One issue per Zod issue, and one per unknown key, each at its own field path. */
function toIssues(issue: { code: string; path: PropertyKey[]; message: string; keys?: string[] }): Issue[] {
  if (issue.code === 'unrecognized_keys' && issue.keys) {
    return issue.keys.map((key) => ({
      path: formatPath([...issue.path, key]),
      message: 'is not a known field',
    }));
  }
  return [{ path: formatPath(issue.path) || SCENARIO_FILE, message: issue.message }];
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
 * The seed is copied into the run container (REQ-RUN-02), so it must not contain, or lie inside,
 * `scenario.yaml`, a step prompt or any oracle path. Only the first overlap is reported.
 */
function seedOverlap(seed: Declared, others: readonly Declared[], dir: string): Issue[] {
  const seedReal = realpathSync(resolve(dir, seed.relative));
  const candidates = [{ path: SCENARIO_FILE, relative: SCENARIO_FILE }, ...others];
  const overlapping = candidates.find(({ relative }) => {
    const real = realpathSync(resolve(dir, relative));
    return isInside(real, seedReal) || isInside(seedReal, real);
  });
  return overlapping ? [{ path: 'seed', message: `'seed' overlaps ${overlapping.path}` }] : [];
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

function toScenario(spec: ScenarioFile, dir: string): Scenario {
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
  };
}
