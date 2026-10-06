import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';

/** The benchmark's own operating manuals (F2.7), as published. */
function manual(arm: string): string {
  return readFileSync(repoPath(`arms/${arm}/manual.md`), 'utf8');
}

describe('the operating manuals (F2.7)', () => {
  it('share a common core, byte for byte: the baseline manual is that core and nothing else', () => {
    const core = manual('baseline');
    expect(core.length).toBeGreaterThan(0);
    expect(manual('baseline-docs').startsWith(core)).toBe(true);
    expect(manual('wingfoil').startsWith(core)).toBe(true);
    expect(manual('speckit').startsWith(core)).toBe(true);
  });

  it('give each other arm a section of its own after the core', () => {
    const core = manual('baseline');
    expect(manual('baseline-docs').slice(core.length)).toMatch(/^\n## This arm\n/);
    expect(manual('wingfoil').slice(core.length)).toMatch(/^\n## This arm\n/);
    expect(manual('speckit').slice(core.length)).toMatch(/^\n## This arm\n/);
  });

  it("point the speckit arm at Spec Kit's skills and its constitution, and away from its workflow engine", () => {
    const own = manual('speckit');
    for (const skill of ['/speckit-specify', '/speckit-plan', '/speckit-tasks', '/speckit-implement'])
      expect(own).toContain(skill);
    expect(own).toContain('`.specify/memory/constitution.md`');
    expect(own).toContain('Never run `specify workflow`');
  });

  it('point baseline-docs at the rules its environment carries', () => {
    expect(manual('baseline-docs')).toContain('`PROJECT_RULES.md`');
  });

  it('tell the wingfoil agent to call wingfoil, never through npx (adr-003 decision 3)', () => {
    expect(manual('wingfoil')).toContain('`wingfoil`');
    // Every mention of npx is a warning against it, never an instruction.
    const mentions = [...manual('wingfoil').matchAll(/npx wingfoil/g)].map((match) =>
      manual('wingfoil').slice(Math.max(0, (match.index ?? 0) - 8), match.index),
    );
    expect(mentions.every((before) => /never `?$/.test(before))).toBe(true);
  });

  it('name the approval command the wingfoil agent runs after the reply, and only then (REQ-RUN-17)', () => {
    expect(manual('wingfoil')).toContain('Approved. Proceed.');
    expect(manual('wingfoil')).toContain('wingfoil memory approve');
  });

  it('mention no MCP Tool, since WingFoil v0.2.2 has none (adr-003 decision 13, re-checked in task-049)', () => {
    expect(manual('wingfoil')).not.toMatch(/MCP tools?\b/i);
  });

  it('leave placeholders behind', () => {
    for (const arm of ['baseline', 'baseline-docs', 'wingfoil', 'speckit'])
      expect(manual(arm)).not.toMatch(/placeholder|task-014/i);
  });
});
