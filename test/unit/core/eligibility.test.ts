import { describe, expect, it } from 'vitest';

import { eligibilityIssues, parseWith, registerSchema } from '../../../src/core/index.js';
import type { Register } from '../../../src/core/index.js';
import { CRITERIA, registerEntry } from '../../support/eligibility-fixture.js';

function parse(entries: readonly Record<string, unknown>[], criteria: readonly string[] = CRITERIA) {
  return parseWith(registerSchema, { criteria: [...criteria], entries }, 'register.yaml');
}

function register(...entries: Record<string, unknown>[]): Register {
  const parsed = parse(entries);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.value;
}

const WINGFOIL_ARM = [{ name: 'baseline' }, { name: 'wingfoil', requires: 'wingfoil' }];

describe('the register schema', () => {
  it('reads entries with the five criteria, each with a result and its evidence', () => {
    expect(
      parse([registerEntry('wingfoil', 'v0.2.2'), registerEntry('bmad', '6.12.1', ['no-own-llm'])]).ok,
    ).toBe(true);
  });

  it('requires the five criteria in their published order', () => {
    const result = parse(
      [],
      ['pinnable', 'agent-and-model', 'headless-container', 'workflow-harness', 'no-own-llm'],
    );
    expect(result.ok ? [] : result.issues).toEqual([
      {
        path: 'criteria',
        message:
          'must be the five published criteria in order: agent-and-model, pinnable, headless-container, workflow-harness, no-own-llm',
      },
    ]);
  });

  it('requires every criterion in every entry, and no other', () => {
    const entry = registerEntry('wingfoil', 'v0.2.2') as { criteria: Record<string, unknown> };
    delete entry.criteria.pinnable;
    entry.criteria.speed = { result: 'pass', evidence: 'fast' };
    const result = parse([entry]);
    expect(result.ok ? [] : result.issues.map((issue) => issue.path).sort()).toEqual([
      'entries[0].criteria.pinnable',
      'entries[0].criteria.speed',
    ]);
  });

  it('makes the verdict follow the criteria: admitted passes all five, excluded fails one at least', () => {
    const admittedButFailing = { ...registerEntry('x', '1.0.0', ['pinnable']), verdict: 'admitted' };
    const excludedButPassing = { ...registerEntry('y', '1.0.0'), verdict: 'excluded' };
    const result = parse([admittedButFailing, excludedButPassing]);
    expect(result.ok ? [] : result.issues).toEqual([
      { path: 'entries[0].verdict', message: "is 'admitted', but the entry fails pinnable" },
      { path: 'entries[1].verdict', message: "is 'excluded', but the entry passes every criterion" },
    ]);
  });

  it('assesses a tool at a version once', () => {
    const result = parse([registerEntry('wingfoil', 'v0.2.2'), registerEntry('wingfoil', 'v0.2.2')]);
    expect(result.ok ? [] : result.issues).toEqual([
      { path: 'entries[1]', message: 'assesses wingfoil v0.2.2 again: one entry per tool and version' },
    ]);
  });

  it('wants evidence for every result, a date and a reason', () => {
    const entry = registerEntry('wingfoil', 'v0.2.2') as Record<string, unknown> & {
      criteria: Record<string, { evidence: string }>;
    };
    entry.criteria.pinnable = { result: 'pass', evidence: '' } as never;
    entry.date = 'yesterday';
    entry.reason = '';
    const result = parse([entry]);
    expect(result.ok ? [] : result.issues.map((issue) => issue.path).sort()).toEqual([
      'entries[0].criteria.pinnable.evidence',
      'entries[0].date',
      'entries[0].reason',
    ]);
  });
});

describe('a campaign against the register', () => {
  const harnesses = { wingfoil: { tool: 'wingfoil', version: 'v0.2.2' } };

  it('lets an arm pin an admitted version', () => {
    expect(eligibilityIssues(harnesses, WINGFOIL_ARM, register(registerEntry('wingfoil', 'v0.2.2')))).toEqual(
      [],
    );
  });

  it('names the tool and every criterion an excluded version fails, with its evidence', () => {
    const excluded = registerEntry('wingfoil', 'v0.2.2', ['pinnable', 'no-own-llm']);
    expect(eligibilityIssues(harnesses, WINGFOIL_ARM, register(excluded))).toEqual([
      {
        path: 'harnesses.wingfoil',
        message:
          'wingfoil v0.2.2 is excluded by the eligibility register: it fails pinnable ' +
          '(wingfoil v0.2.2 fails pinnable in this fixture)',
      },
      {
        path: 'harnesses.wingfoil',
        message:
          'wingfoil v0.2.2 is excluded by the eligibility register: it fails no-own-llm ' +
          '(wingfoil v0.2.2 fails no-own-llm in this fixture)',
      },
    ]);
  });

  it('refuses a version the register has not assessed, another version or another tool notwithstanding', () => {
    const other = register(registerEntry('wingfoil', 'v0.2.1'), registerEntry('speckit', 'v0.2.2'));
    expect(eligibilityIssues(harnesses, WINGFOIL_ARM, other)).toEqual([
      {
        path: 'harnesses.wingfoil.version',
        message:
          'wingfoil v0.2.2 is not assessed in eligibility/register.yaml: assess it before a campaign pins it',
      },
    ]);
  });

  it('asks nothing of an arm that runs the plain agent, nor of a harness no arm requires', () => {
    expect(eligibilityIssues({}, [{ name: 'baseline' }], register())).toEqual([]);
    const stray = { baseline: { tool: 'bmad', version: '6.12.1' } };
    expect(eligibilityIssues(stray, [{ name: 'baseline' }], register())).toEqual([]);
  });

  it('refuses a campaign with a harness arm when there is no register', () => {
    expect(eligibilityIssues(harnesses, WINGFOIL_ARM, undefined)).toEqual([
      {
        path: 'eligibility/register.yaml',
        message: 'not found: a harness arm can pin only a tool the register admits (REQ-FMT-11)',
      },
    ]);
  });
});
