import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

/** The five criteria of the eligibility register, in their published order (REQ-FMT-11, REQ-RES-09). */
export const CRITERIA = [
  'agent-and-model',
  'pinnable',
  'headless-container',
  'workflow-harness',
  'no-own-llm',
] as const;

/**
 * One register entry: every criterion passes, unless named in `failing`; the verdict follows (an entry that fails
 * any criterion is excluded, with that criterion as its reason).
 */
export function registerEntry(
  tool: string,
  version: string,
  failing: readonly (typeof CRITERIA)[number][] = [],
): Record<string, unknown> {
  return {
    tool,
    version,
    date: '2026-10-06',
    criteria: Object.fromEntries(
      CRITERIA.map((id) => [
        id,
        failing.includes(id)
          ? { result: 'fail', evidence: `${tool} ${version} fails ${id} in this fixture` }
          : { result: 'pass', evidence: `${tool} ${version} passes ${id} in this fixture` },
      ]),
    ),
    verdict: failing.length > 0 ? 'excluded' : 'admitted',
    reason: failing.length > 0 ? `fails ${failing.join(', ')}` : 'passes the five criteria in this fixture',
  };
}

/** The register text of `entries`. */
export function registerYaml(entries: readonly Record<string, unknown>[]): string {
  return stringify({ criteria: [...CRITERIA], entries });
}

/** Writes `eligibility/register.yaml` under `root` with `entries`. */
export function writeRegister(root: string, entries: readonly Record<string, unknown>[]): void {
  mkdirSync(join(root, 'eligibility'), { recursive: true });
  writeFileSync(join(root, 'eligibility', 'register.yaml'), registerYaml(entries));
}

/** The register every test repository gets: the WingFoil pins the tests use, admitted. */
export const TEST_REGISTER = [registerEntry('wingfoil', '3df305e'), registerEntry('wingfoil', 'v0.2.2')];
