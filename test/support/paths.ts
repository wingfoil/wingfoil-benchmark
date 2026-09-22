import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/** The repository root, so that tests do not depend on the working directory. */
export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** A path under the repository root. */
export function repoPath(...segments: string[]): string {
  return join(REPO_ROOT, ...segments);
}
