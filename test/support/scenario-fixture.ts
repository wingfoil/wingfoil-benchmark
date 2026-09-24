import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { onTestFinished } from 'vitest';
import { stringify } from 'yaml';

/** A scenario.yaml that declares every field of REQ-FMT-04, with `steps` steps. */
export function completeScenarioYaml(id = 'S9', version = '1.0', steps = 2): Record<string, unknown> {
  return {
    id,
    version,
    categories: { primary: 'C', secondary: ['D'] },
    profiles: ['solo-developer', 'team-developer'],
    gqm: ['Q-C1', 'G-X1'],
    capabilities: ['workflow-engine'],
    seed: 'seed',
    steps: stepNumbers(steps).map((n) => ({ n, prompt_file: promptFile(n) })),
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

/** The step numbers 1…n. */
export function stepNumbers(steps: number): number[] {
  return Array.from({ length: steps }, (_, index) => index + 1);
}

/** The prompt file of step `n`, numbered as REQ-RUN-05 numbers a step. */
export function promptFile(n: number): string {
  return `prompts/${String(n).padStart(2, '0')}.md`;
}

/** The files a complete scenario declares. */
export const COMPLETE_FILES = [
  'seed/README.md',
  'prompts/01.md',
  'prompts/02.md',
  'oracle/public/a.test.ts',
  'oracle/checks/decision.yaml',
];

/**
 * A fresh temporary directory, removed when the current test finishes. `register` receives the
 * cleanup; it defaults to Vitest's `onTestFinished`.
 */
export function tempDir(prefix: string, register: (cleanup: () => void) => void = onTestFinished): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  register(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** Write the scenario version directory `<root>/<id>/<version>/`; `files` are created empty. */
export function writeScenarioAt(
  root: string,
  yaml: Record<string, unknown> | string = completeScenarioYaml(),
  files: readonly string[] = COMPLETE_FILES,
  id = 'S9',
  version = '1.0',
): void {
  const dir = join(root, id, version);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'scenario.yaml'), typeof yaml === 'string' ? yaml : stringify(yaml));
  for (const file of files) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), '');
  }
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
  writeScenarioAt(root, yaml, files, id, version);
  return root;
}
