// task-177 — the external workflow runner runs this repository's governance (dl-037, the approver's rulings of
// 2026-11-22 and 2026-11-23). Its configuration may launch only work that spends nothing and that the release does
// not own: never campaign-cycle, never the release slot (and no step that includes it), never `*`, and the
// real-agent check only as a manual step. The runner signs as its own identity, which can never approve.
import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { repoPath } from '../../support/paths.js';

type Phase = { name: string; include?: string };
type Workflow = { name: string; phases: Phase[] };
type Line = { branch?: string; agent?: string; reviewer_agent?: string; release_line?: string };
type RunnerConfig = {
  push?: boolean;
  launch?: { allow?: string[]; manual?: string[]; optional?: string[] };
  phases?: { integrate?: string[] };
  lines?: Record<string, Line>;
};
type Dna = {
  team: {
    members: { name: string; email?: string }[];
    agents: { name: string; email?: string; approval_authority?: boolean }[];
  };
  paths: { runs?: string[] };
};

const configFile = repoPath('config', 'runner.yaml');
const load = (file: string): unknown => parse(readFileSync(file, 'utf8'));
const config = (existsSync(configFile) ? load(configFile) : {}) as RunnerConfig;
const dna = load(repoPath('.wingfoil', 'dna.yaml')) as Dna;
const included = (load(repoPath('.wingfoil', 'workflows.yaml')) as { include: string[] }).include;
const workflows = new Map(
  included
    .map((path) => load(repoPath('.wingfoil', path)) as Workflow)
    .map((workflow) => [workflow.name, workflow] as const),
);

/** The workflows the runner must never launch: those that spend (campaign-cycle) or that the release owns. */
const OWNED = new Set(['campaign-cycle', 'release']);
/** Steps that spend, which the runner may run only as manual steps the approver starts. */
const MANUAL_ONLY = ['work-item.real-agent-check'];

/** Whether a workflow is owned or includes, at any depth, one that is. */
function reachesOwned(name: string, seen = new Set<string>()): boolean {
  if (OWNED.has(name)) return true;
  if (seen.has(name)) return false;
  seen.add(name);
  const workflow = workflows.get(name);
  return (workflow?.phases ?? []).some((phase) => phase.include !== undefined && reachesOwned(phase.include, seen));
}

/** Every step as the runner names it, `workflow.phase`, with whether launching it reaches an owned workflow. */
const steps = [...workflows.values()].flatMap((workflow) =>
  workflow.phases.map((phase) => ({
    workflow: workflow.name,
    step: `${workflow.name}.${phase.name}`,
    owned: OWNED.has(workflow.name) || (phase.include !== undefined && reachesOwned(phase.include)),
  })),
);

/** The runner's matcher (lib.mjs stepMatches): a pattern names `workflow` or `workflow.phase`, `*` a wildcard. */
function matches(pattern: string, step: { workflow: string; step: string }): boolean {
  const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
  return regex.test(step.workflow) || regex.test(step.step);
}

describe('the runner launches only what spends nothing and the release does not own (task-177)', () => {
  it('has a configuration that names a trunk line on main', () => {
    expect(existsSync(configFile), 'config/runner.yaml').toBe(true);
    expect(config.lines?.['trunk']?.branch).toBe('main');
    expect(config.push).toBe(false);
  });

  it('launches work-item, and never an owned workflow, a step that reaches one, or a wildcard', () => {
    const launched = [...(config.launch?.allow ?? []), ...(config.launch?.optional ?? [])];
    expect(launched).toContain('work-item');
    for (const pattern of [...launched, ...(config.phases?.integrate ?? [])]) {
      expect(pattern.includes('*'), `${pattern}: a wildcard`).toBe(false);
      const owned = steps.filter((step) => step.owned && matches(pattern, step)).map((step) => step.step);
      expect(owned, `${pattern} launches what the release or a campaign owns`).toEqual([]);
      expect(
        steps.some((step) => matches(pattern, step)),
        `${pattern} names no step`,
      ).toBe(true);
    }
  });

  it('runs a step that spends only as a manual step', () => {
    for (const step of MANUAL_ONLY) expect(config.launch?.manual ?? [], step).toContain(step);
  });

  it('signs as its own identity, which cannot approve', () => {
    for (const [name, line] of Object.entries(config.lines ?? {})) {
      for (const agent of [line.agent, line.reviewer_agent].filter((a): a is string => a !== undefined)) {
        const entry = dna.team.agents.find((candidate) => candidate.name === agent);
        expect(entry, `line ${name}: ${agent} is not in team.agents`).toBeDefined();
        expect(entry?.email, `line ${name}: ${agent} has no email`).toMatch(/@/);
        // WingFoil 0.3.2 refuses an agent email on a reserved top-level domain (its bug-261): `workflow list` fails.
        expect(entry?.email, `line ${name}: ${agent}'s email is on a reserved domain`).not.toMatch(
          /\.(test|example|invalid|localhost)$/i,
        );
        expect(entry?.approval_authority, `line ${name}: ${agent} can approve`).toBe(false);
        expect(
          dna.team.members.map((member) => member.name),
          `line ${name}: ${agent} is a member`,
        ).not.toContain(agent);
        expect(
          dna.team.members.map((member) => member.email),
          `line ${name}: ${agent} has a member's email`,
        ).not.toContain(entry?.email);
      }
    }
    expect(Object.keys(config.lines ?? {}).length).toBeGreaterThan(0);
  });

  it('keeps a run log', () => {
    expect(dna.paths.runs ?? []).toContain('docs/runs/');
  });
});
