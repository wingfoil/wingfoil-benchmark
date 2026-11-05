import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { repoPath } from '../../support/paths.js';

/** The method page's paragraph that ends with an anchor, its lines joined and its words one space apart. */
function paragraph(anchor: string): string {
  const lines = readFileSync(repoPath('site-content/method.md'), 'utf8').split('\n');
  const end = lines.findIndex((l) => l.includes(`{#${anchor}}`));
  if (end < 0) return '';
  let start = end;
  while (start > 0 && lines[start - 1]?.trim() !== '') start -= 1;
  return lines
    .slice(start, end + 1)
    .join(' ')
    .replace(/\s+/g, ' ');
}

/** Each published execution's approver policy, from the campaign file its results keep (the one that ran). */
function pinnedPolicies(): Map<string, string> {
  const catalog = parse(readFileSync(repoPath('site-content/catalog.yaml'), 'utf8')) as {
    executions: Record<string, unknown>;
  };
  const policies = new Map<string, string>();
  for (const execution of Object.keys(catalog.executions)) {
    const campaign = parse(readFileSync(repoPath(`results/${execution}/campaign.yaml`), 'utf8')) as {
      approver_policy?: string;
    };
    policies.set(execution, campaign.approver_policy ?? '');
  }
  return policies;
}

/** The page's list: for each "vN for …" clause of #approver-classifier, the execution ids it names. */
function listedPolicies(): Map<string, string> {
  const text = paragraph('approver-classifier');
  const listed = new Map<string, string>();
  for (const clause of text.matchAll(/\b(v\d+) for (.*?)(?=; |\. |$)/g)) {
    const [, version, names] = clause;
    for (const id of (names ?? '').matchAll(/`([0-9a-f]{12}\/\d+)`/g)) listed.set(id[1] ?? '', version ?? '');
  }
  return listed;
}

describe("the method page's approver policy per execution (task-136)", () => {
  it('names every published execution under the policy its results pin, and no other', () => {
    const pinned = pinnedPolicies();
    expect(pinned.size).toBeGreaterThan(0);
    expect(Object.fromEntries(listedPolicies())).toEqual(Object.fromEntries(pinned));
  });

  it('says the pin is shown in the execution\'s own section, and drops the "every execution so far" sentence', () => {
    const text = paragraph('approver-classifier');
    expect(text).toMatch(/\[This execution\]\(#this-execution\)/);
    expect(text).not.toMatch(/every execution so far/);
  });
});
