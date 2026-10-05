import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  campaignRequirements,
  formatRequirement,
  HARNESS_SOURCE_VARIABLES,
} from '../../../src/cli/preflight.js';
import { checkCampaign } from '../../../src/runner/index.js';
import type { CheckedCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** The complete fixture: a real agent, a wingfoil harness, and scenarios that declare a hold-out. */
function complete(): CheckedCampaign {
  const checked = checkCampaign(writeRepo().file);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return checked.value;
}

function smoke(): CheckedCampaign {
  const checked = checkCampaign(repoPath('test/fixtures/campaigns/smoke.yaml'));
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return checked.value;
}

/** A directory with a token file, a clone directory and a hold-out with its `scenarios/`. */
function machine() {
  const dir = tempDir('bench-preflight-');
  const token = join(dir, 'token');
  writeFileSync(token, 'not-a-real-token\n');
  const clone = join(dir, 'wingfoil');
  mkdirSync(clone);
  const holdout = join(dir, 'holdout');
  mkdirSync(join(holdout, 'scenarios'), { recursive: true });
  return { dir, token, clone, holdout };
}

describe('campaign requirements', () => {
  it('lists what a real-agent campaign with a wingfoil harness and a hold-out needs, in order, all missing', () => {
    expect(campaignRequirements(complete(), {})).toEqual([
      { variable: 'BENCH_AGENT_TOKEN_FILE', kind: 'credential file', neededBy: 'run', state: 'missing' },
      {
        variable: 'BENCH_WINGFOIL_REPO',
        kind: 'harness clone of wingfoil',
        neededBy: 'run',
        state: 'missing',
      },
      { variable: 'BENCH_HOLDOUT_PATH', kind: 'hold-out', neededBy: 'score', state: 'missing' },
    ]);
  });

  it('reads an empty variable as missing', () => {
    expect(campaignRequirements(complete(), { BENCH_AGENT_TOKEN_FILE: '' })[0]?.state).toBe('missing');
  });

  it('says set when each names what it should', () => {
    const { token, clone, holdout } = machine();
    const env = { BENCH_AGENT_TOKEN_FILE: token, BENCH_WINGFOIL_REPO: clone, BENCH_HOLDOUT_PATH: holdout };
    expect(campaignRequirements(complete(), env).map((r) => r.state)).toEqual(['set', 'set', 'set']);
  });

  it('says invalid, and why, when a variable names the wrong thing, naming paths only', () => {
    const { dir, token, clone } = machine();
    const env = {
      BENCH_AGENT_TOKEN_FILE: clone,
      BENCH_WINGFOIL_REPO: token,
      BENCH_HOLDOUT_PATH: join(dir, 'no-such-holdout'),
    };
    expect(campaignRequirements(complete(), env)).toEqual([
      expect.objectContaining({ state: 'invalid', problem: `${clone} is not a readable file` }),
      expect.objectContaining({ state: 'invalid', problem: `${token} is not a directory` }),
      expect.objectContaining({
        state: 'invalid',
        problem: `${join(dir, 'no-such-holdout')} does not exist`,
      }),
    ]);
  });

  it.skipIf(process.getuid?.() === 0)('says invalid for a token file that exists but cannot be read', () => {
    const { token } = machine();
    chmodSync(token, 0o000);
    expect(campaignRequirements(complete(), { BENCH_AGENT_TOKEN_FILE: token })[0]).toEqual(
      expect.objectContaining({ state: 'invalid', problem: `${token} is not a readable file` }),
    );
  });

  it('builds the clone of WingFoil only: a harness tool without a row is not listed, until its arm adds one', () => {
    expect(HARNESS_SOURCE_VARIABLES).toEqual({ wingfoil: 'BENCH_WINGFOIL_REPO' });
    // A campaign check refuses a harness no arm requires, so the extra tool is added after it.
    const checked = complete();
    const spec = checked.campaign.spec;
    const withOther: CheckedCampaign = {
      ...checked,
      campaign: {
        ...checked.campaign,
        spec: { ...spec, harnesses: { ...spec.harnesses, other: { tool: 'other-tool', version: '1.0.0' } } },
      },
    };
    expect(campaignRequirements(withOther, {}).map((r) => r.variable)).toEqual([
      'BENCH_AGENT_TOKEN_FILE',
      'BENCH_WINGFOIL_REPO',
      'BENCH_HOLDOUT_PATH',
    ]);
  });

  it('asks the fake agent for its script, and nothing for harnesses or a hold-out it does not have', () => {
    expect(campaignRequirements(smoke(), {})).toEqual([
      { variable: 'BENCH_FAKE_SCRIPT', kind: 'fake agent script', neededBy: 'run', state: 'missing' },
    ]);
  });

  it('asks no harness clone of a campaign that pins no harness', () => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = {};
    yaml.arms = ['baseline'];
    yaml.models = { default: (yaml.models as { default: string }).default };
    const checked = checkCampaign(writeRepo(yaml).file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    expect(campaignRequirements(checked.value, {}).map((r) => r.variable)).toEqual([
      'BENCH_AGENT_TOKEN_FILE',
      'BENCH_HOLDOUT_PATH',
    ]);
  });
});

describe('a requirement as validate prints it', () => {
  it('names the variable, what it names, the command that needs it, and its state', () => {
    expect(
      formatRequirement({
        variable: 'BENCH_WINGFOIL_REPO',
        kind: 'harness clone of wingfoil',
        neededBy: 'run',
        state: 'missing',
      }),
    ).toBe('requires BENCH_WINGFOIL_REPO (harness clone of wingfoil, for run): missing');
    expect(
      formatRequirement({
        variable: 'BENCH_HOLDOUT_PATH',
        kind: 'hold-out',
        neededBy: 'score',
        state: 'set',
      }),
    ).toBe('requires BENCH_HOLDOUT_PATH (hold-out, for score): set');
    expect(
      formatRequirement({
        variable: 'BENCH_AGENT_TOKEN_FILE',
        kind: 'credential file',
        neededBy: 'run',
        state: 'invalid',
        problem: '/x is not a readable file',
      }),
    ).toBe('requires BENCH_AGENT_TOKEN_FILE (credential file, for run): invalid, /x is not a readable file');
  });
});
