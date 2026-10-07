import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { docsGeneratorOf, RULES_SOURCE_ARM, rulesGeneratorOf } from '../arms/index.js';
import type { DocsGenerator } from '../arms/index.js';
import type { Arm, DockerPort, GitPort, Scenario } from '../core/index.js';

import type { HarnessArtefact } from './harness.js';
import { AGENT_IDENTITY, hostUser } from './identity.js';

/** The file every docs generator writes, and the docs controls' manual names (task-014). */
export const PROJECT_RULES = 'PROJECT_RULES.md';

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
 * The environment of every docs control of a campaign, for every scenario (REQ-RUN-11 as amended, task-015 Design,
 * task-067): for each docs control and scenario, a snapshot of the configuration of the arm it is generated from
 * (`docs_of`) — made by that arm's own setup, with the campaign's harness and the scenario's overlay for that arm, in a
 * one-off container of the campaign image, the arm's rules generator then applied as a run applies it (REQ-FMT-14) —
 * rendered by that harness's docs generator into `PROJECT_RULES.md`. Both are kept in the execution's results, under
 * `generated/<scenario>@<version>/<docs control>/`. Returns the rules file of each docs control and scenario, by arm
 * then by `<id>@<version>`; an empty map for a campaign without a docs control.
 */
export async function prepareProjectRules(
  checked: ProjectRulesTarget,
  harnesses: ReadonlyMap<string, HarnessArtefact>,
  resultsDir: string,
  options: ProjectRulesOptions,
): Promise<ReadonlyMap<string, ReadonlyMap<string, string>>> {
  const all = new Map<string, Map<string, string>>();
  for (const control of checked.arms.filter((arm) => arm.docsOf !== undefined)) {
    const source = checked.arms.find((arm) => arm.name === control.docsOf);
    const harness = source?.requires === undefined ? undefined : harnesses.get(source.requires);
    const generator = docsGeneratorOf(source?.requires);
    // The campaign check requires the docs_of arm, and harness coverage its harness; the guard keeps the types honest
    // if a campaign reached the runner by another path.
    if (source === undefined || harness === undefined || generator === undefined) {
      throw new Error(
        `the ${control.name} arm is generated from the ${control.docsOf ?? ''} arm, its harness and its docs generator`,
      );
    }
    const rules = new Map<string, string>();
    for (const scenario of checked.scenarios) {
      const key = `${scenario.id}@${scenario.version}`;
      rules.set(
        key,
        await snapshot(
          key,
          scenario,
          { control: control.name, source, harness, generator },
          { resultsDir, campaignId: checked.id },
          options,
        ),
      );
    }
    all.set(control.name, rules);
  }
  return all;
}

async function snapshot(
  key: string,
  scenario: Scenario,
  arms: {
    readonly control: string;
    readonly source: Arm;
    readonly harness: HarnessArtefact;
    readonly generator: DocsGenerator;
  },
  where: { readonly resultsDir: string; readonly campaignId: string },
  options: ProjectRulesOptions,
): Promise<string> {
  const { control, source, harness, generator } = arms;
  const generated = join(where.resultsDir, 'generated', key, control);
  const build = join(generated, 'build');
  const workspace = join(build, 'workspace');
  rmSync(generated, { recursive: true, force: true });
  mkdirSync(workspace, { recursive: true });
  cpSync(source.dir, join(build, 'arm'), { recursive: true });
  cpSync(harness.installed, join(build, 'harness.tgz'));
  const overlay = scenario.armDirs[source.name];
  if (overlay !== undefined) cpSync(overlay, join(build, 'scenario'), { recursive: true });
  // The repository the source arm's runs start from: one commit, and the agent's identity.
  await options.git.init(workspace);
  await options.git.configureIdentity(workspace, AGENT_IDENTITY.name, AGENT_IDENTITY.email);
  await options.git.commitAll(workspace, 'seed', { allowEmpty: true });

  const result = await options.docker.runOnce({
    image: where.campaignId,
    user: hostUser(),
    mount: { source: build, target: '/build' },
    command: [
      'bash',
      '-c',
      `export HOME=/build WORKSPACE=/build/workspace && bash /build/arm/${source.setup}`,
    ],
  });
  if (result.code !== 0) {
    const tail = result.stderr.trimEnd().split('\n').slice(-ERROR_LINES).join('\n');
    throw new Error(
      `the ${source.name} configuration of ${key} could not be made: the setup failed with code ` +
        `${result.code}${tail === '' ? '' : `: ${tail}`}`,
    );
  }
  // The scenario's rules, as a run of the source arm gets them after its setup (REQ-FMT-14).
  const rulesGenerator = rulesGeneratorOf(source.requires);
  const declared = scenario.armDirs[RULES_SOURCE_ARM];
  if (rulesGenerator !== undefined && declared !== undefined) {
    const text = rulesGenerator.render(
      new Map(
        filesUnder(declared).map((file) => [
          relative(declared, file).split('\\').join('/'),
          readFileSync(file, 'utf8'),
        ]),
      ),
    );
    if (text !== undefined) {
      mkdirSync(dirname(join(workspace, rulesGenerator.path)), { recursive: true });
      writeFileSync(join(workspace, rulesGenerator.path), text);
    }
  }

  const kept = join(generated, source.name);
  const files = new Map<string, string>();
  for (const path of generator.kept) {
    if (!existsSync(join(workspace, path))) continue;
    cpSync(join(workspace, path), join(kept, path), { recursive: true });
    for (const file of filesUnder(join(kept, path)))
      files.set(relative(kept, file).split('\\').join('/'), readFileSync(file, 'utf8'));
  }
  rmSync(build, { recursive: true, force: true });
  const rules = join(generated, PROJECT_RULES);
  writeFileSync(rules, generator.render(files));
  return rules;
}

/** Every file below `directory`, at any depth. */
function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : entry.isFile() ? [path] : [];
  });
}
