// task-127 — the composed methodology (software 1.0.0, methodology/kanban 1.0.0, base 2.0.1) runs on this
// repository's own state machines (docs/pack-deviations.md). WingFoil 0.3.2 loads a workflow that names a state
// its element's machine lacks, and only stops when an instance reaches it; this test catches it at commit time.
import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { repoPath } from '../../support/paths.js';

type Phase = { name: string; include?: string; iterate_over?: string; where?: Record<string, unknown>; fallback?: { step: string } };
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

  it('names only states of the element machine it selects', () => {
    for (const { path, workflow } of workflows) {
      if (workflow.element !== undefined) states(workflow.element);
      for (const phase of workflow.phases) {
        const status = phase.where?.['status'];
        if (status === undefined) continue;
        const type = (phase.where?.['type'] as string | undefined) ?? phase.iterate_over;
        expect(type, `${path} ${phase.name}: a status filter needs a type`).toBeDefined();
        const known = states(type as string);
        for (const state of status as string[]) expect(known, `${path} ${phase.name}`).toContain(state);
      }
    }
  });
});
