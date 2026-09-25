import { existsSync, lstatSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { fail, ok } from '../core/index.js';
import type { Issue, Result } from '../core/index.js';

/** A hold-out checkout mirrors this repository's layout for its additions (REQ-ARC-03). */
const SCENARIOS_DIR = 'scenarios';

/** A scenario version's hold-out additions: where they are, and their file names — never their content. */
export interface HoldoutAdditions {
  readonly dir: string;
  /** Relative to {@link dir}, in the default sort order: by UTF-16 code unit, whatever the locale. */
  readonly files: readonly string[];
}

/**
 * A configured hold-out path (REQ-CLI-10): it must exist, be a directory, and hold `scenarios/`, the
 * layout it mirrors. The issue's path is the hold-out path itself — naming a path prints no content —
 * and the caller says where it came from.
 */
export function checkHoldoutRoot(path: string): Result<string> {
  const problem = !existsSync(path)
    ? 'does not exist'
    : !statSync(path).isDirectory()
      ? 'is not a directory'
      : !existsSync(join(path, SCENARIOS_DIR)) || !statSync(join(path, SCENARIOS_DIR)).isDirectory()
        ? `has no ${SCENARIOS_DIR}/ directory`
        : undefined;
  return problem === undefined ? ok(path) : fail([{ path, message: problem }]);
}

/**
 * The additions of scenario `id@version` in the hold-out at `holdoutRoot` (REQ-ARC-03): the files of
 * `<holdoutRoot>/scenarios/<id>/<version>/`, at any depth, by name only. No file is opened here: the
 * content is read only by what needs it (the leak scan, scoring) and is never printed. A version the
 * hold-out does not mention has none. A symbolic link is refused, as in a seed.
 */
export function loadHoldoutAdditions(
  holdoutRoot: string,
  id: string,
  version: string,
): Result<HoldoutAdditions> {
  const dir = resolve(holdoutRoot, SCENARIOS_DIR, id, version);
  if (!existsSync(dir)) return ok({ dir, files: [] });
  const files: string[] = [];
  const issues: Issue[] = [];
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isSymbolicLink())
        issues.push({ path: 'holdout', message: `'${relative(dir, path)}' is a symbolic link` });
      else if (stats.isDirectory()) walk(path);
      else files.push(relative(dir, path));
    }
  };
  walk(dir);
  return issues.length > 0 ? fail(issues) : ok({ dir, files: files.sort() });
}
