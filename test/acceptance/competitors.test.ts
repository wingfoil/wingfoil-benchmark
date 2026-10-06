import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkCampaign } from '../../src/cli/index.js';
import { completeCampaignYaml, writeRepo } from '../support/campaign-fixture.js';
import { registerEntry, writeRegister } from '../support/eligibility-fixture.js';
import { EXECUTION } from '../support/score-fixture.js';
import { benchSite, siteExecution } from '../support/site-fixture.js';

// Background: the published eligibility criteria (site-content/eligibility.md) and a register that assesses each
// candidate tool, WingFoil included, at a named version (eligibility/register.yaml, REQ-FMT-11).

describe('competitors.feature', () => {
  it('@F7.4 A tool admitted at the pinned version can have an arm', () => {
    // Given a tool whose register entry for the pinned version passes every criterion with its evidence
    const { root, file } = writeRepo(completeCampaignYaml());
    writeRegister(root, [registerEntry('wingfoil', '3df305e')]);
    // When the maintainer validates a campaign that gives the tool an arm
    const result = checkCampaign(file);
    // Then the campaign is accepted
    expect(result.ok ? 'accepted' : result.issues).toBe('accepted');
  });

  it('@F7.4 A campaign cannot give an arm to a tool the register excludes', () => {
    // Given a tool that the register excludes, with its reason
    const { root, file } = writeRepo(completeCampaignYaml());
    writeRegister(root, [registerEntry('wingfoil', '3df305e', ['headless-container'])]);
    // When the maintainer validates a campaign that gives the tool an arm
    const result = checkCampaign(file);
    // Then the campaign is rejected, and the message names the tool and the criterion it fails
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      {
        path: 'harnesses.wingfoil',
        message:
          'wingfoil 3df305e is excluded by the eligibility register: it fails headless-container ' +
          '(wingfoil 3df305e fails headless-container in this fixture)',
      },
    ]);
  });

  it('@F7.4 A version the register has not assessed is refused', () => {
    // Given a tool admitted at one version
    const { root, file } = writeRepo(completeCampaignYaml());
    writeRegister(root, [registerEntry('wingfoil', 'v0.2.2')]);
    // When the maintainer validates a campaign that pins another version of it
    const result = checkCampaign(file);
    // Then the campaign is rejected until that version is assessed
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      {
        path: 'harnesses.wingfoil.version',
        message:
          'wingfoil 3df305e is not assessed in eligibility/register.yaml: assess it before a campaign pins it',
      },
    ]);
    writeRegister(root, [registerEntry('wingfoil', 'v0.2.2'), registerEntry('wingfoil', '3df305e')]);
    expect(checkCampaign(file).ok).toBe(true);
  });

  it('@F7.4 Every assessed tool is published with its verdict', async () => {
    const { root } = await siteExecution();
    writeRegister(root, [
      registerEntry('wingfoil', 'v0.2.2'),
      registerEntry('speckit', 'v1.1.0'),
      registerEntry('bmad', '6.12.1', ['headless-container']),
    ]);
    // When the maintainer builds the site
    const build = await benchSite(root, 'site', 'build', EXECUTION);
    expect(build.code).toBe(0);
    // Then the eligibility page lists every assessed tool and version, WingFoil included, its verdict and, for an
    // excluded tool, the reason
    const page = readFileSync(join(root, 'site', 'abcdef012345', '1', 'eligibility.html'), 'utf8');
    const published: [string, string, string][] = [
      ['wingfoil', 'v0.2.2', 'admitted'],
      ['speckit', 'v1.1.0', 'admitted'],
      ['bmad', '6.12.1', 'excluded'],
    ];
    for (const [tool, version, verdict] of published) {
      expect(page).toMatch(
        new RegExp(`<th scope="row">${tool}</th><td>${version.replaceAll('.', '\\.')}</td>`),
      );
      expect(page).toContain(`<td class="verdict ${verdict}">${verdict}</td>`);
    }
    expect(page).toContain('fails headless-container');
    // The landing page links it.
    const landing = readFileSync(join(root, 'site', 'abcdef012345', '1', 'index.html'), 'utf8');
    expect(landing).toContain('href="eligibility.html"');
  });
});
