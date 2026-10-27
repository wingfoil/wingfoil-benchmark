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

  it("carry each openspec request from propose through apply in its one session, past propose's stop (bug-023)", () => {
    const own = manual('openspec');
    for (const command of ['/opsx:propose', '/opsx:apply', '/opsx:archive']) expect(own).toContain(command);
    // OpenSpec's propose skill ends with "stop and wait for a new user request": in a headless session, the request
    // itself is that request, and the session must not end on the proposal.
    expect(own).toContain('in this one session');
    expect(own).toContain('do not end the session after `/opsx:propose`');
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

  it('mention no MCP Tool, since WingFoil v0.3.1 has none either (adr-003 decision 13; tools/list is [], task-095)', () => {
    expect(manual('wingfoil')).not.toMatch(/MCP tools?\b/i);
  });

  it('leave placeholders behind', () => {
    for (const arm of ['baseline', 'baseline-docs', 'wingfoil', 'speckit'])
      expect(manual(arm)).not.toMatch(/placeholder|task-014/i);
  });
});

/** The wingfoil arm's own section, its words one space apart (the manual is wrapped Markdown). */
function wingfoilOwn(): string {
  return manual('wingfoil').slice(manual('baseline').length).replace(/\s+/g, ' ');
}

describe('the step-A wingfoil manual (dl-021 step A, task-114)', () => {
  it("starts from WingFoil's guide for agents at 0.3.1, and keeps its rules", () => {
    const own = wingfoilOwn();
    expect(own).toContain("WingFoil's guide for AI agents, release 0.3.1");
    expect(own).toMatch(/act only on committed documents/);
    expect(own).toMatch(/only through (its|the) verbs/);
    expect(own).toMatch(/exit code 1 is a rule speaking/i);
    expect(own).toMatch(/exit code 2 means your command line is wrong/);
  });

  it("has the agent drive the workflow's cycle: status, next, a new instance after a delivery, finalize", () => {
    const own = wingfoilOwn();
    for (const command of [
      'wingfoil workflow status',
      'wingfoil workflow next',
      'wingfoil workflow start sw-life-cycle',
      'wingfoil workflow finalize',
    ])
      expect(own).toContain(command);
    // task-107's option A: on 0.3.1's Kanban scaffold an instance's delivery runs once (F-044)
    expect(own).toContain('`sw-life-cycle.sunset`');
  });

  it("finishes the step's work before it asks for an approval at a gate (experiment design 1.7)", () => {
    expect(wingfoilOwn()).toMatch(/At a gate, finish the work first/);
  });

  it('gives every request its task, without --workflow when the step does not ask for one (decision 1, F-043)', () => {
    const own = wingfoilOwn();
    expect(own).toContain('**Every request has its task.**');
    expect(own).toContain('without `--workflow`');
    expect(own).toContain('wingfoil memory add --type task --title');
    expect(own).toMatch(/`wingfoil memory submit <id>` before you build/);
  });

  it('reads the context through the CLI, the session Resource named as its equivalent, not required (decision 2)', () => {
    const own = wingfoilOwn();
    expect(own).toContain('wingfoil directives list --role <role>');
    expect(own).toContain('wingfoil memory search --type decision-log --status approved');
    expect(own).toContain('wingfoil://session/');
    expect(own).toMatch(/you need not read them through the MCP server/);
    // Only what the docs controls also carry (REQ-RUN-11, T3): not the project's dna, nor its paths
    expect(own).not.toContain('wingfoil dna show');
    expect(own).not.toContain('wingfoil paths');
    expect(own).not.toContain('wingfoil://dna');
  });

  it("forbids the approver's verbs other than approve, by name (decision 3)", () => {
    expect(wingfoilOwn()).toMatch(
      /never run the approver's other verbs: `wingfoil memory amend`, `wingfoil memory reject` or `wingfoil memory rekey`/,
    );
    expect(wingfoilOwn()).toMatch(/If the reply is "Approved\. Proceed\.", run `wingfoil memory approve/);
  });

  it("names the agent-specific files: the manual as CLAUDE.md or AGENTS.md, the MCP server's configuration", () => {
    const own = wingfoilOwn();
    expect(own).toContain('`CLAUDE.md` under Claude Code');
    expect(own).toContain('`AGENTS.md` under Codex');
    expect(own).toContain("Codex's `config.toml`");
  });

  it('states its departures from the guide: starting a workflow, a task per request, configuration, approvals', () => {
    const own = manual('wingfoil').slice(manual('baseline').length);
    const departures = own.slice(own.indexOf('### Where this arm departs from the guide'));
    expect([...departures.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((match) => match[1])).toEqual([
      'Starting a workflow.',
      'A task for every request.',
      'Configuration.',
      'Approvals.',
    ]);
    expect(departures.replace(/\s+/g, ' ')).toContain('never edit a file under `.wingfoil/`');
  });
});

describe("the step-A wingfoil arm's files (dl-021 step A, task-114)", () => {
  const read = (file: string) => readFileSync(repoPath(`arms/wingfoil/${file}`), 'utf8');

  it('opens one sw-life-cycle instance in its setup and brings it to its delivery (task-107 option A)', () => {
    const steps = read('setup.sh')
      .split('\n')
      .filter((line) => /^wingfoil workflow /.test(line))
      .map((line) => line.replace(/\s*>.*$/, ''));
    expect(steps).toEqual([
      'wingfoil workflow start sw-life-cycle',
      'wingfoil workflow finalize',
      'wingfoil workflow finalize',
    ]);
  });

  it('names WingFoil v0.3.1 in its definition, its capabilities re-read there', () => {
    expect(read('arm.yaml')).toContain('v0.3.1');
    expect(read('arm.yaml')).not.toContain('WingFoil v0.3.0 sends');
  });
});
