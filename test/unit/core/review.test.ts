// task-148 — the review loop's findings' format (REQ-RUN-21, REQ-FMT-06 as amended in 1.58) and the campaign's and the
// dry-run profile's `review_loop` entry (REQ-FMT-01, REQ-CLI-05 as amended in 1.58).
import { describe, expect, it } from 'vitest';

import { campaignSchema, dryRunProfileSchema, parseFindings, parseWith } from '../../../src/core/index.js';
import { completeCampaignYaml } from '../../support/campaign-fixture.js';

const FINDING = {
  severity: 'should-fix',
  file: 'src/cart.ts',
  line: 12,
  title: 'Rounding',
  why: 'Half a cent is lost.',
};

describe("the reviewer's findings (task-148, REQ-RUN-21)", () => {
  it('reads the final message as JSON alone, or as one fenced json block', () => {
    const json = JSON.stringify({ findings: [FINDING, { ...FINDING, severity: 'nit', line: null }] });
    expect(parseFindings(json)).toEqual({
      ok: true,
      value: [FINDING, { ...FINDING, severity: 'nit', line: null }],
    });
    expect(parseFindings(`Here is my review.\n\n\`\`\`json\n${json}\n\`\`\`\n`)).toMatchObject({ ok: true });
    expect(parseFindings('{"findings": []}')).toEqual({ ok: true, value: [] });
  });

  it('refuses anything else, naming why', () => {
    const refused = (message: string) => {
      const parsed = parseFindings(message);
      return parsed.ok
        ? 'accepted'
        : parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    };
    expect(refused('No findings, the code is fine.')).toMatch(/^findings: /);
    expect(refused(JSON.stringify({ findings: [{ ...FINDING, severity: 'major' }] }))).toMatch(/severity/);
    expect(refused(JSON.stringify({ findings: [{ ...FINDING, file: '/etc/passwd' }] }))).toMatch(/file/);
    expect(refused(JSON.stringify({ findings: [{ ...FINDING, file: '../outside.ts' }] }))).toMatch(/file/);
    expect(refused(JSON.stringify({ findings: [{ ...FINDING, line: 0 }] }))).toMatch(/line/);
    expect(refused(JSON.stringify({ findings: [{ ...FINDING, extra: 1 }] }))).toMatch(/extra|unrecognized/i);
    expect(refused('```json\n{"findings": []}\n```\n```json\n{"findings": []}\n```')).toMatch(/one/);
  });
});

const REVIEW_LOOP = {
  agent: { name: 'claude-code', version: '2.1.300' },
  model: 'claude-sonnet-5-5',
  effort: 'medium',
  prompt: { file: 'review/prompt.md', sha256: 'a'.repeat(64) },
  fixer_prompt: { file: 'review/fixer-prompt.md', sha256: 'b'.repeat(64) },
  max_rounds: 5,
  caps: { session_time_s: 1800, session_tokens: 10_000_000, session_cost_eur: 2, fixer_interventions: 20 },
};

describe('the review_loop entry (task-148, REQ-FMT-01 and REQ-CLI-05 as amended in 1.58)', () => {
  const campaign = (loop: unknown) =>
    parseWith(campaignSchema, { ...completeCampaignYaml(), review_loop: loop }, 'c');
  const issues = (loop: unknown) => {
    const parsed = campaign(loop);
    return parsed.ok ? [] : parsed.issues.map((issue) => issue.path);
  };

  it('is optional, and parses when complete', () => {
    expect(parseWith(campaignSchema, completeCampaignYaml(), 'c').ok).toBe(true);
    expect(campaign(REVIEW_LOOP)).toMatchObject({ ok: true, value: { review_loop: REVIEW_LOOP } });
  });

  it('refuses an unknown key, a missing field and a value out of range, naming its path', () => {
    expect(issues({ ...REVIEW_LOOP, rounds: 3 }).join()).toMatch(/review_loop/);
    const { fixer_prompt: _dropped, ...noFixer } = REVIEW_LOOP;
    expect(issues(noFixer)).toContain('review_loop.fixer_prompt');
    expect(issues({ ...REVIEW_LOOP, max_rounds: 0 })).toContain('review_loop.max_rounds');
    expect(issues({ ...REVIEW_LOOP, max_rounds: 11 })).toContain('review_loop.max_rounds');
    expect(issues({ ...REVIEW_LOOP, effort: 'enormous' })).toContain('review_loop.effort');
    expect(
      issues({ ...REVIEW_LOOP, prompt: { file: 'prompts/review.md', sha256: 'a'.repeat(64) } }),
    ).toContain('review_loop.prompt.file');
    expect(issues({ ...REVIEW_LOOP, caps: { ...REVIEW_LOOP.caps, fixer_interventions: 0 } })).toContain(
      'review_loop.caps.fixer_interventions',
    );
  });

  it('is taken by a dry-run profile as by a campaign', () => {
    const profile = {
      agent: { name: 'claude-code', version: '2.1.300', effort: { 'claude-sonnet-5-5': 'medium' } },
      models: { default: 'claude-sonnet-5-5' },
      approver_policy: 'v1',
      caps: { step_time_s: 1800, step_tokens: 10_000_000, run_cost_eur: 3 },
      currency: { usd_to_eur: 0.9 },
      harnesses: {},
      review_loop: REVIEW_LOOP,
    };
    expect(parseWith(dryRunProfileSchema, profile, 'p')).toMatchObject({ ok: true });
  });
});
