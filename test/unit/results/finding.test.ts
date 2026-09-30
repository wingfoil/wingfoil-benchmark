import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { findingNote, METRICS } from '../../../src/results/index.js';
import { aggregatedExecution, WINGFOIL_COMMIT } from '../../support/finding-fixture.js';

const REQUEST = { scenario: 'T3', version: '1.0', arms: ['baseline', 'wingfoil'], as: 'bug' as const };

async function noteOf(metric: string, overrides: Partial<typeof REQUEST> = {}) {
  const { executionDir } = await aggregatedExecution();
  const note = findingNote({ executionDir, ...REQUEST, metric, ...overrides });
  if (!note.ok) throw new Error(JSON.stringify(note.issues));
  return note.value;
}

describe('findingNote (F5.4, REQ-RES-05, task-044)', () => {
  it("names the note from its inputs, and writes REQ-RES-05's sections in order", async () => {
    const note = await noteOf('M-Q1');
    expect(note.id).toBe('abcdef012345-1-t3-1.0-m-q1-baseline+wingfoil');
    // The headings of the note itself: the WingFoil section's own are inside its fenced block.
    const outside = note.text.split('```')[0] ?? '';
    const headings = outside.split('\n').filter((line) => line.startsWith('#'));
    expect(headings).toEqual([
      '# Finding: M-Q1 on T3@1.0 — baseline, wingfoil',
      '## Campaign',
      '## WingFoil commit',
      '## Scenario',
      '## Runs',
      '## Metric values',
      '### baseline',
      '### wingfoil',
      '## Links',
      '## For WingFoil: bug',
    ]);
    expect(note.text).toContain('- campaign: abcdef012345, execution 1, model fake-model');
    expect(note.text).toContain(`- ${WINGFOIL_COMMIT}: abcdef012345/1/runs/T3@1.0/wingfoil/fake-model/r1, abcdef012345/1/runs/T3@1.0/wingfoil/fake-model/r2`);
    expect(note.text).toMatch(/- T3@1\.0 \(sha256:[0-9a-f]+\)/);
    expect(note.text).toContain('- baseline: n = 1 (preliminary): abcdef012345/1/runs/T3@1.0/baseline/fake-model/r1');
    expect(note.text).toContain('- final M-Q1: 1/1 (r1)');
    expect(note.text).toContain('- final M-Q1: 1/1 (r1), 0/1 (r2); range 0/1–1/1');
    expect(note.text).toContain('- `bench run show abcdef012345/1/runs/T3@1.0/wingfoil/fake-model/r2`');
    expect(note.text).toContain(
      '- `bench run compare abcdef012345/1/runs/T3@1.0/baseline/fake-model/r1 abcdef012345/1/runs/T3@1.0/wingfoil/fake-model/r1`',
    );
    // No date: the same inputs give the same bytes (the approver's choice 3).
    expect(note.text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("shapes the WingFoil section as the pinned commit's bug or decision-log template", async () => {
    const bug = (await noteOf('M-Q1')).text;
    const tail = bug.slice(bug.indexOf('## For WingFoil: bug'));
    expect(tail).toContain('title: ""');
    expect(tail).toContain('severity: ""');
    for (const section of ['## Summary', '## Steps to Reproduce', '## Expected Behavior', '## Actual Behavior', '## Notes']) {
      expect(tail).toContain(`\n${section}\n`);
    }
    expect(tail).toContain('<!-- to fill:');
    const dl = (await noteOf('M-Q1', { as: 'decision-log' } as never)).text;
    const dlTail = dl.slice(dl.indexOf('## For WingFoil: decision-log'));
    for (const section of ['Context', 'Decision', 'Rationale', 'Actions']) {
      expect(dlTail).toContain(`\n## ${section}\n`);
    }
    expect(dlTail).not.toContain('severity');
  });

  it('reads every metric of the catalogue, and states what the aggregate lacks', async () => {
    const { executionDir } = await aggregatedExecution();
    const text = (metric: string, arms = ['baseline', 'wingfoil']) => {
      const note = findingNote({ executionDir, ...REQUEST, arms, metric });
      if (!note.ok) throw new Error(`${metric}: ${JSON.stringify(note.issues)}`);
      const values = note.value.text.split('## Metric values')[1] ?? '';
      return values.split('## Links')[0] ?? '';
    };
    expect(METRICS).toEqual(['M-Q1', 'M-Q1-holdout', 'M-Q2', 'M-D3', 'M-F1', 'M-F2', 'M-K1', 'M-K2', 'M-K3', 'M-K4', 'M-E1', 'M-R']);
    expect(text('M-Q1-holdout')).toContain('- hold-out: not scored (not configured)');
    expect(text('M-Q2')).toContain('- lint (findings/lines): 1/10 (r1)');
    expect(text('M-D3')).toContain('- M-D3: 0 (r1)');
    expect(text('M-F1')).toContain('not measured for this scenario');
    expect(text('M-F2')).toContain('- step 02: cost 0.1000 EUR (r1)');
    expect(text('M-K1')).toContain('- cost: 0.1500 EUR (r1)');
    expect(text('M-K2')).toContain('- interventions: 1 (r1)');
    expect(text('M-K3')).toContain('- setup cost: 0.0000 EUR (r1)');
    expect(text('M-K4')).toContain('- baseline: the arm the others are compared with');
    expect(text('M-K4')).toMatch(/- wingfoil: (never|not applicable|\d)/);
    expect(text('M-E1')).toContain('no check');
    expect(text('M-R')).toContain('- baseline: n = 1: no value');
    expect(text('M-R')).toMatch(/- M-R1: \d+\/\d+ over abcdef012345/);
  });

  it('gives the same note twice, byte for byte', async () => {
    const { executionDir } = await aggregatedExecution();
    const one = findingNote({ executionDir, ...REQUEST, metric: 'M-R' });
    const two = findingNote({ executionDir, ...REQUEST, metric: 'M-R' });
    expect(one).toEqual(two);
  });

  it('refuses an unknown metric, scenario version or arm, naming it and what exists, and an execution not aggregated', async () => {
    const { executionDir } = await aggregatedExecution();
    expect(findingNote({ executionDir, ...REQUEST, metric: 'M-X' })).toEqual({
      ok: false,
      issues: [{ path: '--metric', message: `M-X is not one of ${METRICS.join(', ')}` }],
    });
    expect(findingNote({ executionDir, ...REQUEST, metric: 'M-Q1', version: '9.9' })).toEqual({
      ok: false,
      issues: [{ path: '--scenario', message: 'T3@9.9 is not in the execution (T3@1.0)' }],
    });
    expect(findingNote({ executionDir, ...REQUEST, metric: 'M-Q1', arms: ['baseline', 'spec-kit'] })).toEqual({
      ok: false,
      issues: [{ path: '--arms', message: 'spec-kit has no run of T3@1.0 (baseline, wingfoil)' }],
    });
    const missing = findingNote({ executionDir: `${executionDir}-none`, ...REQUEST, metric: 'M-Q1' });
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.issues[0]?.message).toContain('aggregate.json');
  });

  it('keeps each arm apart in the pasted block, with the template\'s sections in order and its Triage section', async () => {
    const bug = (await noteOf('M-D3')).text;
    const block = bug.slice(bug.indexOf('```markdown'));
    const headings = block.split('\n').filter((line) => line.startsWith('## '));
    expect(headings).toEqual([
      '## Summary',
      '## Steps to Reproduce',
      '## Expected Behavior',
      '## Actual Behavior',
      '## Notes',
      '## Triage & Execution Notes',
    ]);
    expect(block).toContain('\n\n### baseline\n\n- M-D3:');
    expect(block).toContain('\n\n### wingfoil\n\n- M-D3:');
    // Filled in: the campaign file the execution copied, and the commands with this finding's options.
    expect(block).toContain('`bench campaign run results/abcdef012345/1/campaign.yaml`');
    expect(block).toContain('`bench score abcdef012345/<n>`');
    expect(block).toContain(
      '`bench finding abcdef012345/<n> --scenario T3@1.0 --metric M-D3 --arms baseline,wingfoil --as bug`',
    );
    expect(block).toContain('`bench run show abcdef012345/1/runs/T3@1.0/wingfoil/fake-model/r1`');
    // The title is `memory add`'s, which needs it: the note does not blank it.
    expect(bug).toContain('`wingfoil memory add --type bug --title "…"`');
    expect(bug).not.toContain('title: ""');
    expect(bug).toContain('severity: ""');
  });

  it('names the same finding the same whatever the order of the arms, and refuses an arm named twice', async () => {
    const { executionDir } = await aggregatedExecution();
    const one = findingNote({ executionDir, ...REQUEST, metric: 'M-Q1', arms: ['wingfoil', 'baseline'] });
    expect(one.ok && one.value.id).toBe('abcdef012345-1-t3-1.0-m-q1-baseline+wingfoil');
    expect(findingNote({ executionDir, ...REQUEST, metric: 'M-Q1', arms: ['wingfoil', 'wingfoil'] })).toEqual({
      ok: false,
      issues: [{ path: '--arms', message: 'wingfoil is named twice' }],
    });
  });

  it("refuses a run whose record cannot be read, rather than say WingFoil never ran", async () => {
    const { executionDir } = await aggregatedExecution();
    const run = join(executionDir, 'runs', 'T3@1.0', 'wingfoil', 'fake-model', 'r2', 'run.json');
    writeFileSync(run, '{');
    const note = findingNote({ executionDir, ...REQUEST, metric: 'M-Q1' });
    expect(note.ok).toBe(false);
    expect(!note.ok && note.issues[0]?.path).toBe('abcdef012345/1/runs/T3@1.0/wingfoil/fake-model/r2/run.json');
  });
});

