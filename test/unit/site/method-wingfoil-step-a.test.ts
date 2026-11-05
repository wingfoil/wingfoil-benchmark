import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';

/** The method page's paragraphs by anchor, their words one space apart. */
function paragraph(anchor: string): string {
  const text = readFileSync(repoPath('site-content/method.md'), 'utf8');
  const lines = text.split('\n');
  const end = lines.findIndex((l) => l.includes(`{#${anchor}}`));
  if (end < 0) return '';
  let start = end;
  while (start > 0 && lines[start - 1]?.trim() !== '') start -= 1;
  return lines
    .slice(start, end + 1)
    .join(' ')
    .replace(/\s+/g, ' ');
}

describe('the method page on the step-A wingfoil arm (task-135, dl-021 step A)', () => {
  it("states that the session agent drives WingFoil 0.3.1's workflow cycle, with no driver of the benchmark", () => {
    const stepA = paragraph('wingfoil-step-a');
    expect(stepA).toContain('0.3.1');
    expect(stepA).toMatch(/`workflow status`/);
    expect(stepA).toMatch(/`workflow next`/);
    expect(stepA).toMatch(/`workflow finalize`/);
    expect(stepA).toMatch(/no driver written by the benchmark/);
  });

  it("states the step-A manual's choices: an instance per request, the work done before the gate, the gate's request", () => {
    const stepA = paragraph('wingfoil-step-a');
    expect(stepA).toMatch(/instance of its own|its own instance/);
    expect(stepA).toMatch(/before (it asks|asking) for the approval/);
    expect(stepA).toContain('"Please approve <id>."');
    expect(stepA).toContain('"Approved. Proceed."');
  });

  it("states baseline-docs' every-role directives and that the engine executes no step", () => {
    const stepA = paragraph('wingfoil-step-a');
    expect(stepA).toMatch(/every role's rules/);
    expect(stepA).toMatch(/records and routes/);
    expect(stepA).toMatch(/carries out none|executes none/);
    expect(stepA).toMatch(/own context/);
  });

  it('names which executions ran which manual', () => {
    const stepA = paragraph('wingfoil-step-a');
    expect(stepA).toMatch(/campaign-002 and campaign-003[^.]*v0\.2 manual/);
    expect(stepA).toMatch(/campaign-007 and campaign-008[^.]*step-A manual/);
  });

  it('places the step-A paragraph right after the v0.2 one, a blank line between', () => {
    const lines = readFileSync(repoPath('site-content/method.md'), 'utf8').split('\n');
    const v02 = lines.findIndex((l) => l.includes('{#wingfoil-manual-process}'));
    const stepA = lines.findIndex((l) => l.includes('{#wingfoil-step-a}'));
    expect(v02).toBeGreaterThan(0);
    expect(stepA).toBe(v02 + 2);
  });

  it("keeps S10's own approver apart and dates the commit-before-the-gate rule after campaign-008", () => {
    const stepA = paragraph('wingfoil-step-a');
    expect(stepA).toMatch(/except in a scenario with an approver of its own \(S10\)/);
    expect(stepA).toMatch(/after campaign-008[^.]*commit every change/);
  });

  it('points to the step-A paragraph from the v0.2 one', () => {
    expect(paragraph('wingfoil-manual-process')).toMatch(/\(#wingfoil-step-a\)/);
  });

  it("splits Codex's wingfoil arm between the v0.2 manual and step A", () => {
    const other = paragraph('other-agents');
    expect(other).toMatch(/campaign-005 and campaign-006[^.]*v0\.2 manual/);
    expect(other).toMatch(/campaign-007[^.]*step-A manual/);
  });

  it("names 0.3.1 and the engine the agent drives in T10, beside v0.2's v0.3.0 and v0.2.2", () => {
    const t10 = paragraph('threat-t10');
    expect(t10).toContain('v0.3.1');
    expect(t10).toMatch(/agent drives/);
    expect(t10).toContain('v0.3.0');
    expect(t10).toContain('v0.2.2');
  });
});
