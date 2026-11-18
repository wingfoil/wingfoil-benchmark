import { loadRegister } from '../campaign/index.js';
import { eligibilityIssues, registryPinIssues } from '../core/index.js';
import type { ArmRequirement, CampaignFile, Issue } from '../core/index.js';

/**
 * What a campaign and a dry run both require of the harnesses their arms run on, before any image is built: a registry
 * tool pinned by a release (REQ-FMT-12), and a tool the eligibility register admits at that version (REQ-FMT-01, F7.4).
 * Run once the pins are right (`harnessCoverage`). A pin that cannot be fetched is reported alone, not as unassessed too.
 */
export function harnessPinIssues(
  harnesses: CampaignFile['harnesses'],
  arms: readonly ArmRequirement[],
  repoRoot: string,
): Issue[] {
  const registry = registryPinIssues(harnesses, arms);
  if (registry.length > 0) return registry;
  const register = loadRegister(repoRoot);
  if (register.ok) return eligibilityIssues(harnesses, arms, register.value);
  return arms.some((arm) => arm.requires !== undefined) ? [...register.issues] : [];
}
