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
  });

  it('give each other arm a section of its own after the core', () => {
    const core = manual('baseline');
    expect(manual('baseline-docs').slice(core.length)).toMatch(/^\n## This arm\n/);
    expect(manual('wingfoil').slice(core.length)).toMatch(/^\n## This arm\n/);
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

  it('tell the wingfoil agent to commit a document before submitting it (WingFoil v0.2.2 refuses otherwise)', () => {
    // v0.2.2's write guard refuses `memory submit` on a document with uncommitted changes (task-049).
    const submits = [...manual('wingfoil').matchAll(/commit that file, then\s+`wingfoil memory submit <id>`/g)];
    expect(submits).toHaveLength(2);
    expect(manual('wingfoil')).not.toMatch(/in the file it creates, then `wingfoil memory submit/);
  });

  it('mention no MCP Tool, since WingFoil v0.2.2 has none (adr-003 decision 13, re-checked in task-049)', () => {
    expect(manual('wingfoil')).not.toMatch(/MCP tools?\b/i);
  });

  it('leave placeholders behind', () => {
    for (const arm of ['baseline', 'baseline-docs', 'wingfoil'])
      expect(manual(arm)).not.toMatch(/placeholder|task-014/i);
  });
});
