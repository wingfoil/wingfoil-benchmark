import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { onTestFinished } from 'vitest';
import { stringify } from 'yaml';

/** The SHA-256 of no bytes: the `sha256` pin of a vendored fixture file, written empty. */
export const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

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
      // Two suites (dl-001): one after step 1, one after every step, listed from the last step down
      // so that the loaded order (sorted) differs from the file's.
      suites: [
        { id: 'first', dir: 'oracle/first', after_steps: [1] },
        { id: 'all', dir: 'oracle/all', after_steps: stepNumbers(steps).reverse() },
      ],
      checks: ['oracle/checks/decision.yaml'],
      // One entry of each pin (dl-002): a git source by its commit, a document's extract by the
      // sha256 of the file as vendored — here an empty file, as every fixture file is written.
      third_party: [
        {
          name: 'conformance-suite',
          url: 'https://example.org/suite.git',
          commit: 'a'.repeat(40),
          license: 'Apache-2.0',
          files: ['oracle/first/vendor/cases.json'],
        },
        {
          name: 'specification-examples',
          url: 'https://example.org/spec#examples',
          sha256: EMPTY_SHA256,
          license: 'LicenseRef-Example',
          files: ['oracle/first/examples.json'],
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
  'oracle/first/a.test.ts',
  'oracle/first/vendor/cases.json',
  'oracle/first/examples.json',
  'oracle/all/b.test.ts',
  'oracle/checks/decision.yaml',
];

/**
 * What a complete scenario's check holds (REQ-SCO-06, task-035): a content check on step 1 (every fixture has one), two groups
 * that must match in the same place. Every other fixture file is written empty.
 */
export const DECISION_CHECK =
  'kind: content\nsteps: [1]\npatterns:\n  - [revised, superseded]\n  - [decision]\n';

/** The fixture files written with content, by path. */
const CONTENTS: Readonly<Record<string, string>> = { 'oracle/checks/decision.yaml': DECISION_CHECK };

/**
 * A fresh temporary directory, removed when the current test finishes. `register` receives the
 * cleanup; it defaults to Vitest's `onTestFinished`.
 */
export function tempDir(prefix: string, register: (cleanup: () => void) => void = onTestFinished): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  register(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Write the scenario version directory `<root>/<id>/<version>/`; `files` are created empty, except the
 * complete scenario's check, which holds {@link DECISION_CHECK}.
 */
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
    writeFileSync(join(dir, file), CONTENTS[file] ?? '');
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
