import type { Arm, Scenario } from '../core/index.js';

/**
 * The capabilities a scenario version needs that an arm does not provide (F3.6, REQ-SCO-10), sorted:
 * declared `false`, or not declared at all. Only an arm with a harness (`requires`) is checked: F3.6
 * is about the harness under test, and baseline and baseline-docs, which have none, are the reference
 * a harness is compared with (task-030, requirements 1.9). An empty list is no expected failure.
 */
export function missingCapabilities(scenario: Scenario, arm: Arm): string[] {
  if (arm.requires === undefined) return [];
  return scenario.capabilities
    .filter((capability) => arm.provides[capability] !== true)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
