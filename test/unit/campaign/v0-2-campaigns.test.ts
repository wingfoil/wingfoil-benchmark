import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

import { missingEffort } from '../../../src/core/index.js';
import type { CampaignFile } from '../../../src/core/index.js';
import { checkCampaign } from '../../../src/runner/index.js';
import { repoPath } from '../../support/paths.js';

/**
 * v0.2's campaign files (task-091), as dl-007 and dl-017 shape them (experiment design 1.3 §6): the reference
 * campaign and the bridge, a campaign of its own sharing every pin but the arms.
 */
function checked(name: string): CampaignFile {
  const result = checkCampaign(repoPath(`campaigns/${name}.yaml`));
  if (!result.ok) throw new Error(`${name}: ${JSON.stringify(result.issues)}`);
  return result.value.campaign.spec;
}

const SCENARIOS = ['S1', 'S2', 'S3', 'S8'].map((id) => ({ id, version: '1.0' }));
const REPETITIONS = { S1: 3, S2: 1, S3: 1, S8: 1 };
const V0_1_ARMS = ['baseline', 'baseline-docs', 'wingfoil'];

describe('the v0.2 campaign files (task-091)', () => {
  it('validates both, the eligibility register and every arm digest included', () => {
    expect(() => checked('v0-2-reference')).not.toThrow();
    expect(() => checked('v0-2-bridge')).not.toThrow();
  });

  it('gives the reference campaign seven arms, three harnesses, Sonnet 5.5 and the Opus and Haiku slices', () => {
    const reference = checked('v0-2-reference');
    expect(reference.scenarios).toEqual(SCENARIOS);
    expect(reference.repetitions).toEqual(REPETITIONS);
    expect(reference.arms).toEqual([...V0_1_ARMS, 'speckit', 'speckit-docs', 'openspec', 'openspec-docs']);
    expect(reference.harnesses).toEqual({
      // dl-017: the reference campaign on WingFoil v0.3.0, admitted by task-095.
      wingfoil: { tool: 'wingfoil', version: 'v0.3.0' },
      speckit: { tool: 'speckit', version: 'v1.1.0' },
      openspec: { tool: 'openspec', version: '1.14.0' },
    });
    expect(reference.models).toEqual({
      default: 'claude-sonnet-5-5',
      slices: [
        { model: 'claude-opus-5-5', scenarios: ['S1'], arms: V0_1_ARMS, repetitions: 1 },
        {
          model: 'claude-haiku-4-5',
          scenarios: ['S1', 'S3'],
          arms: ['baseline', 'wingfoil'],
          repetitions: 1,
        },
      ],
    });
    expect(Object.keys(reference.arm_digests ?? {}).sort()).toEqual([...reference.arms].sort());
  });

  it("gives the bridge v0.1's arms on WingFoil v0.2.2, with no slice", () => {
    const bridge = checked('v0-2-bridge');
    expect(bridge.scenarios).toEqual(SCENARIOS);
    expect(bridge.repetitions).toEqual(REPETITIONS);
    expect(bridge.arms).toEqual(V0_1_ARMS);
    expect(bridge.harnesses).toEqual({ wingfoil: { tool: 'wingfoil', version: 'v0.2.2' } });
    expect(bridge.models).toEqual({ default: 'claude-sonnet-5-5' });
  });

  it("shares every pin but the arms with the reference campaign (dl-017's point 3)", () => {
    const reference = checked('v0-2-reference');
    const bridge = checked('v0-2-bridge');
    for (const field of [
      'scenarios',
      'repetitions',
      'agent',
      'approver_policy',
      'caps',
      'currency',
      'fail_fast',
    ] as const) {
      expect(bridge[field], field).toEqual(reference[field]);
    }
    expect(bridge.models.default).toBe(reference.models.default);
    expect(bridge.arms.every((arm) => reference.arms.includes(arm))).toBe(true);
    // Every arm the same but wingfoil, which the bridge keeps at v0.2.2's (task-095).
    for (const arm of bridge.arms.filter((name) => name !== 'wingfoil')) {
      expect(bridge.arm_digests?.[arm], arm).toBe(reference.arm_digests?.[arm]);
    }
    expect(bridge.arm_digests?.wingfoil).not.toBe(reference.arm_digests?.wingfoil);
  });

  it("reads the bridge's wingfoil arm from history, task-086's for v0.2.2, and the reference's from the tree (task-095)", () => {
    const arms = (name: string) => {
      const result = checkCampaign(repoPath(`campaigns/${name}.yaml`));
      if (!result.ok) throw new Error(JSON.stringify(result.issues));
      return result.value.arms;
    };
    const bridgeArm = arms('v0-2-bridge').find((arm) => arm.name === 'wingfoil');
    const referenceArm = arms('v0-2-reference').find((arm) => arm.name === 'wingfoil');
    expect(bridgeArm?.from?.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(readFileSync(bridgeArm?.manualPath ?? '', 'utf8')).toContain('0.2.2');
    expect(referenceArm?.from).toBeUndefined();
    expect(readFileSync(referenceArm?.manualPath ?? '', 'utf8')).toContain('0.3.0');
  });

  it('admits WingFoil v0.3.0 to the eligibility register, and no later version unassessed (REQ-FMT-11)', () => {
    const register = parse(readFileSync(repoPath('eligibility/register.yaml'), 'utf8')) as {
      entries: {
        tool: string;
        version: string;
        verdict: string;
        criteria: Record<string, { result: string }>;
      }[];
    };
    const entry = register.entries.find((e) => e.tool === 'wingfoil' && e.version === 'v0.3.0');
    expect(entry?.verdict).toBe('admitted');
    expect(Object.values(entry?.criteria ?? {}).map((c) => c.result)).toEqual([
      'pass',
      'pass',
      'pass',
      'pass',
      'pass',
    ]);
    expect(register.entries.some((e) => e.tool === 'wingfoil' && e.version === 'v0.3.1')).toBe(false);
  });

  it('pins an effort for every model the reference campaign runs, so run does not refuse it for that', () => {
    const reference = checked('v0-2-reference');
    const models = [reference.models.default, ...(reference.models.slices ?? []).map((s) => s.model)];
    expect(missingEffort(reference.agent, models)).toEqual([]);
    expect(reference.agent.name).toBe('claude-code');
  });
});
