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

  it("start the wingfoil arm's section from WingFoil's guide for agents at 0.2.2, and keep its rules (task-086)", () => {
    // The manual is wrapped Markdown: its words, one space apart.
    const own = manual('wingfoil').slice(manual('baseline').length).replace(/\s+/g, ' ');
    expect(own).toContain("WingFoil's guide for AI agents, release 0.2.2");
    // The guide's rules (docs/agents.md §4)
    expect(own).toContain('wingfoil directives list --role developer');
    expect(own).toMatch(/only through (its|the) verbs/);
    expect(own).toMatch(/exit code 1 is a rule speaking/i);
  });

  it('state where the wingfoil manual departs from the guide, and why (task-086, F-033)', () => {
    const own = manual('wingfoil').slice(manual('baseline').length).replace(/\s+/g, ' ');
    expect(own).toContain('### Where this arm departs from the guide');
    // The level of process the guide does not set
    expect(own).toMatch(/sets no level of process/);
    // The automated approver: the guide says an agent never approves; the decision is the neutral approver's
    expect(own).toMatch(/The guide says an agent never approves/);
    // The approval command, only after the reply's own sentence
    expect(own).toMatch(/If the reply is "Approved\. Proceed\.", run `wingfoil memory approve/);
  });

  it("send the wingfoil agent to read only what the docs controls also carry (task-086, the approver's choice C)", () => {
    const own = manual('wingfoil').slice(manual('baseline').length).replace(/\s+/g, ' ');
    // The role's rules and the approved decisions; not dna show, nor paths, nor the dna resource (REQ-RUN-11, T3)
    expect(own).not.toContain('wingfoil dna show');
    expect(own).not.toContain('wingfoil paths');
    expect(own).not.toContain('wingfoil://dna');
    expect(own).toContain('`developer-session`');
    expect(own).toContain('`wingfoil://memory/decision-log`');
  });

  it('state its three departures from the guide, configuration and rejection included (task-086)', () => {
    const own = manual('wingfoil').slice(manual('baseline').length);
    const departures = own.slice(own.indexOf('### Where this arm departs from the guide'));
    expect(departures.match(/^- \*\*/gm)).toHaveLength(3);
    const flat = departures.replace(/\s+/g, ' ');
    expect(flat).toContain('`memory reject`');
    expect(flat).toMatch(/configuration/i);
    // An exit code 2 is the command line's fault: fixed and run again, not reported and left
    expect(own.replace(/\s+/g, ' ')).toMatch(/exit code 2 means your command line is wrong/);
  });
});
