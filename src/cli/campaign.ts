import { loadCampaign } from '../campaign/index.js';
import type { Campaign } from '../campaign/index.js';
import { fail, ok } from '../core/index.js';
import type { Issue, Result, Scenario } from '../core/index.js';
import { loadScenario } from '../scenario/index.js';

/** A valid campaign with every scenario it names loaded, in the campaign's order. */
export interface CheckedCampaign {
  readonly campaign: Campaign;
  readonly scenarios: readonly Scenario[];
}

/**
 * Load the campaign file `file` and every scenario it names (REQ-CLI-01). A scenario that does not load
 * is one issue at its campaign entry, `scenarios[<i>]`, naming the scenario and its own issues.
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
      const reasons = scenario.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ');
      issues.push({ path: `scenarios[${index}]`, message: `${id}@${version}: ${reasons}` });
    }
  });
  return issues.length > 0 ? fail(issues) : ok({ campaign, scenarios });
}
