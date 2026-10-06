import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { armDigest } from '../../src/arms/index.js';
import { checkCampaign } from '../../src/cli/index.js';
import type { RunOnceRequest } from '../../src/core/index.js';
import { runCampaign } from '../../src/runner/index.js';
import { repoPath } from '../support/paths.js';
import { doubles } from '../support/runner-doubles.js';
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

const SHA = '3df305ea198d7e2ca0da73bfb12b14af865e9922';

/** A build that writes what the real one writes: the tool's package and the installed artifact. */
function build(request: RunOnceRequest): void {
  mkdirSync(join(request.mount.source, 'out'), { recursive: true });
  writeFileSync(join(request.mount.source, 'out', 'wingfoil-0.1.0.tgz'), 'tarball');
  writeFileSync(join(request.mount.source, 'out', 'installed.tgz'), 'installed');
}

/** One run of S1 in the baseline and wingfoil arms, with the fake agent. */
function harnessCampaign(): Record<string, unknown> {
  return {
    ...completeCampaignYaml(),
    harnesses: { wingfoil: { tool: 'wingfoil', version: '3df305e' } },
    arms: ['baseline', 'wingfoil'],
    scenarios: [{ id: 'S1', version: '1.0' }],
    repetitions: { S1: 1 },
    agent: { name: 'fake', version: '1.0.0' },
    models: { default: 'fake-model' },
  };
}

describe('competitors.feature, artifacts and arm digests', () => {
  it('@F7.1 A harness artifact that does not match its recorded digest is refused', async () => {
    const { root, file } = writeRepo(harnessCampaign(), ['S1@1.0']);
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const ports = () => doubles({ commits: { '3df305e': SHA }, onRunOnce: build });
    await runCampaign(checked.value, { ...ports(), harnessSources: { wingfoil: '/clones/wingfoil' } });
    // Given a cached harness artifact whose content no longer matches the digest recorded for it
    const artifact = join('.cache', 'harnesses', 'wingfoil', SHA, 'installed.tgz');
    writeFileSync(join(root, artifact), 'tampered');
    // When the maintainer runs a campaign that pins it
    const again = ports();
    const run = runCampaign(checked.value, { ...again, harnessSources: { wingfoil: '/clones/wingfoil' } });
    // Then no run starts, and the message names the artifact
    await expect(run).rejects.toThrow(
      `the cached harness artifact ${artifact} no longer matches its recorded digest: ` +
        `remove ${join('.cache', 'harnesses', 'wingfoil', SHA)}/ to rebuild it`,
    );
    expect(again.recorded.creates).toEqual([]);
    expect(again.recorded.runOnce).toEqual([]);
  });

  it('@F7.2 A campaign file whose pinned arm digest no longer matches the arm is refused', () => {
    // Given a campaign file that pins an arm's digest, and that arm's files changed since
    const { root, file } = writeRepo(harnessCampaign(), ['S1@1.0']);
    const pinned = checkCampaign(file);
    if (!pinned.ok) throw new Error(JSON.stringify(pinned.issues));
    const digests = Object.fromEntries(
      pinned.value.arms.map((arm) => [arm.name, armDigest(root, arm.name).slice(0, 12)]),
    );
    writeFileSync(file, stringify({ ...harnessCampaign(), arm_digests: digests }));
    expect(checkCampaign(file).ok).toBe(true);
    writeFileSync(
      join(root, 'arms', 'wingfoil', 'manual.md'),
      'A manual changed since the campaign pinned it.\n',
    );
    // When the maintainer validates the campaign file
    const result = checkCampaign(file);
    // Then the campaign is rejected, naming the arm
    expect(result.ok ? [] : result.issues).toEqual([
      {
        path: 'arm_digests.wingfoil',
        message: expect.stringMatching(
          new RegExp(
            `^is ${digests.wingfoil ?? ''}, but the arm's files digest to [0-9a-f]{12}: the arm changed since the campaign pinned it$`,
          ),
        ) as unknown,
      },
    ]);
  });

  it("validates v0.1's campaign files, which pin no arm digest, as before", () => {
    for (const name of ['v0-1-reference.yaml', 'v0-1-validation.yaml']) {
      const result = checkCampaign(repoPath(join('campaigns', name)));
      expect(result.ok ? name : result.issues).toBe(name);
    }
  });
});
