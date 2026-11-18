import { loadRegister } from '../campaign/index.js';
import { eligibilityIssues, registryPinIssues } from '../core/index.js';
import type { ArmRequirement, CampaignFile, Issue } from '../core/index.js';

/**
 * What the eligibility register says of the harnesses the arms run on (REQ-FMT-01, F7.4). A campaign is refused on it. A
 * dry run only notes it: dry runs are how a version is studied before it is assessed (task-063, the approver's choice
 * on bug-033).
 */
export function eligibilityOfPins(
  harnesses: CampaignFile['harnesses'],
  arms: readonly ArmRequirement[],
  repoRoot: string,
): Issue[] {
  const register = loadRegister(repoRoot);
  if (register.ok) return eligibilityIssues(harnesses, arms, register.value);
  return arms.some((arm) => arm.requires !== undefined) ? [...register.issues] : [];
}

/**
 * What a campaign requires of its harnesses before any image is built: a registry tool pinned by a release
 * (REQ-FMT-12), and a tool the register admits at that version. Run once the pins are right (`harnessCoverage`). A pin
 * that cannot be fetched is reported alone, not as unassessed too.
 */
export function harnessPinIssues(
  harnesses: CampaignFile['harnesses'],
  arms: readonly ArmRequirement[],
  repoRoot: string,
): Issue[] {
  const registry = registryPinIssues(harnesses, arms);
  return registry.length > 0 ? registry : eligibilityOfPins(harnesses, arms, repoRoot);
}
