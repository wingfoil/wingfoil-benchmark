import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { onTestFinished } from 'vitest';
import { stringify } from 'yaml';

/** A scenario.yaml that declares every field of REQ-FMT-04. */
export function completeScenarioYaml(id = 'S9', version = '1.0'): Record<string, unknown> {
  return {
    id,
    version,
    categories: { primary: 'C', secondary: ['D'] },
    profiles: ['solo-developer', 'team-developer'],
    gqm: ['Q-C1', 'G-X1'],
    capabilities: ['workflow-engine'],
    seed: 'seed',
    steps: [
      { n: 1, prompt_file: 'prompts/01.md' },
      { n: 2, prompt_file: 'prompts/02.md' },
    ],
    oracle: {
      public_tests: 'oracle/public',
      checks: ['oracle/checks/decision.yaml'],
      third_party: [
        {
          name: 'conformance-suite',
          url: 'https://example.org/suite.git',
          commit: 'a'.repeat(40),
          license: 'Apache-2.0',
        },
      ],
    },
    holdout: true,
  };
}

/** The files a complete scenario declares. */
export const COMPLETE_FILES = [
  'seed/README.md',
  'prompts/01.md',
  'prompts/02.md',
  'oracle/public/a.test.ts',
  'oracle/checks/decision.yaml',
];

/** A fresh temporary directory, removed when the current test finishes. */
export function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Write a scenario version directory under a fresh scenarios root and return that root. `yaml` is
 * written as scenario.yaml (a string is written verbatim); `files` are created empty. The root is
 * removed when the current test finishes.
 */
export function writeScenario(
  yaml: Record<string, unknown> | string = completeScenarioYaml(),
  files: readonly string[] = COMPLETE_FILES,
  id = 'S9',
  version = '1.0',
): string {
  const root = tempDir('bench-scenarios-');
  const dir = join(root, id, version);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'scenario.yaml'), typeof yaml === 'string' ? yaml : stringify(yaml));
  for (const file of files) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), '');
  }
  return root;
}
