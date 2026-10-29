import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

import { armDigest } from '../arms/index.js';
import { canonicalJson, fail, harnessCoverage, modelId, ok, verdictPolicyIssue } from '../core/index.js';
import type { Arm, DryRunProfile, Issue, Result, Scenario } from '../core/index.js';
import { DRY_RUNS, versionChange } from '../results/index.js';
import {
  DRY_RUN_PROFILE,
  loadDryRunProfile,
  loadLeakScanDeclarations,
  loadScenario,
  scanScenario,
} from '../scenario/index.js';

import { loadPinnedArm, pinnedDigestIssue } from './pinned-arm.js';
import { runPlan } from './run.js';
import type { RunnerOptions, RunSummary } from './run.js';

/** What `bench scenario dry-run` names on its command line (REQ-CLI-05). */
export interface DryRunRequest {
  readonly id: string;
  readonly version: string;
  readonly arm: string;
  /** The model; the profile's `models.default` when absent. */
  readonly model?: string;
  /**
   * The profile, a file relative to the repository (REQ-CLI-05 as amended in 1.32, task-094);
   * `scenarios/dry-run.yaml` when absent.
   */
  readonly profile?: string;
}

/** A dry run ready to execute: its profile, its one scenario version, arm and model, and its identity. */
export interface CheckedDryRun {
  /** The dry run's identity: its image's tag and its containers' stem (task-021 Design). */
  readonly id: string;
  readonly profile: DryRunProfile;
  readonly profileFile: string;
  readonly repoRoot: string;
  readonly scenario: Scenario;
  /** The arm that runs. */
  readonly arm: Arm;
  /** Every arm loaded: the one that runs, and for a docs control the arm it is generated from (REQ-RUN-11). */
  readonly arms: readonly Arm[];
  readonly model: string;
}

/**
 * Check a dry run before anything is built (F3.3, task-021 Design), in order: the profile
 * (`scenarios/dry-run.yaml` under `root`), the model, the scenario version — its own checks, its
 * immutability against stored campaign results (REQ-FMT-09), the leak scan **without the hold-out**,
 * which a run never reads (REQ-CLI-10) — then the arm, with the arm a docs control is generated from,
 * and the harness coverage of the arms loaded.
 */
export function checkDryRun(request: DryRunRequest, root: string): Result<CheckedDryRun> {
  const scenariosRoot = join(root, 'scenarios');
  const profileFile =
    request.profile === undefined ? join(scenariosRoot, DRY_RUN_PROFILE) : resolve(root, request.profile);
  const profile = loadDryRunProfile(profileFile);
  if (!profile.ok) return profile;

  const model = request.model ?? profile.value.models.default;
  const checkedModel = modelId.safeParse(model);
  if (!checkedModel.success) {
    return fail([{ path: '--model', message: checkedModel.error.issues.map((i) => i.message).join('; ') }]);
  }

  const scenario = loadScenario(scenariosRoot, request.id, request.version);
  if (!scenario.ok) return scenario;
  const changed = versionChange(join(root, 'results'), root, scenario.value);
  if (changed !== undefined) return fail([{ path: 'scenario', message: changed }]);
  // The profile's policy must read the scenario's verdicts, as a campaign's must (task-117).
  const unread = verdictPolicyIssue(scenario.value, profile.value.approver_policy);
  if (unread !== undefined) return fail([{ path: 'scenario', message: unread }]);
  const declarations = loadLeakScanDeclarations(join(scenariosRoot, 'leak-scan.yaml'));
  if (!declarations.ok) return declarations;
  const leaks = scanScenario(scenario.value, declarations.value);
  if (leaks.length > 0) return fail(leaks);

  // A docs control is generated from the arm its `docs_of` names, which the dry run loads too (REQ-RUN-11). Each arm
  // as the profile pins it, if it does (REQ-FMT-13 as amended in 1.33, task-095).
  const pinnedOf = (name: string) => profile.value.arm_digests?.[name];
  const requested = loadPinnedArm(root, request.arm, pinnedOf(request.arm));
  const docsOf = requested.ok ? requested.value.docsOf : undefined;
  const names = docsOf === undefined ? [request.arm] : [request.arm, docsOf];
  const arms: Arm[] = [];
  const issues: Issue[] = [];
  for (const name of names) {
    const arm = name === request.arm ? requested : loadPinnedArm(root, name, pinnedOf(name));
    if (arm.ok) arms.push(arm.value);
    else {
      const role = name === request.arm ? '--arm' : 'arms';
      const why = arm.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ');
      const source = name === request.arm ? '' : ` (${request.arm} is generated from it)`;
      issues.push({ path: role, message: `${name}${source}: ${why}` });
    }
  }
  for (const arm of arms) {
    const issue = pinnedDigestIssue(root, arm, pinnedOf(arm.name), 'profile');
    if (issue !== undefined) issues.push(issue);
  }
  if (issues.length > 0) return fail(issues);
  const uncovered = harnessCoverage(profile.value, arms);
  if (uncovered.length > 0) return fail(uncovered);

  const [arm] = arms as [Arm, ...Arm[]];
  const id = dryRunId(profile.value, request, model, arms, root);
  return ok({
    id,
    profile: profile.value,
    profileFile,
    repoRoot: root,
    scenario: scenario.value,
    arm,
    arms,
    model,
  });
}

/**
 * A dry run's identity: `dry-` and the first 12 hex characters of the SHA-256 of the canonical JSON of
 * what it pins — the campaign identity's rule (REQ-FMT-02) over the profile, the scenario version, the
 * arm and the model — so that an interrupted dry run's container is found again (bug-003).
 */
function dryRunId(
  profile: DryRunProfile,
  request: DryRunRequest,
  model: string,
  arms: readonly Arm[],
  root: string,
): string {
  // The arms' digests too (task-095): a dry run of an arm read from history is another dry run than the tree's.
  const digests = Object.fromEntries(
    arms.map((arm) => [arm.name, armDigest(arm.from?.root ?? root, arm.name)]),
  );
  const pinned = {
    profile,
    scenario: request.id,
    version: request.version,
    arm: request.arm,
    model,
    digests,
  };
  return `dry-${createHash('sha256').update(canonicalJson(pinned)).digest('hex').slice(0, 12)}`;
}

/**
 * Execute a checked dry run (F3.3): one run, repetition 1, through the same code as a campaign's runs,
 * stored under `results/dry-runs/<n>/` and marked `dry_run: true` in its `run.json` (REQ-RES-01).
 */
export function runDryRun(checked: CheckedDryRun, options: RunnerOptions): Promise<RunSummary> {
  const { scenario, arm, model } = checked;
  return runPlan(
    {
      noun: 'dry run',
      id: checked.id,
      pins: checked.profile,
      repoRoot: checked.repoRoot,
      resultsRoot: join(checked.repoRoot, 'results'),
      key: DRY_RUNS,
      source: { file: checked.profileFile, name: DRY_RUN_PROFILE },
      scenarios: [scenario],
      arms: checked.arms,
      runs: [{ scenario, arm, model, repetition: 1 }],
      origin: { dry_run: true },
    },
    options,
  );
}
