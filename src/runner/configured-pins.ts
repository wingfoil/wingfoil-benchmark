import { createHash } from 'node:crypto';

import { armDigest, gitRead, seedClashes } from '../arms/index.js';
import type { Arm, CampaignFile, Configuration, Issue, Scenario } from '../core/index.js';
import { relativeFiles } from '../scenario/index.js';

/** Where the configuring prompt and profile live (REQ-RUN-20), whose SHA-256 a record holds. */
const PROMPT_FILE = 'configuring/prompt.md';
const PROFILE_FILE = 'configuring/profile.yaml';

/** A configuration the campaign runs: the scenario version, the configured arm that reads it, and the configuration. */
interface Ran {
  readonly key: string;
  readonly arm: Arm;
  readonly configuration: Configuration;
}

/**
 * REQ-FMT-01 as amended in 1.50 (task-142): what `validate` refuses of a campaign's configured arms and configured
 * docs controls, each issue naming the scenario version, the arm and the field. A configured arm, or a docs control of
 * one, on a version that holds no configuration for it; a configuration place of the base arm over a seed file of the
 * version; a record whose harness pin (tool, version) differs from the campaign's entry for the base arm, or whose
 * base-arm digest differs from that of the base arm the configured arm's pin resolves; records that do not all carry
 * the same prompt and profile SHA-256, or a SHA-256 that no commit of the repository's `configuring/` files holds.
 */
export function configuredIssues(
  spec: Pick<CampaignFile, 'harnesses'>,
  scenarios: readonly Scenario[],
  arms: readonly Arm[],
  repoRoot: string,
): Issue[] {
  const issues: Issue[] = [];
  const ran: Ran[] = [];
  for (const scenario of scenarios) {
    const key = `${scenario.id}@${scenario.version}`;
    for (const arm of arms) {
      const source = arm.docsOf === undefined ? arm : arms.find((candidate) => candidate.name === arm.docsOf);
      if (source?.configuredOf === undefined) continue;
      const configuration = scenario.configurations[source.name];
      if (configuration === undefined) {
        issues.push({
          path: 'arms',
          message:
            `${key}, ${arm.name}: the version holds no configuration for ${source.name} ` +
            '(REQ-FMT-04 as amended in 1.50)',
        });
      } else if (arm === source) ran.push({ key, arm, configuration });
    }
  }
  for (const { key, arm, configuration } of ran) {
    const base = arm.configuredOf as string;
    for (const { glob, file } of seedClashes(arm, relativeFiles(scenarioOf(scenarios, key).seedDir))) {
      issues.push({
        path: `arms.${base}.configuration`,
        message: `${key}, ${arm.name}: '${glob}' matches the seed file '${file}'`,
      });
    }
    const { record } = configuration;
    const pin = Object.hasOwn(spec.harnesses, base) ? spec.harnesses[base] : undefined;
    if (pin !== undefined && (pin.tool !== record.harness.tool || pin.version !== record.harness.version)) {
      issues.push({
        path: `harnesses.${base}`,
        message:
          `is ${pin.tool} ${pin.version}, but ${key}, ${arm.name}: the configuration's record pins ` +
          `${record.harness.tool} ${record.harness.version}`,
      });
    }
    const digest = armDigest(arm.from?.root ?? repoRoot, base).slice(0, 12);
    if (digest !== record.base_arm_digest) {
      issues.push({
        path: `arm_digests.${arm.name}`,
        message:
          `${key}, ${arm.name}: the configuration's record has base_arm_digest ${record.base_arm_digest}, but the ` +
          `${base} arm the pin resolves digests to ${digest}`,
      });
    }
  }
  if (ran.length === 0) return issues;
  const held = {
    prompt_sha256: heldShas(repoRoot, PROMPT_FILE),
    profile_sha256: heldShas(repoRoot, PROFILE_FILE),
  };
  // A SHA-256 no commit holds is refused first; the others are compared with the first held one.
  for (const field of ['prompt_sha256', 'profile_sha256'] as const) {
    const file = field === 'prompt_sha256' ? PROMPT_FILE : PROFILE_FILE;
    const reference = ran.find(({ configuration }) => held[field].has(configuration.record[field]));
    for (const { key, arm, configuration } of ran) {
      const value = configuration.record[field];
      if (!held[field].has(value)) {
        issues.push({
          path: 'arms',
          message: `${key}, ${arm.name}: the configuration's record has ${field} ${value}, which no commit of ${file} holds`,
        });
      } else if (reference !== undefined && value !== reference.configuration.record[field]) {
        issues.push({
          path: 'arms',
          message:
            `${key}, ${arm.name}: the configuration's record has ${field} ${value}, but ${reference.key}, ` +
            `${reference.arm.name}'s has ${reference.configuration.record[field]}: a campaign runs one ${file}`,
        });
      }
    }
  }
  return issues;
}

function scenarioOf(scenarios: readonly Scenario[], key: string): Scenario {
  return scenarios.find((scenario) => `${scenario.id}@${scenario.version}` === key) as Scenario;
}

/** The SHA-256 of every version of `path` the repository's history holds; none outside a repository. */
function heldShas(repoRoot: string, path: string): ReadonlySet<string> {
  const git = (args: readonly string[]) => gitRead(repoRoot, args);

  const commits = (git(['log', '--format=%H', '--', path])?.toString('utf8') ?? '')
    .split('\n')
    .filter(Boolean);
  const shas = new Set<string>();
  for (const commit of commits) {
    const content = git(['show', `${commit}:${path}`]);
    if (content !== undefined) shas.add(createHash('sha256').update(content).digest('hex'));
  }
  return shas;
}
