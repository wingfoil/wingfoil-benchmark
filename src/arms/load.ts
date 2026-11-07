import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { armSchema, fail, matchesGlob, ok, parseWith, readYamlFile } from '../core/index.js';
import type { Arm, ArmFile, Issue, Result } from '../core/index.js';
import { isConfigurationPath, MANUAL_PATHS } from './places.js';
import { rulesPlaceOf } from './rules.js';

const ARM_FILE = 'arm.yaml';

type Kind = 'file' | 'directory';

/** A path declared by `arm.yaml`: the field that declares it, its value, and what it must be. */
interface Declared {
  readonly path: keyof ArmFile;
  readonly relative: string;
  readonly kind: Kind;
}

/**
 * Load `<armsRoot>/<name>/arm.yaml` (REQ-ARC-03, REQ-FMT-05) and return it with absolute paths.
 * Issues come in a stable order: schema issues; then the name against its directory; then a choice of directives on
 * an arm that is not a docs control, or on one not generated from wingfoil; then every declared path, in declaration
 * order. No declared path may be a symbolic link, nor hold one: the
 * environment is copied into the workspace and the directory into the container, and nothing there
 * may point outside them (the seed's rule, task-003).
 */
export function loadArm(armsRoot: string, name: string): Result<Arm> {
  const dir = resolve(armsRoot, name);
  const read = readYamlFile(join(dir, ARM_FILE));
  if (!read.ok) return read;
  const parsed = parseWith(armSchema, read.value, ARM_FILE);
  if (!parsed.ok) return parsed;

  const spec = parsed.value;
  if (spec.name !== name) {
    return fail([{ path: 'name', message: `'${spec.name}' differs from its directory '${name}'` }]);
  }
  if (spec.docs_directives !== undefined && spec.docs_of === undefined) {
    return fail([
      { path: 'docs_directives', message: 'only a docs control (docs_of) chooses the directives it renders' },
    ]);
  }
  // Only the wingfoil arm's docs generator reads the choice (review round 1): elsewhere it would move a digest alone.
  if (spec.docs_directives !== undefined && spec.docs_of !== 'wingfoil') {
    return fail([
      { path: 'docs_directives', message: 'only a docs control of the wingfoil arm chooses its directives' },
    ]);
  }
  const places = placeIssues(spec);
  if (places.length > 0) return fail(places);
  const declared: Declared[] = [
    { path: 'setup', relative: spec.setup, kind: 'file' },
    { path: 'manual', relative: spec.manual, kind: 'file' },
    ...(spec.environment === undefined
      ? []
      : [{ path: 'environment', relative: spec.environment, kind: 'directory' } as const]),
    ...(spec.mcp === undefined ? [] : [{ path: 'mcp', relative: spec.mcp, kind: 'file' } as const]),
  ];
  const issues = declared.flatMap((entry) => pathIssues(entry, dir));
  // An arm holds no link, declared or not (REQ-FMT-05 as amended in 1.51, task-139, bug-034): its digest hashes a
  // link by its target, so a link anywhere is refused here, where the arm is read.
  if (issues.length === 0) {
    issues.push(...linksIn(dir).map((link) => ({ path: link, message: `'${link}' is a symbolic link` })));
  }
  if (issues.length === 0 && spec.mcp !== undefined) issues.push(...jsonIssues(spec.mcp, dir));
  return issues.length > 0 ? fail(issues) : ok(toArm(spec, dir));
}

/**
 * REQ-FMT-05 as amended in 1.50: a harness arm's configuration places come with its state places (an empty list stated
 * so), match no manual's path, and include the place of its tool's project rules, which no state place may cover.
 */
function placeIssues(spec: ArmFile): Issue[] {
  const { configuration, state } = spec;
  if (configuration === undefined) {
    return state === undefined ? [] : [{ path: 'state', message: 'is declared only beside configuration' }];
  }
  if (spec.requires === undefined) {
    return [
      { path: 'configuration', message: 'only a harness arm (requires) declares configuration places' },
    ];
  }
  if (state === undefined) {
    return [
      {
        path: 'state',
        message: 'is required beside configuration: an empty list where the tool keeps no state',
      },
    ];
  }
  const issues: Issue[] = configuration.flatMap(({ glob }, index) => {
    const manual = MANUAL_PATHS.find((path) => matchesGlob(glob, path));
    return manual === undefined
      ? []
      : [
          {
            path: `configuration[${index}].glob`,
            message: `'${glob}' matches the manual's path '${manual}'`,
          },
        ];
  });
  const rules = rulesPlaceOf(spec.requires);
  if (rules !== undefined && !isConfigurationPath({ name: spec.name, configuration, state }, rules.probe)) {
    issues.push({
      path: 'configuration',
      message: `does not include the place of the project rules, '${rules.place}'`,
    });
  }
  return issues;
}

function pathIssues({ path, relative: declared, kind }: Declared, dir: string): Issue[] {
  const target = resolve(dir, declared);
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
    return [{ path, message: `'${declared}' is a symbolic link` }];
  }
  if (!exists(target, kind)) return [{ path, message: `${kind} '${declared}' does not exist` }];
  const link = kind === 'directory' ? firstLinkIn(target) : undefined;
  if (link !== undefined) return [{ path, message: `'${relative(dir, link)}' is a symbolic link` }];
  return [];
}

/** Every symbolic link below `directory`, relative to it, in code-unit order. */
function linksIn(directory: string, prefix = ''): string[] {
  return readdirSync(join(directory, prefix), { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap((entry) => {
      const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isSymbolicLink()) return [path];
      return entry.isDirectory() ? linksIn(directory, path) : [];
    });
}

/** The first symbolic link below `directory`, in name order, or `undefined`. */
function firstLinkIn(directory: string): string | undefined {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) return path;
    if (entry.isDirectory()) {
      const found = firstLinkIn(path);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** A broken MCP configuration fails the campaign check, not a session that was already paid for. */
function jsonIssues(declared: string, dir: string): Issue[] {
  try {
    JSON.parse(readFileSync(resolve(dir, declared), 'utf8'));
    return [];
  } catch (error) {
    return [{ path: 'mcp', message: `'${declared}' is not valid JSON: ${(error as Error).message}` }];
  }
}

function exists(path: string, kind: Kind): boolean {
  if (!existsSync(path)) return false;
  const stats = statSync(path);
  return kind === 'file' ? stats.isFile() : stats.isDirectory();
}

function toArm(spec: ArmFile, dir: string): Arm {
  return {
    name: spec.name,
    dir,
    setup: spec.setup,
    setupPath: resolve(dir, spec.setup),
    manualPath: resolve(dir, spec.manual),
    ...(spec.environment === undefined ? {} : { environmentDir: resolve(dir, spec.environment) }),
    ...(spec.mcp === undefined ? {} : { mcpPath: resolve(dir, spec.mcp) }),
    ...(spec.requires === undefined ? {} : { requires: spec.requires }),
    provides: spec.provides,
    ...(spec.docs_of === undefined ? {} : { docsOf: spec.docs_of }),
    ...(spec.docs_directives === undefined ? {} : { docsDirectives: spec.docs_directives }),
    ...(spec.telemetry_off === undefined ? {} : { telemetryOff: spec.telemetry_off }),
    ...(spec.verdict_hook === undefined ? {} : { verdictHook: spec.verdict_hook }),
    ...(spec.configuration === undefined ? {} : { configuration: spec.configuration }),
    ...(spec.state === undefined ? {} : { state: spec.state }),
  };
}
