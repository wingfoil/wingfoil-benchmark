import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';

import {
  CONFIGURING_PROFILE,
  CONFIGURING_PROMPT,
  loadConfiguringProfile,
  loadLeakScanDeclarations,
  loadScenario,
  oracleLiterals,
  scanConfiguringPrompt,
} from '../../../src/scenario/index.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const PROFILE = {
  agent: { name: 'claude-code', version: '2.1.300', effort: { 'claude-sonnet-5-5': 'medium' } },
  models: { default: 'claude-sonnet-5-5' },
  harnesses: { wingfoil: { tool: 'wingfoil', version: 'v0.3.1' } },
  caps: { step_time_s: 1800, step_tokens: 10000000, run_cost_eur: 5 },
  currency: { usd_to_eur: 0.9 },
};

function profileAt(content: Record<string, unknown>): string {
  const file = join(tempDir('bench-configuring-'), 'profile.yaml');
  writeFileSync(file, stringify(content));
  return file;
}

describe('the configuring profile (REQ-RUN-20, task-140)', () => {
  it('loads a profile of exactly agent, models.default, harnesses, caps and currency', () => {
    const result = loadConfiguringProfile(profileAt(PROFILE));

    expect(result.ok && result.value.models.default).toBe('claude-sonnet-5-5');
  });

  it.each([
    ['approver_policy', 'v5'],
    ['arm_digests', { wingfoil: 'cc009b5a52a9' }],
    ['budget', {}],
  ])('refuses %s, naming it', (field, value) => {
    const result = loadConfiguringProfile(profileAt({ ...PROFILE, [field]: value }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toContainEqual({ path: field, message: 'is not a known field' });
  });

  it.each(['agent', 'models', 'harnesses', 'caps', 'currency'])('refuses a profile with no %s', (field) => {
    const rest = Object.fromEntries(Object.entries(PROFILE).filter(([key]) => key !== field));

    expect(loadConfiguringProfile(profileAt(rest)).ok).toBe(false);
  });

  it('refuses slices: the profile names one model', () => {
    const result = loadConfiguringProfile(
      profileAt({ ...PROFILE, models: { default: 'claude-sonnet-5-5', slices: [] } }),
    );

    expect(result.ok).toBe(false);
  });

  it("is the repository's profile: Claude Code with claude-sonnet-5-5, the three harnesses pinned", () => {
    const result = loadConfiguringProfile(repoPath(CONFIGURING_PROFILE));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.agent.name).toBe('claude-code');
    expect(result.value.models.default).toBe('claude-sonnet-5-5');
    expect(Object.keys(result.value.harnesses).sort()).toEqual(['openspec', 'speckit', 'wingfoil']);
  });
});

describe('the configuring prompt scan (REQ-FMT-08 as amended in 1.50, task-140)', () => {
  const declarations = () => {
    const result = loadLeakScanDeclarations(repoPath('scenarios/leak-scan.yaml'));
    if (!result.ok) throw new Error('declarations');
    return result.value;
  };
  const s1 = () => {
    const result = loadScenario(repoPath('scenarios'), 'S1', '1.1');
    if (!result.ok) throw new Error('S1');
    return result.value;
  };

  it("passes the repository's prompt for every scenario version 1.1", () => {
    const text = readFileSync(repoPath(CONFIGURING_PROMPT), 'utf8');
    for (const id of ['S1', 'S2', 'S3', 'S8']) {
      const scenario = loadScenario(repoPath('scenarios'), id, '1.1');
      if (!scenario.ok) throw new Error(id);
      expect(scanConfiguringPrompt(text, scenario.value, declarations()), id).toEqual([]);
    }
  });

  it('names each harness the prompt names', () => {
    expect(scanConfiguringPrompt('Configure Spec Kit, then WingFoil.', s1(), declarations())).toEqual([
      { path: CONFIGURING_PROMPT, message: "names the harness 'WingFoil'" },
      { path: CONFIGURING_PROMPT, message: "names the harness 'Spec Kit'" },
    ]);
  });

  it('names the oracle file whose literal the prompt holds, never the literal', () => {
    const scenario = s1();
    const file = readFileSync(join(scenario.dir, 'oracle', 'create-patch', 'create-patch.test.mts'), 'utf8');
    const literal = oracleLiterals(file, 8)[0] ?? '';
    expect(literal).not.toBe('');

    const issues = scanConfiguringPrompt(`Keep ${literal} in mind.`, scenario, declarations());

    expect(issues).toEqual([
      { path: CONFIGURING_PROMPT, message: expect.stringMatching(/^holds a literal of oracle\//) },
    ]);
    expect(JSON.stringify(issues)).not.toContain(literal);
  });

  it('names the hold-out file whose literal the prompt holds, when a hold-out is set', () => {
    const dir = tempDir('bench-holdout-');
    mkdirSync(join(dir, 'suite'), { recursive: true });
    writeFileSync(join(dir, 'suite', 'extra.test.ts'), "it('a hidden expectation here', () => {});\n");

    const issues = scanConfiguringPrompt('Mind a hidden expectation here.', s1(), declarations(), {
      dir,
      files: ['suite/extra.test.ts'],
    });

    expect(issues).toEqual([
      { path: CONFIGURING_PROMPT, message: 'holds a literal of the hold-out file suite/extra.test.ts' },
    ]);
  });
});
