import { loadArm } from '../arms/index.js';
import { loadCampaign } from '../campaign/index.js';
import type { Campaign } from '../campaign/index.js';
import { fail, harnessCoverage, ok } from '../core/index.js';
import type { Arm, Issue, Result, Scenario } from '../core/index.js';
import { loadScenario } from '../scenario/index.js';

/** A valid campaign with every scenario and every arm it names loaded, in the campaign's order. */
export interface CheckedCampaign {
  /** The campaign file, validated, with its identity. */
  readonly campaign: Campaign;
  /** The scenarios it names, loaded, in the campaign's order. */
  readonly scenarios: readonly Scenario[];
  /** The arm definitions it names (REQ-FMT-05), loaded, in the campaign's order. */
  readonly arms: readonly Arm[];
}

/**
 * Load the campaign file `file` and every scenario and arm it names (REQ-CLI-01, REQ-FMT-05). A
 * scenario or an arm that does not load is one issue at its campaign entry, `scenarios[<i>]` or
 * `arms[<i>]`, naming it and its own issues. Once every arm has loaded, its `requires` decides which
 * harnesses the campaign must pin (REQ-FMT-01).
 */
export function checkCampaign(file: string): Result<CheckedCampaign> {
  const loaded = loadCampaign(file);
  if (!loaded.ok) return loaded;
  const campaign = loaded.value;

  const scenarios: Scenario[] = [];
  const issues: Issue[] = [];
  campaign.spec.scenarios.forEach(({ id, version }, index) => {
    const scenario = loadScenario(campaign.scenariosRoot, id, version);
    if (scenario.ok) scenarios.push(scenario.value);
    else {
      issues.push({
        path: `scenarios[${index}]`,
        message: `${id}@${version}: ${reasonsOf(scenario.issues)}`,
      });
    }
  });
  const arms: Arm[] = [];
  campaign.spec.arms.forEach((name, index) => {
    const arm = loadArm(campaign.armsRoot, name);
    if (arm.ok) arms.push(arm.value);
    else issues.push({ path: `arms[${index}]`, message: `${name}: ${reasonsOf(arm.issues)}` });
  });
  if (arms.length === campaign.spec.arms.length) issues.push(...harnessCoverage(campaign.spec, arms));
  // baseline-docs is generated from the wingfoil arm's configuration (REQ-RUN-11): without the
  // wingfoil arm there is nothing to generate it from.
  if (campaign.spec.arms.includes('baseline-docs') && !campaign.spec.arms.includes('wingfoil')) {
    issues.push({
      path: 'arms',
      message:
        "includes baseline-docs, which is generated from the wingfoil arm's configuration: add the wingfoil arm",
    });
  }
  return issues.length > 0 ? fail(issues) : ok({ campaign, scenarios, arms });
}

/** A loader's issues in one line: `path message; path message`, the path being a field or the file. */
function reasonsOf(issues: readonly Issue[]): string {
  return issues.map((issue) => `${issue.path} ${issue.message}`).join('; ');
}
