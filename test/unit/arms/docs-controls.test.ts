import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  DOCS_GENERATORS,
  docsGeneratorOf,
  loadArm,
  RULES_GENERATORS,
  rulesGeneratorOf,
  renderSpeckitDocs,
} from '../../../src/arms/index.js';
import { repoPath } from '../../support/paths.js';

const CONSTITUTION = '.specify/memory/constitution.md';

describe('the docs generators (REQ-RUN-11, task-067)', () => {
  it('render the principles of the speckit arm’s constitution as the project’s rules', () => {
    const constitution = [
      '# Project Constitution',
      '',
      '## Core Principles',
      '',
      '### No new runtime dependency',
      '',
      'Add no runtime dependency.',
      '',
      '### Keep the API stable',
      '',
      'Do not change a public signature.',
      '',
    ].join('\n');
    const rendered = renderSpeckitDocs(new Map([[CONSTITUTION, constitution]]));
    expect(rendered).toBe(
      [
        '# Project rules',
        '',
        'The rules this project follows. Every change follows them.',
        '',
        '## Rules',
        '',
        '### No new runtime dependency',
        '',
        'Add no runtime dependency.',
        '',
        '### Keep the API stable',
        '',
        'Do not change a public signature.',
        '',
      ].join('\n'),
    );
    expect(rendered).not.toContain('Core Principles');
  });

  it('say that the project declares no rules when the constitution is init’s template or missing', () => {
    const none = '# Project rules\n\nThis project declares no rules beyond its README.\n';
    const template = '# [PROJECT_NAME] Constitution\n\n### [PRINCIPLE_1_NAME]\n\n[PRINCIPLE_1_DESCRIPTION]\n';
    expect(renderSpeckitDocs(new Map([[CONSTITUTION, template]]))).toBe(none);
    expect(renderSpeckitDocs(new Map([[CONSTITUTION, '# Constitution\n\nNo principle.\n']]))).toBe(none);
    expect(renderSpeckitDocs(new Map())).toBe(none);
  });

  it('keep a rule whose text holds brackets: only init’s own placeholders mean no rules', () => {
    const constitution = '# Constitution\n\n### Read argv[0]\n\nUse items[1] and [TODO] markers.\n';
    expect(renderSpeckitDocs(new Map([[CONSTITUTION, constitution]]))).toContain(
      '### Read argv[0]\n\nUse items[1] and [TODO] markers.\n',
    );
  });

  it('are the same bytes for the same configuration', () => {
    const files = new Map([[CONSTITUTION, '# C\n\n### Rule\n\nText.\n']]);
    expect(renderSpeckitDocs(files)).toBe(renderSpeckitDocs(new Map(files)));
  });

  it('exist for every harness arm, each declaring what it renders and what it leaves out', () => {
    for (const tool of ['wingfoil', 'speckit']) {
      const generator = DOCS_GENERATORS[tool];
      expect(generator, tool).toBeDefined();
      expect(generator?.kept.length, tool).toBeGreaterThan(0);
      const rendered = new Set(generator?.declaration.map((row) => row.rendered));
      expect([...rendered].sort(), tool).toEqual([false, true]);
      for (const row of generator?.declaration ?? []) expect(row.why.length, row.kind).toBeGreaterThan(0);
    }
  });

  it('are looked up by own entry only, so a tool named like an Object property has none', () => {
    for (const tool of ['constructor', 'toString', '__proto__', 'baseline', undefined]) {
      expect(docsGeneratorOf(tool), String(tool)).toBeUndefined();
      expect(rulesGeneratorOf(tool), String(tool)).toBeUndefined();
    }
    expect(docsGeneratorOf('speckit')).toBe(DOCS_GENERATORS.speckit);
    expect(rulesGeneratorOf('speckit')).toBe(RULES_GENERATORS.speckit);
    expect(rulesGeneratorOf('wingfoil')).toBeUndefined();
  });

  it('keep the files that the speckit rules generator writes', () => {
    const path = RULES_GENERATORS.speckit?.path ?? '';
    expect(DOCS_GENERATORS.speckit?.kept.some((kept) => path.startsWith(`${kept}/`))).toBe(true);
  });
});

describe('the speckit-docs arm (REQ-FMT-05, task-067)', () => {
  it('is the docs control of speckit, without a harness', () => {
    const arm = loadArm(repoPath('arms'), 'speckit-docs');
    expect(arm.ok).toBe(true);
    if (!arm.ok) return;
    expect(arm.value.docsOf).toBe('speckit');
    expect(arm.value.requires).toBeUndefined();
  });

  it('gets baseline-docs’ manual and setup, byte for byte', () => {
    for (const file of ['manual.md', 'setup.sh']) {
      expect(readFileSync(repoPath(`arms/speckit-docs/${file}`), 'utf8'), file).toBe(
        readFileSync(repoPath(`arms/baseline-docs/${file}`), 'utf8'),
      );
    }
  });
});
