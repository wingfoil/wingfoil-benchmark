import { describe, expect, it } from 'vitest';

import { missingCapabilities } from '../../../src/arms/index.js';
import type { Arm, Scenario } from '../../../src/core/index.js';

const arm = (overrides: Partial<Arm> = {}): Arm => ({
  name: 'wingfoil',
  dir: '/arms/wingfoil',
  setup: 'setup.sh',
  setupPath: '/arms/wingfoil/setup.sh',
  manualPath: '/arms/wingfoil/manual.md',
  requires: 'wingfoil',
  provides: { 'directive-delivery': true, 'workflow-engine': false },
  ...overrides,
});
const scenario = (capabilities: string[]) => ({ capabilities }) as unknown as Scenario;

describe('missingCapabilities (F3.6, REQ-SCO-10)', () => {
  it('names, sorted, the capabilities a harness arm does not provide: false or undeclared', () => {
    expect(
      missingCapabilities(scenario(['workflow-engine', 'mcp-tools', 'directive-delivery']), arm()),
    ).toEqual(['mcp-tools', 'workflow-engine']);
  });

  it('has none when the harness provides every capability, or the scenario needs none', () => {
    expect(missingCapabilities(scenario(['directive-delivery']), arm())).toEqual([]);
    expect(missingCapabilities(scenario([]), arm())).toEqual([]);
  });

  it('never marks an arm with no harness: baseline and baseline-docs are the reference', () => {
    const plain: Arm = {
      name: 'baseline',
      dir: '/arms/baseline',
      setup: 'setup.sh',
      setupPath: '/arms/baseline/setup.sh',
      manualPath: '/arms/baseline/manual.md',
      provides: {},
    };
    expect(missingCapabilities(scenario(['directive-delivery', 'workflow-engine']), plain)).toEqual([]);
  });
});
