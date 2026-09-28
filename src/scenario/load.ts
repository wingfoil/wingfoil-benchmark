import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { ARM_NAME, fail, ok, parseWith, readYamlFile, scenarioSchema } from '../core/index.js';
import type { Issue, Result, Scenario, ScenarioFile, ThirdParty } from '../core/index.js';

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
 * version against their directories; then every suite's steps against the declared steps (dl-001);
 * then every declared path on disk, in declaration order; then the entries of `arms/`; then every
 * overlap between what the agent sees and what it must not see, and between the oracle's own paths;
 * then the third-party files outside every suite and those that no longer match their `sha256` (dl-002).
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
    ...suiteStepIssues(spec),
    ...fileIssues([seed, ...others], dir),
    ...arms.issues,
  ];
  if (issues.length === 0) issues.push(...overlapIssues(seed, others, arms.declared, dir));
  if (issues.length === 0) issues.push(...vendoredIssues(spec, dir));
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

/** A suite may only be scored after a step the scenario declares (dl-001). */
function suiteStepIssues(spec: ScenarioFile): Issue[] {
  const last = spec.steps.length;
  return spec.oracle.suites.flatMap((suite, index) =>
    suite.after_steps.flatMap((n, position): Issue[] =>
      n >= 1 && n <= last
        ? []
        : [
            {
              path: `oracle.suites[${index}].after_steps[${position}]`,
              message: `must be a declared step: the scenario has steps 1–${last}`,
            },
          ],
    ),
  );
}

/** Every path the file declares besides the seed, in declaration order. */
function otherPaths(spec: ScenarioFile): Declared[] {
  return [
    ...spec.steps.map((step, index): Declared => ({
      path: `steps[${index}].prompt_file`,
      relative: step.prompt_file,
      kind: 'file',
    })),
    ...spec.oracle.suites.map((suite, index): Declared => ({
      path: `oracle.suites[${index}].dir`,
      relative: suite.dir,
      kind: 'directory',
    })),
    ...spec.oracle.checks.map((check, index): Declared => ({
      path: `oracle.checks[${index}]`,
      relative: check,
      kind: 'file',
    })),
    ...vendoredFiles(spec),
  ];
}

/** The files each third-party entry vendors (dl-002), in declaration order. */
function vendoredFiles(spec: ScenarioFile): Declared[] {
  return spec.oracle.third_party.flatMap((entry, index) =>
    entry.files.map((file, position): Declared => ({
      path: `oracle.third_party[${index}].files[${position}]`,
      relative: file,
      kind: 'file',
    })),
  );
}

/**
 * Third-party material is oracle material (dl-002): each vendored file lies in a declared suite, so
 * that it is hidden from the agent, leak-scanned and mounted read-only for scoring like the suite's
 * tests; and a file pinned by `sha256` still has that SHA-256, so that material changed after it was
 * pinned stops every command that loads the scenario. A `commit` is not checked against its source,
 * which would need the network; the version's hash covers its files (REQ-FMT-09). On real paths, the
 * files existing (checked before).
 */
function vendoredIssues(spec: ScenarioFile, dir: string): Issue[] {
  const suites = spec.oracle.suites.map((suite) => realpathSync(resolve(dir, suite.dir)));
  return spec.oracle.third_party.flatMap((entry, index) => {
    const outside = entry.files.flatMap((file, position): Issue[] => {
      const real = realpathSync(resolve(dir, file));
      return suites.some((suite) => isInside(real, suite))
        ? []
        : [
            {
              path: `oracle.third_party[${index}].files[${position}]`,
              message: `'${file}' is in no suite of oracle.suites`,
            },
          ];
    });
    if (outside.length > 0 || entry.sha256 === undefined) return outside;
    const [file] = entry.files;
    const digest = createHash('sha256')
      .update(readFileSync(resolve(dir, file ?? '')))
      .digest('hex');
    return digest === entry.sha256
      ? []
      : [{ path: `oracle.third_party[${index}].sha256`, message: `does not match '${file}'` }];
  });
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
 * must not receive a rule (K3, dl-005). Within the oracle, suites are disjoint — a test in two suites
 * would be scored after steps nobody bound it to — and a check, a pattern file (REQ-SCO-06), is in no
 * suite (dl-001). Checked on real paths; every overlap is reported, seed first, then the prompts, then
 * the oracle, each on the later path, in declaration order.
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
  const suites = others.filter(({ path }) => path.startsWith('oracle.suites['));
  const checks = others.filter(({ path }) => path.startsWith('oracle.checks['));
  const pairs = [
    ...[scenarioFile, ...others, ...arms].map((other) => [seed, other] as const),
    ...prompts.flatMap((prompt) => hidden.map((other) => [prompt, other] as const)),
    ...suites.flatMap((later, index) => suites.slice(0, index).map((earlier) => [later, earlier] as const)),
    ...checks.flatMap((check) => suites.map((suite) => [check, suite] as const)),
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
      suites: spec.oracle.suites.map((suite) => ({
        id: suite.id,
        dir: resolve(dir, suite.dir),
        afterSteps: [...suite.after_steps].sort((a, b) => a - b),
      })),
      checks: spec.oracle.checks.map((check) => resolve(dir, check)),
      thirdParty: spec.oracle.third_party.map(
        ({ name, url, license, commit, sha256, files }): ThirdParty => ({
          name,
          url,
          license,
          pin: commit !== undefined ? { commit } : { sha256: sha256 ?? '' },
          files: files.map((file) => resolve(dir, file)),
        }),
      ),
    },
    holdout: spec.holdout,
    hash: scenarioHash(dir),
    armDirs: Object.fromEntries(
      arms.map(({ relative }) => [relative.slice(ARMS_DIR.length + 1), resolve(dir, relative)]),
    ),
  };
}
