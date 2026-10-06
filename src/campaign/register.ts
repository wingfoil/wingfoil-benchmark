import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ok, parseWith, readYamlFile, REGISTER_FILE, registerSchema } from '../core/index.js';
import type { Register, Result } from '../core/index.js';

/**
 * The eligibility register of the repository at `repoRoot` (REQ-FMT-11), or `undefined` when it has none: a campaign
 * without a harness arm needs none, and the check says so when one is needed. A register that is there but invalid
 * is reported, with its issues at `eligibility/register.yaml`'s fields.
 */
export function loadRegister(repoRoot: string): Result<Register | undefined> {
  const file = join(repoRoot, REGISTER_FILE);
  if (!existsSync(file)) return ok(undefined);
  const read = readYamlFile(file);
  if (!read.ok) return { ok: false, issues: read.issues.map((issue) => ({ ...issue, path: REGISTER_FILE })) };
  const parsed = parseWith(registerSchema, read.value, REGISTER_FILE);
  if (!parsed.ok) {
    return {
      ok: false,
      issues: parsed.issues.map((issue) =>
        issue.path === REGISTER_FILE ? issue : { ...issue, path: `${REGISTER_FILE}: ${issue.path}` },
      ),
    };
  }
  return ok(parsed.value);
}
