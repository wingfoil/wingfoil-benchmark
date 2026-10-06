import { join } from 'node:path';

import { renderConstitution } from './constitution.js';

/** Where a scenario declares its project rules, once (dl-005): as the wingfoil arm's configuration. */
export const RULES_SOURCE_ARM = 'wingfoil';

/** A harness's rules generator (REQ-FMT-14): where its tool keeps a project's rules, and how they are rendered there. */
export interface RulesGenerator {
  readonly path: string;
  readonly render: (files: ReadonlyMap<string, string>) => string | undefined;
  /** What it writes, for the arm's setup page (REQ-RES-09). */
  readonly description: string;
}

/**
 * The rules generator of each harness that has one, by tool (REQ-FMT-14). WingFoil needs none: the scenario's rules are
 * its own configuration, applied by its setup.
 */
export const RULES_GENERATORS: Readonly<Record<string, RulesGenerator>> = {
  speckit: {
    path: join('.specify', 'memory', 'constitution.md'),
    render: renderConstitution,
    description:
      "the scenario's rules — the directives its developer reads — rendered as the principles of Spec Kit's constitution, " +
      'after the setup, in place of the template init leaves',
  },
};

/** The rules generator of `tool`, if it has one: an own entry only, so that a tool named `constructor` has none. */
export function rulesGeneratorOf(tool: string | undefined): RulesGenerator | undefined {
  return tool !== undefined && Object.hasOwn(RULES_GENERATORS, tool) ? RULES_GENERATORS[tool] : undefined;
}
