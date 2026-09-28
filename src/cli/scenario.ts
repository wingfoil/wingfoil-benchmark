import { join } from 'node:path';

import { SCENARIO_ID, SCENARIO_VERSION } from '../core/index.js';
import type { Issue } from '../core/index.js';
import {
  checkHoldoutRoot,
  loadHoldoutAdditions,
  loadLeakScanDeclarations,
  loadScenario,
  scanScenario,
} from '../scenario/index.js';
import type { HoldoutAdditions } from '../scenario/index.js';

/** Where the hold-out path comes from when no `--holdout` is given (REQ-CLI-10). */
export const HOLDOUT_VARIABLE = 'BENCH_HOLDOUT_PATH';

/** The option that names the hold-out on the command line (REQ-CLI-04). */
export const HOLDOUT_OPTION = '--holdout';

/** `<id>@<version>`, as a scenario is named on the command line. */
const SCENARIO_REF = new RegExp(
  `^(${SCENARIO_ID.source.slice(1, -1)})@(${SCENARIO_VERSION.source.slice(1, -1)})$`,
);

/** What `bench scenario validate` concluded: a line for stdout, or the issues for stderr. */
export type ScenarioValidation =
  { readonly ok: true; readonly line: string } | { readonly ok: false; readonly issues: readonly Issue[] };

/** A scenario reference and a hold-out option, parsed; `undefined` for a usage error. */
export interface ScenarioArguments {
  readonly id: string;
  readonly version: string;
  readonly holdout?: string;
}

/** `<id>@<version> [--holdout <path>]`, or `undefined` when the arguments are not that. */
export function parseScenarioArguments(args: readonly string[]): ScenarioArguments | undefined {
  const [ref, ...rest] = args;
  const match = ref === undefined ? null : SCENARIO_REF.exec(ref);
  if (match === null) return undefined;
  const reference = { id: match[1] ?? '', version: match[2] ?? '' };
  if (rest.length === 0) return reference;
  const [option, path, ...extra] = rest;
  if (
    option !== HOLDOUT_OPTION ||
    path === undefined ||
    path === '' ||
    path.startsWith('-') ||
    extra.length > 0
  ) {
    return undefined;
  }
  return { ...reference, holdout: path };
}

/**
 * REQ-CLI-04: `bench scenario validate <id>@<version> [--holdout <path>]`, reading `scenarios/` under
 * `root` (REQ-ARC-03). The scenario's own checks (REQ-FMT-04), then its hold-out's consistency with
 * `holdout:` when a hold-out is configured — from the option, or else from {@link HOLDOUT_VARIABLE}
 * (REQ-CLI-10). Then the leak scan (REQ-FMT-08) with the declarations of `scenarios/leak-scan.yaml`,
 * the hold-out's additions included; its findings name files and steps, never content.
 */
export function validateScenario(args: ScenarioArguments, root: string): ScenarioValidation {
  const name = `${args.id}@${args.version}`;
  const scenario = loadScenario(join(root, 'scenarios'), args.id, args.version);
  if (!scenario.ok) return { ok: false, issues: scenario.issues };
  const declarations = loadLeakScanDeclarations(join(root, 'scenarios', 'leak-scan.yaml'));
  if (!declarations.ok) return { ok: false, issues: declarations.issues };
  const scan = (additions?: HoldoutAdditions): ScenarioValidation | undefined => {
    const leaks = scanScenario(scenario.value, declarations.value, additions);
    return leaks.length > 0 ? { ok: false, issues: leaks } : undefined;
  };

  const variable = process.env[HOLDOUT_VARIABLE];
  const source = args.holdout !== undefined ? HOLDOUT_OPTION : variable ? HOLDOUT_VARIABLE : undefined;
  const path = args.holdout ?? (variable || undefined);
  if (source === undefined || path === undefined) {
    return scan() ?? { ok: true, line: `scenario ${name} is valid (hold-out: not configured)` };
  }
  const holdout = checkHoldoutRoot(path);
  if (!holdout.ok) {
    return {
      ok: false,
      issues: holdout.issues.map((issue) => ({ path: source, message: `${issue.path} ${issue.message}` })),
    };
  }
  const additions = loadHoldoutAdditions(path, args.id, args.version);
  if (!additions.ok) return additions;
  const found = additions.value.files.length;
  if (scenario.value.holdout && found === 0) {
    return {
      ok: false,
      issues: [
        {
          path: 'holdout',
          message: `the scenario expects hold-out additions, and ${path} has none for ${name}`,
        },
      ],
    };
  }
  if (!scenario.value.holdout && found > 0) {
    return {
      ok: false,
      issues: [
        {
          path: 'holdout',
          message: `the scenario declares no hold-out additions, and ${path} has ${files(found)} for ${name}`,
        },
      ],
    };
  }
  return (
    scan(additions.value) ?? {
      ok: true,
      line: `scenario ${name} is valid (hold-out: ${found === 0 ? 'none' : files(found)})`,
    }
  );
}

function files(n: number): string {
  return `${n} file${n === 1 ? '' : 's'}`;
}
