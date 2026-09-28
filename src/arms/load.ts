import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { armSchema, fail, ok, parseWith, readYamlFile } from '../core/index.js';
import type { Arm, ArmFile, Issue, Result } from '../core/index.js';

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
 * Issues come in a stable order: schema issues; then the name against its directory; then every
 * declared path, in declaration order. No declared path may be a symbolic link, nor hold one: the
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
  const declared: Declared[] = [
    { path: 'setup', relative: spec.setup, kind: 'file' },
    { path: 'manual', relative: spec.manual, kind: 'file' },
    ...(spec.environment === undefined
      ? []
      : [{ path: 'environment', relative: spec.environment, kind: 'directory' } as const]),
    ...(spec.mcp === undefined ? [] : [{ path: 'mcp', relative: spec.mcp, kind: 'file' } as const]),
  ];
  const issues = declared.flatMap((entry) => pathIssues(entry, dir));
  if (issues.length === 0 && spec.mcp !== undefined) issues.push(...jsonIssues(spec.mcp, dir));
  return issues.length > 0 ? fail(issues) : ok(toArm(spec, dir));
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
  };
}
