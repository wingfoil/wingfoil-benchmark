// task-127 — the composed methodology (software 1.0.0, methodology/kanban 1.0.0, base 2.0.1) runs on this
// repository's own state machines (docs/pack-deviations.md). WingFoil 0.3.2 loads a workflow whose `where` status
// filter, or a `set_state` on an element the step neither binds nor created, names a state the type's machine lacks
// with no diagnostic (F-049); this test catches it at commit time, for every `set_state` and fallback `set_state` (no
// included workflow has one today, so that check guards future actions), and checks every include's element.
import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { repoPath } from '../../support/paths.js';

type Phase = {
  name: string;
  include?: string;
  iterate_over?: string;
  where?: Record<string, unknown>;
  actions?: unknown[];
  fallback?: { step: string; set_state?: string };
};
type Workflow = { name: string; kind: string; element?: string; phases: Phase[] };
type Machine = { sequence: string[] };

const wingfoil = (...parts: string[]) => repoPath('.wingfoil', ...parts);
const load = (file: string): unknown => parse(readFileSync(file, 'utf8'));

const config = load(wingfoil('workflows.yaml')) as { include: string[] };
const memory = load(wingfoil('memory.yaml')) as {
  defaults: { states: Machine };
  types: Record<string, { states?: Machine }>;
};

const included = config.include.map((path) => ({ path, file: wingfoil(path) }));
const workflows = included.filter(({ file }) => existsSync(file)).map(({ path, file }) => ({
  path,
  workflow: load(file) as Workflow,
}));

/** A `where` value WingFoil reads as a list: one string, or several. */
function typesOf(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  return (Array.isArray(value) ? value : [value]).map(String);
}

function states(type: string): string[] {
  const entry = memory.types[type];
  if (entry === undefined) throw new Error(`no element type ${type} in memory.yaml`);
  return (entry.states ?? memory.defaults.states).sequence;
}

describe('the composed workflows fit this repository (task-127)', () => {
  it('includes only files that exist', () => {
    for (const { path, file } of included) expect(existsSync(file), path).toBe(true);
  });

  it('gives every included workflow a distinct name', () => {
    const names = workflows.map(({ workflow }) => workflow.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });

  it('includes only sub-workflows that are loaded', () => {
    const subs = new Set(workflows.filter(({ workflow }) => workflow.kind === 'sub').map(({ workflow }) => workflow.name));
    for (const { path, workflow } of workflows) {
      for (const phase of workflow.phases) {
        if (phase.include !== undefined) expect(subs.has(phase.include), `${path} ${phase.name}`).toBe(true);
      }
    }
  });

  it('falls back only to a step of the same workflow', () => {
    for (const { path, workflow } of workflows) {
      const keys = workflow.phases.map((phase) => phase.name);
      for (const phase of workflow.phases) {
        if (phase.fallback !== undefined) expect(keys, `${path} ${phase.name}`).toContain(phase.fallback.step);
      }
    }
  });

  it('iterates an included sub-workflow over its own element type', () => {
    const byName = new Map(workflows.map(({ workflow }) => [workflow.name, workflow]));
    for (const { path, workflow } of workflows) {
      for (const phase of workflow.phases) {
        const sub = phase.include === undefined ? undefined : byName.get(phase.include);
        if (sub?.element === undefined) continue;
        expect(phase.iterate_over ?? workflow.element, `${path} ${phase.name}`).toBe(sub.element);
      }
    }
  });

  it('sets only states of the machine it names', () => {
    for (const { path, workflow } of workflows) {
      for (const phase of workflow.phases) {
        // `<type>.set_state(<state>)` sets an element of that type (WingFoil's typed action). `element.set_state` and
        // a fallback's `set_state` set the phase's element, as WingFoil 0.3.2 resolves it: the element a
        // `memory.add` earlier in the phase created, else the selection's type(s) in a `where` phase that iterates
        // nothing, else the workflow's element. A quoted state is read too; a `set_state` the pattern cannot read
        // fails the test.
        const selected =
          phase.where !== undefined && phase.iterate_over === undefined ? typesOf(phase.where['type']) : undefined;
        let own: string[] = selected ?? (workflow.element === undefined ? [] : [workflow.element]);
        const targets: { types: string[]; state: string; action: string }[] = [];
        for (const action of (phase.actions ?? []).map(String)) {
          const added = /^\s*memory\.add\(\s*type:\s*([\w-]+)\s*\)\s*$/.exec(action);
          if (added?.[1] !== undefined) own = [added[1]];
          if (!action.includes('set_state')) continue;
          const match = /^\s*([a-z][a-z0-9-]*)\.set_state\(\s*["']?([\w-]+)["']?\s*\)\s*$/.exec(action);
          expect(match, `${path} ${phase.name}: unreadable ${action}`).not.toBeNull();
          const type = match?.[1] ?? 'element';
          targets.push({ types: type === 'element' ? own : [type], state: match?.[2] ?? '', action });
        }
        if (phase.fallback?.set_state !== undefined) {
          targets.push({ types: own, state: phase.fallback.set_state, action: 'fallback' });
        }
        for (const { types, state, action } of targets) {
          expect(types.length, `${path} ${phase.name} ${action}: set_state needs an element type`).toBeGreaterThan(0);
          for (const type of types) expect(states(type), `${path} ${phase.name} ${action}`).toContain(state);
        }
      }
    }
  });

  it('names only states of the element machine it selects', () => {
    for (const { path, workflow } of workflows) {
      if (workflow.element !== undefined) states(workflow.element);
      for (const phase of workflow.phases) {
        const status = phase.where?.['status'];
        if (status === undefined) continue;
        const types = typesOf(phase.where?.['type']) ?? (phase.iterate_over === undefined ? [] : [phase.iterate_over]);
        expect(types.length, `${path} ${phase.name}: a status filter needs a type`).toBeGreaterThan(0);
        // With several types, each state must belong to at least one of their machines.
        const known = types.flatMap((type) => states(type));
        for (const state of typesOf(status) ?? []) expect(known, `${path} ${phase.name}`).toContain(state);
      }
    }
  });
});
