import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

import { isConfigurationPath } from '../arms/index.js';
import type { ArmPlaces } from '../arms/index.js';
import { canonicalJson, hasUnclosedFence, matchesGlob } from '../core/index.js';
import type { TreeChange } from '../core/index.js';

/** A path of a configuring session's result that is not configuration, and why (REQ-RUN-20). */
export interface Offence {
  readonly path: string;
  readonly why: string;
}

/** What a configuring session's result is checked against, once the manual is back (REQ-RUN-20, task-141). */
export interface ResultToCheck {
  /** The harness arm's places (REQ-FMT-05 as amended in 1.50). */
  readonly arm: ArmPlaces;
  /** Every path the workspace differs by from the setup commit. */
  readonly changes: readonly TreeChange[];
  /** The manual's path in the workspace: the agent profile's file. */
  readonly manualFile: string;
  /** Whether a file stood at the manual's path when the session ended. */
  readonly manualWritten: boolean;
  /** The identity file, when the members or roles it declares changed (REQ-RUN-17). */
  readonly identityChanged: string | undefined;
  /** The workspace, where a changed Markdown file is read. */
  readonly workspace: string;
}

/** The modes of a regular file in git: a configuration is files, never links or submodules. */
const REGULAR = new Set(['100644', '100755']);
const LINK = '120000';

/**
 * Every offending path of a configuring session's result, each once, in the paths' code-unit order (REQ-RUN-20): a
 * deleted file, a symbolic link or anything else that is not a regular file, a path outside the arm's configuration
 * places or inside a state place, a file at the manual's path, a change to the members or roles, and a Markdown file
 * that leaves a code fence open (REQ-FMT-04 as amended in 1.52). None, and the result is the configuration.
 */
export function offencesOf(result: ResultToCheck): Offence[] {
  const found = new Map<string, string>();
  const add = (path: string, why: string) => {
    if (!found.has(path)) found.set(path, why);
  };
  if (result.manualWritten) add(result.manualFile, "was written at the manual's path");
  if (result.identityChanged !== undefined) {
    add(result.identityChanged, "changes the members, the roles or a member's roles");
  }
  for (const change of result.changes) {
    const { path } = change;
    if (change.status === 'D') add(path, 'was deleted');
    else if (change.mode === LINK) add(path, 'is a symbolic link');
    else if (!REGULAR.has(change.mode)) add(path, 'is not a regular file');
    else if (isConfigurationPath(result.arm, path)) {
      const file = join(result.workspace, path);
      if (path.endsWith('.md') && existsSync(file) && hasUnclosedFence(readFileSync(file, 'utf8'))) {
        add(path, 'leaves a code fence open');
      }
    } else if ((result.arm.state ?? []).some((place) => matchesGlob(place.glob, path))) {
      add(path, 'is in a state place');
    } else add(path, 'is outside the configuration places');
  }
  return [...found].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([path, why]) => ({ path, why }));
}

/** A refused result's reason, as its record states it: every offending path, named. */
export function refusalReason(offences: readonly Offence[]): string {
  const named = offences.map((offence) => `'${offence.path}' ${offence.why}`).join('; ');
  return `the session's result touches what is not configuration: ${named}`;
}

/** The members and roles a harness's tool declares, as one comparable value, and the file it reads them from. */
export interface Identity {
  readonly file: string;
  /** `none` when the file is missing, `unreadable` when it cannot be read as the tool's, else canonical JSON. */
  readonly value: string;
}

/** Where each tool declares the members and their roles: WingFoil's team, in its DNA (REQ-RUN-17). */
const IDENTITY_FILES: Readonly<Record<string, string>> = { wingfoil: '.wingfoil/dna.yaml' };

/**
 * The members, their roles and the list of roles the tool `tool` declares in `workspace` (REQ-RUN-17, REQ-RUN-20): for
 * WingFoil, `team.members` (each name, e-mail and roles, the roles sorted) and `team.roles` (their names) of its DNA,
 * sorted by e-mail and by name, so that only a change of who holds which role tells. `undefined` for a tool that
 * declares no members.
 */
export function identityOf(tool: string | undefined, workspace: string): Identity | undefined {
  const file = tool === undefined ? undefined : IDENTITY_FILES[tool];
  if (file === undefined) return undefined;
  const path = join(workspace, file);
  if (!existsSync(path)) return { file, value: 'none' };
  let team: unknown;
  try {
    team = (parse(readFileSync(path, 'utf8')) as { team?: unknown } | null)?.team;
  } catch {
    return { file, value: 'unreadable' };
  }
  const { members, roles } = (team ?? {}) as { members?: unknown; roles?: unknown };
  const list = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value)
      ? value.map((entry) => (typeof entry === 'object' && entry !== null ? entry : {}))
      : [];
  const text = (value: unknown) => (typeof value === 'string' ? value : canonicalJson(value ?? null));
  const sorted = (values: string[]) => values.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    file,
    value: canonicalJson({
      members: list(members)
        .map((member) => ({
          name: text(member.name),
          email: text(member.email).toLowerCase(),
          roles: sorted((Array.isArray(member.roles) ? member.roles : []).map(text)),
        }))
        .sort((a, b) => (a.email < b.email ? -1 : a.email > b.email ? 1 : a.name < b.name ? -1 : 1)),
      roles: sorted(list(roles).map((role) => text(role.name))),
    }),
  };
}
