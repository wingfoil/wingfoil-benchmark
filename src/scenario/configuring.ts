import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { configuringProfileSchema, parseWith, readYamlFile } from '../core/index.js';
import type { ConfiguringProfile, Issue, LeakScanDeclarations, Result, Scenario } from '../core/index.js';

import type { HoldoutAdditions } from './holdout.js';
import { filesUnder, harnessMentions, oracleLiterals } from './leak-scan.js';

/** The configuring agent's profile, from the repository's root (REQ-ARC-03 as amended in 1.50). */
export const CONFIGURING_PROFILE = 'configuring/profile.yaml';
/** The configuring agent's one prompt, the same for every harness (REQ-RUN-20, T12). */
export const CONFIGURING_PROMPT = 'configuring/prompt.md';

/** Load and validate the configuring profile `file` (REQ-RUN-20): a missing or malformed file is an issue. */
export function loadConfiguringProfile(file: string): Result<ConfiguringProfile> {
  const read = readYamlFile(file);
  if (!read.ok) return read;
  return parseWith(configuringProfileSchema, read.value, CONFIGURING_PROFILE);
}

/**
 * The scan `bench scenario configure` runs on the configuring prompt before any session (REQ-FMT-08 as amended in
 * 1.50): the harness names, and the oracle literals of the version it configures, the hold-out's too when a hold-out
 * is set. A finding names the oracle or hold-out file, never the literal.
 */
export function scanConfiguringPrompt(
  text: string,
  scenario: Scenario,
  declarations: LeakScanDeclarations,
  holdout?: HoldoutAdditions,
): Issue[] {
  const min = declarations.oracle_literal_min_length;
  const issues: Issue[] = harnessMentions(text, declarations.harness_names).map((mention) => ({
    path: CONFIGURING_PROMPT,
    message: `names the harness '${mention}'`,
  }));
  const sources = [
    ...scenario.oracle.suites
      .flatMap((suite) => filesUnder(suite.dir))
      .map((file) => ({ label: relative(scenario.dir, file), path: file })),
    ...(holdout?.files ?? []).map((file) => ({
      label: `the hold-out file ${file}`,
      path: join(holdout!.dir, file),
    })),
  ];
  for (const source of sources) {
    if (oracleLiterals(readFileSync(source.path, 'utf8'), min).some((literal) => text.includes(literal))) {
      issues.push({ path: CONFIGURING_PROMPT, message: `holds a literal of ${source.label}` });
    }
  }
  return issues;
}
