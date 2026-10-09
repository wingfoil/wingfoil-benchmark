import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  DOCS_GENERATORS,
  docsGeneratorOf,
  loadArm,
  RULES_GENERATORS,
  rulesGeneratorOf,
  renderOpenSpecConfig,
  renderConstitution,
  renderOpenSpecDocs,
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
    for (const tool of ['wingfoil', 'speckit', 'openspec']) {
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

  it('gets baseline-docs’ manual and setup, byte for byte, as every docs control does', () => {
    for (const file of ['manual.md', 'setup.sh']) {
      for (const control of ['speckit-docs', 'openspec-docs'])
        expect(readFileSync(repoPath(`arms/${control}/${file}`), 'utf8'), `${control}/${file}`).toBe(
          readFileSync(repoPath(`arms/baseline-docs/${file}`), 'utf8'),
        );
    }
  });
});

describe('the openspec-docs control (REQ-RUN-11, task-072)', () => {
  const CONFIG = 'openspec/config.yaml';
  const RULE =
    '---\nid: r1\ntitle: "No new runtime dependency"\n---\n\n# No new runtime dependency\n\nAdd no package.\n';
  const configured = renderOpenSpecConfig(
    new Map([
      ['.wingfoil/roles.yaml', 'assignments:\n  developer:\n    - r1\n'],
      ['.wingfoil/directives/custom/r1.md', RULE],
    ]),
  );

  it('renders the context the rules generator wrote as the project rules, its rules one level down', () => {
    const rendered = renderOpenSpecDocs(new Map([[CONFIG, configured ?? '']]));
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
        'Add no package.',
        '',
      ].join('\n'),
    );
    expect(renderOpenSpecDocs(new Map([[CONFIG, configured ?? '']]))).toBe(rendered);
  });

  it('gives the same bytes as speckit-docs for the same rules, subheadings and fenced code included', () => {
    const rich = [
      '---',
      'id: r1',
      'title: "Errors are values"',
      '---',
      '',
      '# Errors are values',
      '',
      'Return them.',
      '',
      '## Why',
      '',
      'Callers decide.',
      '',
      '```sh',
      '# install nothing',
      '## not a heading either',
      '```',
      '',
    ].join('\n');
    const files = new Map([
      ['.wingfoil/roles.yaml', 'assignments:\n  developer:\n    - r1\n'],
      ['.wingfoil/directives/custom/r1.md', rich],
    ]);
    const openspecDocs = renderOpenSpecDocs(new Map([[CONFIG, renderOpenSpecConfig(files) ?? '']]));
    const speckitDocs = renderSpeckitDocs(
      new Map([['.specify/memory/constitution.md', renderConstitution(files) ?? '']]),
    );
    expect(openspecDocs).toBe(speckitDocs);
    expect(openspecDocs).toContain('```sh\n# install nothing\n## not a heading either\n```');
  });

  it('refuses a configuration that is not YAML, rather than say there are no rules', () => {
    expect(() => renderOpenSpecDocs(new Map([[CONFIG, 'schema: [unclosed\n']]))).toThrow(
      'openspec/config.yaml is not YAML',
    );
  });

  it('says the project declares no rules when the configuration has no context, or is missing', () => {
    const none = '# Project rules\n\nThis project declares no rules beyond its README.\n';
    expect(renderOpenSpecDocs(new Map([[CONFIG, 'schema: spec-driven\n']]))).toBe(none);
    expect(renderOpenSpecDocs(new Map())).toBe(none);
  });

  it('is the docs control of openspec, without a harness', () => {
    const arm = loadArm(repoPath('arms'), 'openspec-docs');
    expect(arm.ok).toBe(true);
    if (!arm.ok) return;
    expect(arm.value.docsOf).toBe('openspec');
    expect(arm.value.requires).toBeUndefined();
  });
});
