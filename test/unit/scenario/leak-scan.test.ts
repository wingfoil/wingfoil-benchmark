import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  armLines,
  harnessMentions,
  loadLeakScanDeclarations,
  loadScenario,
  oracleLiterals,
  scanScenario,
} from '../../../src/scenario/index.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const DECLARATIONS = { harness_names: ['WingFoil', 'Spec Kit'], oracle_literal_min_length: 8 };

describe('oracleLiterals (REQ-FMT-08)', () => {
  it('takes the quoted strings of at least the minimum length: expected values and test names', () => {
    const text = [
      "import { cancel } from '../../seed/src/orders.js';",
      "const lazy = await import('../../seed/src/lazy.js');",
      "const old = require('../../seed/src/old.js');",
      "describe('cancelling an order', () => {",
      '  it("marks a pending order as cancelled", () => {',
      "    expect(cancel(o).status).toBe('cancelled');",
      '    expect(label).toBe(`Order ${id}`);',
      '    expect(text).toBe(`no interpolation here`);',
      "    expect(x).toBe('short');",
      "    expect(y).toBe('........');",
      "    expect(z).toBe('it\\'s escaped here');",
      '  });',
      '});',
    ].join('\n');
    expect(oracleLiterals(text, 8)).toEqual([
      'cancelling an order',
      'marks a pending order as cancelled',
      'cancelled',
      'no interpolation here',
      "it's escaped here",
    ]);
  });

  it('lists each literal once', () => {
    expect(oracleLiterals("'repeated value' + 'repeated value'", 8)).toEqual(['repeated value']);
  });
});

describe('harnessMentions (REQ-FMT-08)', () => {
  it('finds a declared name in any case, on word boundaries, as the text writes it', () => {
    expect(harnessMentions("Use wingfoil to record it, as WINGFOIL's docs say.", ['WingFoil'])).toEqual([
      'wingfoil',
      'WINGFOIL',
    ]);
    expect(harnessMentions('We went wingfoiling. A spec kit arrived.', ['WingFoil', 'Spec Kit'])).toEqual([
      'spec kit',
    ]);
    expect(harnessMentions('Nothing to see.', ['WingFoil'])).toEqual([]);
  });
});

describe('armLines (K3, dl-005)', () => {
  it('takes the prose lines of a document, after its frontmatter, without heading marks or bullets', () => {
    const text =
      '---\nid: no-throw\ntitle: "No throw"\n---\n\n# No throw rule\n\n- Never throw from the domain.\n\nShort.\n';
    expect(armLines(text, 8)).toEqual(['No throw rule', 'Never throw from the domain.']);
  });
});

/** T3 copied to a temporary repository, with its leak-scan declarations. */
function t3(change?: (dir: string) => void) {
  const root = tempDir('bench-repo-');
  cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
  const dir = join(root, 'scenarios', 'T3', '1.0');
  change?.(dir);
  const scenario = loadScenario(join(root, 'scenarios'), 'T3', '1.0');
  if (!scenario.ok) throw new Error(JSON.stringify(scenario.issues));
  return { root, dir, scenario: scenario.value };
}

describe('scanScenario (REQ-FMT-08)', () => {
  it('finds nothing in the fixture as it is', () => {
    expect(scanScenario(t3().scenario, DECLARATIONS)).toEqual([]);
  });

  it('names the step and the offending text of a harness in a prompt', () => {
    const { scenario } = t3((dir) =>
      writeFileSync(join(dir, 'prompts', '02.md'), 'Record it with WingFoil.\n'),
    );
    expect(scanScenario(scenario, DECLARATIONS)).toEqual([
      { path: 'steps[1].prompt_file', message: "names the harness 'WingFoil'" },
    ]);
  });

  it('names the oracle file an oracle literal of a prompt or a seed file comes from, never the literal', () => {
    const { scenario } = t3((dir) => {
      writeFileSync(join(dir, 'prompts', '01.md'), 'The test is: marks a pending order as cancelled.\n');
      writeFileSync(join(dir, 'seed', 'src', 'status.ts'), "export const done = 'cancelled';\n");
    });
    const issues = scanScenario(scenario, DECLARATIONS);
    expect(issues).toEqual([
      { path: 'steps[0].prompt_file', message: 'holds a literal of oracle/public/cancel.test.ts' },
      { path: 'seed', message: 'src/status.ts holds a literal of oracle/public/cancel.test.ts' },
    ]);
    expect(JSON.stringify(issues)).not.toContain('cancelled');
  });

  it("leaves a check's patterns out of the literal scan: they are the prompt's own words (task-035)", () => {
    const { scenario } = t3((dir) => {
      const yaml = join(dir, 'scenario.yaml');
      writeFileSync(
        yaml,
        readFileSync(yaml, 'utf8').replace(
          'holdout: true',
          '  checks: [oracle/checks/second.yaml]\nholdout: true',
        ),
      );
      mkdirSync(join(dir, 'oracle', 'checks'));
      writeFileSync(
        join(dir, 'oracle', 'checks', 'second.yaml'),
        "kind: content\nsteps: [2]\npatterns:\n  - ['second cancellation']\n  - ['already refused']\n",
      );
    });
    expect(scenario.oracle.checks.map((check) => check.id)).toEqual(['second']);
    expect(scanScenario(scenario, DECLARATIONS)).toEqual([]);
  });

  it('scans every suite of the oracle, not only the first (dl-001)', () => {
    const { scenario } = t3((dir) => {
      const yaml = join(dir, 'scenario.yaml');
      writeFileSync(
        yaml,
        readFileSync(yaml, 'utf8').replace(
          'after_steps: [1, 2] }',
          'after_steps: [1, 2] }\n    - { id: refunds, dir: oracle/refunds, after_steps: [2] }',
        ),
      );
      mkdirSync(join(dir, 'oracle', 'refunds'));
      writeFileSync(
        join(dir, 'oracle', 'refunds', 'refund.test.ts'),
        "expect(r).toBe('refunded in full');\n",
      );
      writeFileSync(join(dir, 'prompts', '02.md'), 'A paid order is refunded in full on request.\n');
    });
    expect(scenario.oracle.suites.map((suite) => suite.id)).toEqual(['orders', 'refunds']);
    expect(scanScenario(scenario, DECLARATIONS)).toEqual([
      { path: 'steps[1].prompt_file', message: 'holds a literal of oracle/refunds/refund.test.ts' },
    ]);
  });

  it('scans the hold-out additions and names only their file', () => {
    const { scenario } = t3((dir) =>
      writeFileSync(join(dir, 'prompts', '02.md'), 'Refunds go to account 9921-XK.\n'),
    );
    const holdout = tempDir('bench-holdout-');
    mkdirSync(join(holdout, 'hidden'), { recursive: true });
    writeFileSync(join(holdout, 'hidden', 'refund.test.ts'), "expect(r).toBe('account 9921-XK');\n");
    const issues = scanScenario(scenario, DECLARATIONS, { dir: holdout, files: ['hidden/refund.test.ts'] });
    expect(issues).toEqual([
      { path: 'steps[1].prompt_file', message: 'holds a literal of the hold-out file hidden/refund.test.ts' },
    ]);
    expect(JSON.stringify(issues)).not.toContain('9921');
  });

  it("finds a line of the scenario's arm configuration repeated in a prompt or the seed", () => {
    const { scenario } = t3((dir) => {
      const rules = join(dir, 'arms', 'wingfoil', '.wingfoil', 'directives', 'custom');
      mkdirSync(rules, { recursive: true });
      writeFileSync(
        join(rules, 'no-throw.md'),
        '---\nid: no-throw\n---\n\nFunctions return a Result and never throw.\n',
      );
      writeFileSync(
        join(dir, 'arms', 'wingfoil', '.wingfoil', 'dna.yaml'),
        'project:\n  description: A small orders domain\n',
      );
      writeFileSync(join(dir, 'prompts', '01.md'), 'Remember: Functions return a Result and never throw.\n');
      mkdirSync(join(dir, 'arms', 'baseline-docs'), { recursive: true });
      writeFileSync(
        join(dir, 'arms', 'baseline-docs', 'notes.md'),
        'Functions return a Result and never throw.\n',
      );
    });
    // Arms by name, so baseline-docs comes before wingfoil whatever the directory lists first.
    expect(scanScenario(scenario, DECLARATIONS)).toEqual([
      { path: 'steps[0].prompt_file', message: 'repeats a line of arms/baseline-docs/notes.md' },
      {
        path: 'steps[0].prompt_file',
        message: 'repeats a line of arms/wingfoil/.wingfoil/directives/custom/no-throw.md',
      },
    ]);
  });

  it.each([
    ['CLAUDE.md'],
    ['docs/CLAUDE.md'],
    ['.claude/settings.json'],
    ['sub/.wingfoil/dna.yaml'],
    ['PROJECT_RULES.md'],
    ['.mcp.json'],
  ])('refuses %s in the seed, which a run reserves', (path) => {
    const { scenario } = t3((dir) => {
      mkdirSync(join(dir, 'seed', path, '..'), { recursive: true });
      writeFileSync(join(dir, 'seed', path), '{}\n');
    });
    const reserved = path
      .split('/')
      .find((part) => ['CLAUDE.md', '.claude', '.wingfoil', 'PROJECT_RULES.md', '.mcp.json'].includes(part));
    const shown = path.slice(0, path.indexOf(reserved ?? '') + (reserved ?? '').length);
    expect(scanScenario(scenario, DECLARATIONS)).toEqual([
      { path: 'seed', message: `holds ${shown}, which a run's setup reserves` },
    ]);
  });

  it('leaves a PROJECT_RULES.md or .mcp.json below the root alone: only the root one is read', () => {
    const { scenario } = t3((dir) => {
      mkdirSync(join(dir, 'seed', 'docs'), { recursive: true });
      writeFileSync(join(dir, 'seed', 'docs', 'PROJECT_RULES.md'), 'x\n');
      writeFileSync(join(dir, 'seed', 'docs', '.mcp.json'), '{}\n');
    });
    expect(scanScenario(scenario, DECLARATIONS)).toEqual([]);
  });

  it('reports prompts by step, then the seed, in a stable order', () => {
    const { scenario } = t3((dir) => {
      writeFileSync(join(dir, 'prompts', '02.md'), 'Use WingFoil. The test: cancelling an order.\n');
      writeFileSync(join(dir, 'prompts', '01.md'), 'Ask Spec Kit.\n');
      writeFileSync(join(dir, 'seed', 'CLAUDE.md'), 'x\n');
      writeFileSync(join(dir, 'seed', 'a.md'), 'cancelling an order\n');
    });
    expect(scanScenario(scenario, DECLARATIONS).map((issue) => `${issue.path} ${issue.message}`)).toEqual([
      "steps[0].prompt_file names the harness 'Spec Kit'",
      "steps[1].prompt_file names the harness 'WingFoil'",
      'steps[1].prompt_file holds a literal of oracle/public/cancel.test.ts',
      "seed holds CLAUDE.md, which a run's setup reserves",
      'seed a.md holds a literal of oracle/public/cancel.test.ts',
    ]);
  });
});

describe('loadLeakScanDeclarations', () => {
  it("loads the benchmark's own declarations", () => {
    const result = loadLeakScanDeclarations(repoPath('scenarios/leak-scan.yaml'));
    expect(result.ok && result.value.harness_names).toContain('WingFoil');
    expect(result.ok && result.value.oracle_literal_min_length).toBe(8);
  });

  it('refuses a missing file or a malformed one, rather than fall back to defaults', () => {
    const dir = tempDir('bench-decl-');
    expect(loadLeakScanDeclarations(join(dir, 'leak-scan.yaml'))).toEqual({
      ok: false,
      issues: [{ path: 'leak-scan.yaml', message: `not found in ${dir}` }],
    });
    writeFileSync(join(dir, 'leak-scan.yaml'), 'harness_names: []\noracle_literal_min_length: 0\n');
    const malformed = loadLeakScanDeclarations(join(dir, 'leak-scan.yaml'));
    expect(malformed.ok).toBe(false);
    if (!malformed.ok)
      expect(malformed.issues.map((issue) => issue.path)).toEqual([
        'harness_names',
        'oracle_literal_min_length',
      ]);
  });
});
