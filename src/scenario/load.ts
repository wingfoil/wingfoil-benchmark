import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

import { fail, formatPath, ok, scenarioSchema } from '../core/index.js';
import type { Issue, Result, Scenario, ScenarioFile } from '../core/index.js';

const SCENARIO_FILE = 'scenario.yaml';

/**
 * Load `<scenariosRoot>/<id>/<version>/scenario.yaml` (REQ-ARC-03, REQ-FMT-04). Schema issues come
 * first, in schema order; then the id and version are compared with their directories; then every
 * declared path is checked on disk, in declaration order.
 */
export function loadScenario(scenariosRoot: string, id: string, version: string): Result<Scenario> {
  const dir = join(scenariosRoot, id, version);
  const file = join(dir, SCENARIO_FILE);
  if (!existsSync(file)) {
    return fail([{ path: SCENARIO_FILE, message: `not found in ${dir}` }]);
  }

  let data: unknown;
  try {
    data = parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return fail([{ path: SCENARIO_FILE, message: `is not valid YAML: ${(error as Error).message}` }]);
  }

  const parsed = scenarioSchema.safeParse(data, {
    error: (issue) =>
      issue.code === 'invalid_type' && issue.input === undefined ? 'is required' : undefined,
  });
  if (!parsed.success) {
    return fail(
      parsed.error.issues.map((issue) => ({ path: formatPath(issue.path), message: issue.message })),
    );
  }

  const spec = parsed.data;
  const issues = [...identityIssues(spec, id, version), ...fileIssues(spec, dir)];
  return issues.length > 0 ? fail(issues) : ok(resolve(spec, dir));
}

function identityIssues(spec: ScenarioFile, id: string, version: string): Issue[] {
  const issues: Issue[] = [];
  if (spec.id !== id) issues.push({ path: 'id', message: `'${spec.id}' differs from its directory '${id}'` });
  if (spec.version !== version) {
    issues.push({ path: 'version', message: `'${spec.version}' differs from its directory '${version}'` });
  }
  return issues;
}

function fileIssues(spec: ScenarioFile, dir: string): Issue[] {
  const expected: { path: string; relative: string; kind: 'file' | 'directory' }[] = [
    { path: 'seed', relative: spec.seed, kind: 'directory' },
    ...spec.steps.map((step, index) => ({
      path: `steps[${index}].prompt_file`,
      relative: step.prompt_file,
      kind: 'file' as const,
    })),
    { path: 'oracle.public_tests', relative: spec.oracle.public_tests, kind: 'directory' },
    ...spec.oracle.checks.map((check, index) => ({
      path: `oracle.checks[${index}]`,
      relative: check,
      kind: 'file' as const,
    })),
  ];
  return expected
    .filter(({ relative, kind }) => !exists(join(dir, relative), kind))
    .map(({ path, relative, kind }) => ({ path, message: `${kind} '${relative}' does not exist` }));
}

function exists(path: string, kind: 'file' | 'directory'): boolean {
  if (!existsSync(path)) return false;
  const stats = statSync(path);
  return kind === 'file' ? stats.isFile() : stats.isDirectory();
}

function resolve(spec: ScenarioFile, dir: string): Scenario {
  return {
    id: spec.id,
    version: spec.version,
    dir,
    categories: spec.categories,
    profiles: spec.profiles,
    gqm: spec.gqm,
    capabilities: spec.capabilities,
    seedDir: join(dir, spec.seed),
    steps: spec.steps.map((step) => ({ n: step.n, promptPath: join(dir, step.prompt_file) })),
    oracle: {
      publicTestsDir: join(dir, spec.oracle.public_tests),
      checks: spec.oracle.checks.map((check) => join(dir, check)),
      thirdParty: spec.oracle.third_party,
    },
    holdout: spec.holdout,
  };
}
