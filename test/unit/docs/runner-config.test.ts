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
type Line = {
  branch?: string;
  agent?: string;
  reviewer_agent?: string;
  release_line?: string;
  tiers?: Record<string, string>;
  reviewer_tiers?: Record<string, string>;
};
type RunnerConfig = {
  push?: boolean;
  weekly_mains?: string[];
  live_checks?: unknown;
  life_cycle_start?: unknown;
  integration?: { setup_command?: unknown; install_scripts?: boolean };
  roles?: Record<string, string>;
  launch?: { allow?: string[]; manual?: string[]; optional?: string[] };
  permissions?: { extra?: string[]; sources_read_only?: unknown; read_deny?: unknown };
  needs?: { open_states?: unknown };
  phases?: { integrate?: string[] };
  lines?: Record<string, Line>;
};
type Dna = {
  team: {
    members: { name: string; email?: string }[];
    agents: { name: string; email?: string; approval_authority?: boolean }[];
    roles: { name: string; human_only?: boolean }[];
  };
  paths: { runs?: string[] };
};

const configFile = repoPath('config', 'runner.yaml');
const localFile = repoPath('config', 'runner.local.yaml');
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

/** Whether a workflow includes, at any depth, the workflow `target`. */
function includes(name: string, target: string, seen = new Set<string>()): boolean {
  if (seen.has(name)) return false;
  seen.add(name);
  return (workflows.get(name)?.phases ?? []).some(
    (phase) => phase.include !== undefined && (phase.include === target || includes(phase.include, target, seen)),
  );
}

describe('the runner launches only what spends nothing and the release does not own (task-177)', () => {
  it('guards workflows that exist', () => {
    for (const name of OWNED) expect([...workflows.keys()], name).toContain(name);
  });

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

  it('launches an allowed workflow only where no owned workflow includes it', () => {
    // The runner matches a frontier step by its innermost workflow: a work-item included by the release would run.
    for (const pattern of config.launch?.allow ?? []) {
      for (const owned of OWNED) expect(includes(owned, pattern), `${owned} includes ${pattern}`).toBe(false);
    }
  });

  it('starts no workflow by itself and runs no command outside the sandbox', () => {
    expect(config.weekly_mains ?? []).toEqual([]);
    expect(config.live_checks, 'live_checks').toBeUndefined();
    expect(config.life_cycle_start, 'life_cycle_start').toBeUndefined();
    // runner-1.2.4 installs the dependencies outside the sandbox in the done step too (task-178): npm ci only.
    expect(config.integration?.setup_command, 'integration.setup_command').toBeUndefined();
    expect(config.integration?.install_scripts ?? false, 'integration.install_scripts').toBe(false);
  });

  it("keeps the runner's own allowlist and its defaults for read-only roles and open states (task-180)", () => {
    // runner-1.2.5 and 1.2.6 read these keys: an empty sources_read_only would let reviewer and qa edit the sources,
    // a narrower open_states would release a held element sooner, and read_deny is chosen per role, not here.
    expect(config.permissions?.sources_read_only, 'permissions.sources_read_only').toBeUndefined();
    expect(config.permissions?.read_deny, 'permissions.read_deny').toBeUndefined();
    expect(config.needs?.open_states, 'needs.open_states').toBeUndefined();
  });

  it('keeps only machine paths in the local file and its committed example, which the drift check does not read', () => {
    // The local file exists only on a machine that runs the runner (its home); the example is checked everywhere.
    const files = [repoPath('config', 'runner.local.example.yaml'), localFile].filter((file) => existsSync(file));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const local = load(file) as {
        lines?: Record<string, Record<string, unknown>>;
        paths?: Record<string, unknown>;
      };
      expect(Object.keys(local).filter((key) => key !== 'lines' && key !== 'paths'), file).toEqual([]);
      for (const [name, line] of Object.entries(local.lines ?? {})) {
        expect(
          Object.keys(line).filter((key) => key !== 'checkout' && key !== 'worktrees'),
          `${file}: lines.${name}`,
        ).toEqual([]);
      }
      // paths.trusted_ref only while a change to the runner's files is unmerged (task-177's notes).
      const allowed = ['runner', 'setup', 'trusted_ref'];
      expect(Object.keys(local.paths ?? {}).filter((key) => !allowed.includes(key)), `${file}: paths`).toEqual([]);
    }
  });

  it('maps every role but the approver to a tier, and every tier to an adapter that names its model', () => {
    // runner.test.mjs checks the same, but its test also names the agents claude and codex: npm run test:runner skips it.
    for (const role of dna.team.roles) {
      if (role.name === 'approver' || role.human_only === true) continue;
      expect(config.roles?.[role.name], `role ${role.name}`).toBeDefined();
    }
    for (const [name, line] of Object.entries(config.lines ?? {})) {
      for (const tier of new Set(Object.values(config.roles ?? {}))) {
        const adapter = line.tiers?.[tier];
        expect(adapter, `line ${name}: tier ${tier}`).toBeDefined();
        const file = repoPath('.wingfoil', 'agents', 'custom', `${adapter ?? ''}.yaml`);
        expect(existsSync(file), `${adapter} adapter`).toBe(true);
        const manifest = load(file) as {
          name?: string;
          launch?: { headless?: { args?: string[]; permissions?: unknown } };
        };
        expect(manifest.name).toBe(adapter);
        // A permissions fragment would replace the runner's allowlist (runner-1.2.5, task-180).
        expect(manifest.launch?.headless?.permissions, `${adapter} declares no permissions fragment`).toBeUndefined();
        const args = manifest.launch?.headless?.args ?? [];
        expect(args[args.indexOf('--model') + 1] ?? '', `${adapter} names its model`).toMatch(/^claude-/);
      }
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
        // Nor a GitHub noreply address without an account's numeric id (`<id>+<login>@…`).
        expect(entry?.email, `line ${name}: ${agent}'s GitHub noreply email names no account`).not.toMatch(
          /^(?![0-9]+\+)[^@]*@users\.noreply\.github\.com$/i,
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
