import { cpSync } from 'node:fs';

import { keepInsideSeed } from '../scenario/index.js';

/**
 * Copy an arm's environment into a run's workspace (REQ-FMT-05), over the seed. Symbolic links are
 * not copied, as for the seed: the arm loader already refuses them, and this keeps the rule true of
 * whatever reaches the workspace.
 */
export function copyEnvironment(workspace: string, environmentDir: string): void {
  cpSync(environmentDir, workspace, {
    recursive: true,
    dereference: false,
    verbatimSymlinks: true,
    filter: keepInsideSeed,
  });
}
