// task-127 — the composed methodology (software 1.0.0, methodology/kanban 1.0.0, base 2.0.1) runs on this
// repository's own state machines (docs/pack-deviations.md). WingFoil 0.3.2 loads a workflow whose `where` status
// filter, or in some `set_state` actions, names a state the type's machine lacks with no diagnostic (F-049); this test
// catches it at commit time. Its `set_state` check guards future actions (no included workflow has one today) and
// never fails a state some type in the workflow's reach has; it also checks every include's element.
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
type Machine = {
  sequence: string[];
  gates?: Record<string, { reject?: string }>;
  returns?: Record<string, string>;
};

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

/** Every state an element of `type` can be in, as WingFoil's `machineStates` reads it: the sequence, the reject and
 * return targets, and `deprecated`. */
function states(type: string): string[] {
  const entry = memory.types[type];
  if (entry === undefined) throw new Error(`no element type ${type} in memory.yaml`);
  const machine = entry.states ?? memory.defaults.states;
  const rejects = Object.values(machine.gates ?? {}).flatMap((gate) => (gate.reject === undefined ? [] : [gate.reject]));
  return [...machine.sequence, ...rejects, ...Object.values(machine.returns ?? {}), 'deprecated'];
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
      // An untyped `element.set_state` and a fallback's `set_state` apply to an element WingFoil resolves from the
      // step (bound, created, selected); this check does not repeat that resolution. It accepts the state if it
      // belongs to any type the workflow can act on: its element, a type a `memory.add` in it creates, a type a step
      // selects. A typed `<type>.set_state` is checked against that type. So it never fails a state WingFoil
      // accepts, and still fails one no machine in reach has.
      const added = workflow.phases.flatMap((phase) =>
        (phase.actions ?? [])
          .map(String)
          .map((action) => (action.startsWith('memory.add') ? /\btype\s*:\s*["']?([\w-]+)/.exec(action)?.[1] : undefined))
          .filter((type): type is string => type !== undefined),
      );
      const selected = workflow.phases.flatMap((phase) => typesOf(phase.where?.['type']) ?? []);
      const reach = [...new Set([...(workflow.element === undefined ? [] : [workflow.element]), ...added, ...selected])];
      for (const phase of workflow.phases) {
        const targets: { types: string[]; state: string; action: string }[] = [];
        for (const action of (phase.actions ?? []).map(String)) {
          if (!action.includes('set_state')) continue;
          const match = /^\s*([a-z][a-z0-9-]*)\.set_state\(\s*["']?([\w-]+)["']?\s*\)\s*$/.exec(action);
          expect(match, `${path} ${phase.name}: unreadable ${action}`).not.toBeNull();
          const type = match?.[1] ?? 'element';
          targets.push({ types: type === 'element' ? reach : [type], state: match?.[2] ?? '', action });
        }
        if (phase.fallback?.set_state !== undefined) {
          targets.push({ types: reach, state: phase.fallback.set_state, action: 'fallback' });
        }
        for (const { types, state, action } of targets) {
          if (types.length === 0) continue; // no type in reach: WingFoil's own resolution decides
          expect(types.flatMap((type) => states(type)), `${path} ${phase.name} ${action}`).toContain(state);
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
