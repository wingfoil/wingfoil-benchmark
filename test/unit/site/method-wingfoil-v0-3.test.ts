import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';

/** The method page's paragraphs by anchor, their words one space apart. */
function paragraph(anchor: string): string {
  const text = readFileSync(repoPath('site-content/method.md'), 'utf8');
  const line = text.split('\n').find((l) => l.includes(`{#${anchor}}`)) ?? '';
  return line.replace(/\s+/g, ' ');
}

describe('the method page on WingFoil v0.3.0 (task-095, experiment design 1.5)', () => {
  it('names v0.3.0 for the reference campaign and v0.2.2 for the bridge in T10', () => {
    const t10 = paragraph('threat-t10');
    expect(t10).toContain('v0.3.0');
    expect(t10).toMatch(/bridge[^.]*v0\.2\.2/);
  });

  it("says the wingfoil arm measures WingFoil's bare init scaffold, with no workflow written for the benchmark", () => {
    const process = paragraph('wingfoil-manual-process');
    expect(process).toContain('0.3.0');
    expect(process).toMatch(/`init` scaffold/);
    expect(process).toMatch(/no workflow written for the benchmark/);
  });
});
