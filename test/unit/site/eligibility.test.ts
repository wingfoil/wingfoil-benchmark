import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseWith, registerSchema } from '../../../src/core/index.js';
import { registerHtml } from '../../../src/site/eligibility.js';
import { registerEntry, writeRegister } from '../../support/eligibility-fixture.js';
import { EXECUTION } from '../../support/score-fixture.js';
import { benchSite, siteExecution } from '../../support/site-fixture.js';

function register(...entries: Record<string, unknown>[]) {
  const parsed = parseWith(registerSchema, { criteria: [...CRITERIA_ORDER], entries }, 'register.yaml');
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.value;
}
const CRITERIA_ORDER = [
  'agent-and-model',
  'pinnable',
  'headless-container',
  'workflow-harness',
  'no-own-llm',
];

describe('the register as the eligibility page shows it', () => {
  it('gives one row per entry, each criterion, the verdict and the reason, then the evidence', () => {
    const html = registerHtml(
      register(registerEntry('wingfoil', 'v0.2.2'), registerEntry('bmad', '6.12.1', ['pinnable'])),
    );
    expect(html).toContain(
      '<tr><th scope="row">wingfoil</th><td>v0.2.2</td>' +
        '<td class="pass">pass</td>'.repeat(5) +
        '<td class="verdict admitted">admitted</td><td>passes the five criteria in this fixture</td></tr>',
    );
    expect(html).toContain('<td class="fail">fail</td>');
    expect(html).toContain('<td class="verdict excluded">excluded</td><td>fails pinnable</td>');
    expect(html).toContain(
      '<li><strong>pinnable</strong>: fail — bmad 6.12.1 fails pinnable in this fixture</li>',
    );
    expect(html.indexOf('<h3>wingfoil v0.2.2</h3>')).toBeLessThan(html.indexOf('<h3>bmad 6.12.1</h3>'));
  });

  it('escapes what the register says', () => {
    const entry = { ...registerEntry('x', '1.0.0'), reason: 'a <b>bold</b> "claim"' };
    expect(registerHtml(register(entry))).toContain('<td>a &lt;b&gt;bold&lt;/b&gt; &quot;claim&quot;</td>');
  });
});

describe('the eligibility page in the build', () => {
  it('is refused without its text or without the register, and writes nothing', async () => {
    for (const missing of ['site-content/eligibility.md', 'eligibility/register.yaml']) {
      const { root } = await siteExecution();
      rmSync(join(root, missing));
      const built = await benchSite(root, 'site', 'build', EXECUTION);
      expect(built.code).toBe(1);
      expect(built.stderr).toMatch(new RegExp(`^${missing}: not found`));
    }
  }, 120_000);

  it('reports an invalid register at its field', async () => {
    const { root } = await siteExecution();
    writeRegister(root, [{ ...registerEntry('x', '1.0.0'), verdict: 'maybe' }]);
    const built = await benchSite(root, 'site', 'build', EXECUTION);
    expect(built.code).toBe(1);
    expect(built.stderr).toMatch(/^eligibility\/register\.yaml: entries\[0\]\.verdict: /);
  }, 120_000);
});

describe('the register loader', () => {
  it('reads an absent register as none, so a campaign without a harness needs none', async () => {
    const { loadRegister } = await import('../../../src/campaign/index.js');
    const { root } = await siteExecution();
    rmSync(join(root, 'eligibility'), { recursive: true });
    expect(loadRegister(root)).toEqual({ ok: true, value: undefined });
    writeRegister(root, []);
    writeFileSync(join(root, 'eligibility', 'register.yaml'), 'entries: [\n');
    const broken = loadRegister(root);
    expect(broken.ok ? [] : broken.issues.map((issue) => issue.path)).toEqual(['eligibility/register.yaml']);
  }, 120_000);
});
