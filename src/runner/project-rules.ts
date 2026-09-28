import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { renderProjectRules } from '../arms/index.js';
import type { Arm, DockerPort, GitPort, Scenario } from '../core/index.js';

import type { HarnessArtefact } from './harness.js';
import { AGENT_IDENTITY, hostUser } from './identity.js';

/** The arm whose environment is generated, and the arm it is generated from (REQ-RUN-11). */
export const GENERATED_ARM = 'baseline-docs';
export const SOURCE_ARM = 'wingfoil';

/** The file the generator writes, and the baseline-docs manual names (task-014). */
export const PROJECT_RULES = 'PROJECT_RULES.md';

/** What a snapshot keeps of the wingfoil workspace: its configuration and its Memory. */
const KEPT = ['.wingfoil', 'docs/memory'];

/** How many lines of a failing snapshot's error output its error keeps. */
const ERROR_LINES = 5;

/** What the environments are generated for: a campaign or a dry run, its image, arms and scenarios. */
export interface ProjectRulesTarget {
  readonly id: string;
  readonly arms: readonly Arm[];
  readonly scenarios: readonly Scenario[];
}

/** What the snapshot step needs. */
export interface ProjectRulesOptions {
  readonly docker: DockerPort;
  readonly git: GitPort;
}

/**
 * The baseline-docs environment of every scenario of a campaign that has the baseline-docs arm
 * (REQ-RUN-11, task-015 Design): for each, a snapshot of the wingfoil arm's configuration — made by the
 * wingfoil arm's own setup, with the campaign's WingFoil and the scenario's `arms/wingfoil/`, in a
 * one-off container of the campaign image — rendered by the generator into `PROJECT_RULES.md`. Both are
 * kept in the execution's results, under `generated/<scenario>@<version>/`. Returns the rules file of
 * each scenario, by `<id>@<version>`; an empty map for a campaign without the arm.
 */
export async function prepareProjectRules(
  checked: ProjectRulesTarget,
  harnesses: ReadonlyMap<string, HarnessArtefact>,
  resultsDir: string,
  options: ProjectRulesOptions,
): Promise<ReadonlyMap<string, string>> {
  const rules = new Map<string, string>();
  if (!checked.arms.some((arm) => arm.name === GENERATED_ARM)) return rules;
  const source = checked.arms.find((arm) => arm.name === SOURCE_ARM);
  const harness = source?.requires === undefined ? undefined : harnesses.get(source.requires);
  // The campaign check requires the wingfoil arm, and harness coverage its harness; the guard keeps
  // the types honest if a campaign reached the runner by another path.
  if (source === undefined || harness === undefined) {
    throw new Error(`the ${GENERATED_ARM} arm is generated from the ${SOURCE_ARM} arm and its harness`);
  }
  for (const scenario of checked.scenarios) {
    const key = `${scenario.id}@${scenario.version}`;
    rules.set(
      key,
      await snapshot(key, scenario, source, harness, { resultsDir, campaignId: checked.id }, options),
    );
  }
  return rules;
}

async function snapshot(
  key: string,
  scenario: Scenario,
  arm: Arm,
  harness: HarnessArtefact,
  where: { readonly resultsDir: string; readonly campaignId: string },
  options: ProjectRulesOptions,
): Promise<string> {
  const generated = join(where.resultsDir, 'generated', key);
  const build = join(generated, 'build');
  const workspace = join(build, 'workspace');
  rmSync(generated, { recursive: true, force: true });
  mkdirSync(workspace, { recursive: true });
  cpSync(arm.dir, join(build, 'arm'), { recursive: true });
  cpSync(harness.installed, join(build, 'harness.tgz'));
  const overlay = scenario.armDirs[SOURCE_ARM];
  if (overlay !== undefined) cpSync(overlay, join(build, 'scenario'), { recursive: true });
  // The repository the wingfoil arm's runs start from: one commit, and the agent's identity.
  await options.git.init(workspace);
  await options.git.configureIdentity(workspace, AGENT_IDENTITY.name, AGENT_IDENTITY.email);
  await options.git.commitAll(workspace, 'seed', { allowEmpty: true });

  const result = await options.docker.runOnce({
    image: where.campaignId,
    user: hostUser(),
    mount: { source: build, target: '/build' },
    command: ['bash', '-c', `export HOME=/build WORKSPACE=/build/workspace && bash /build/arm/${arm.setup}`],
  });
  if (result.code !== 0) {
    const tail = result.stderr.trimEnd().split('\n').slice(-ERROR_LINES).join('\n');
    throw new Error(
      `the ${SOURCE_ARM} configuration of ${key} could not be made: the setup failed with code ` +
        `${result.code}${tail === '' ? '' : `: ${tail}`}`,
    );
  }

  const kept = join(generated, SOURCE_ARM);
  const files = new Map<string, string>();
  for (const path of KEPT) {
    if (!existsSync(join(workspace, path))) continue;
    cpSync(join(workspace, path), join(kept, path), { recursive: true });
    for (const file of filesUnder(join(kept, path)))
      files.set(relative(kept, file), readFileSync(file, 'utf8'));
  }
  rmSync(build, { recursive: true, force: true });
  const rules = join(generated, PROJECT_RULES);
  writeFileSync(rules, renderProjectRules(files));
  return rules;
}

/** Every file below `directory`, at any depth. */
function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : entry.isFile() ? [path] : [];
  });
}
