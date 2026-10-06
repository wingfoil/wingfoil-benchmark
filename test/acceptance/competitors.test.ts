import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

const SPECKIT_SHA = 'f1d3a4f8337ebbd3ae22760a9c12e3352b93a175';

/** One run of S1 in the baseline and speckit arms, with the fake agent; the speckit arm is the repository's own. */
function speckitCampaign(): { root: string; file: string } {
  const repo = writeRepo(
    {
      ...harnessCampaign(),
      arms: ['baseline', 'speckit'],
      harnesses: { speckit: { tool: 'speckit', version: 'v1.1.0' } },
    },
    ['S1@1.0'],
  );
  rmSync(join(repo.root, 'arms', 'speckit'), { recursive: true, force: true });
  cpSync(repoPath('arms/speckit'), join(repo.root, 'arms', 'speckit'), { recursive: true });
  return repo;
}

describe('competitors.feature, the competitor arms', () => {
  it('@F7.1 A competitor arm runs a scenario under the same rules', async () => {
    // Given the speckit arm installs Spec Kit from its pinned artifact and initializes it as its documentation says for
    // Claude Code, and the tool's telemetry is turned off
    const { root, file } = speckitCampaign();
    const setup = readFileSync(join(root, 'arms', 'speckit', 'setup.sh'), 'utf8');
    expect(setup).toContain('tar -xzf "$HOME/harness.tgz"');
    expect(setup).toContain(
      'specify init --here --force --integration claude --script sh --ignore-agent-tools',
    );
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    expect(checked.value.arms.find((arm) => arm.name === 'speckit')?.telemetryOff).toEqual([]);
    // When the maintainer runs a scenario in the speckit arm with the fake agent; step 1 asks a question
    const ports = doubles({
      commits: { 'v1.1.0': SPECKIT_SHA },
      onRunOnce: build,
      messageOf: (request) =>
        'reply' in request || request.step !== 1 ? undefined : 'Which currency do you use?',
    });
    const summary = await runCampaign(checked.value, {
      ...ports,
      harnessSources: { speckit: '/clones/spec-kit' },
    });
    // Then every step runs in a fresh session started by the runner, with the same prompt as in every other arm
    // The runs are sequential, baseline's first: the first half of the requests is baseline's, the second speckit's.
    const half = <T>(all: readonly T[], arm: 'baseline' | 'speckit'): T[] =>
      arm === 'baseline' ? all.slice(0, all.length / 2) : all.slice(all.length / 2);
    const steps = (arm: 'baseline' | 'speckit') => half(ports.recorded.steps, arm);
    expect(steps('speckit').map((step) => step.prompt)).toEqual(steps('baseline').map((step) => step.prompt));
    expect(new Set(ports.recorded.steps.map((step) => step.sessionId)).size).toBe(
      ports.recorded.steps.length,
    );
    expect(
      ports.recorded.execs.filter((exec) => exec.command.join(' ') === 'bash /home/node/arm/setup.sh'),
    ).toHaveLength(2);
    // And the neutral approver answers the sessions that wait, and no other approval exists in the arm
    const replies = (arm: 'baseline' | 'speckit') => half(ports.recorded.resumes, arm).map((r) => r.reply);
    expect(replies('speckit')).toEqual(replies('baseline'));
    expect(replies('speckit')).toHaveLength(1);
    for (const name of ['setup.sh', 'manual.md', 'arm.yaml'])
      expect(readFileSync(join(root, 'arms', 'speckit', name), 'utf8')).not.toMatch(/approver|approve /i);
    // And the run records the tool, its version, the artifact's digest and the arm's digest
    const speckit = summary.runs.find((run) => run.arm === 'speckit');
    const record = JSON.parse(readFileSync(join(speckit?.outputDir ?? '', 'run.json'), 'utf8')) as {
      harness?: Record<string, string>;
      arm_digest?: string;
      telemetry_off?: string[];
    };
    expect(record.harness).toMatchObject({
      tool: 'speckit',
      version: 'v1.1.0',
      commit: SPECKIT_SHA,
      artifact_sha256: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown,
    });
    expect(record.arm_digest).toBe(armDigest(root, 'speckit'));
    expect(record.telemetry_off).toEqual([]);
  });

  it('@F7.1 An arm definition that misses what v0.2 requires is refused', () => {
    // Given a harness arm that declares no telemetry setting
    const noTelemetry = speckitCampaign();
    const yaml = readFileSync(join(noTelemetry.root, 'arms', 'speckit', 'arm.yaml'), 'utf8');
    writeFileSync(
      join(noTelemetry.root, 'arms', 'speckit', 'arm.yaml'),
      yaml.replace(/^telemetry_off:.*\n/m, ''),
    );
    // When the maintainer validates a campaign that uses it; Then it is rejected, naming the arm and the field
    const refused = checkCampaign(noTelemetry.file);
    expect(refused.ok ? [] : refused.issues).toEqual([
      {
        path: 'arms[1]',
        message:
          "speckit: telemetry_off is required: a harness arm says how its tool's telemetry is turned off ([] when it has none)",
      },
    ]);
    // Given a docs control whose docs_of names an unknown arm
    const unknown = writeRepo({ ...completeCampaignYaml(), arms: ['baseline', 'baseline-docs', 'wingfoil'] });
    const docs = join(unknown.root, 'arms', 'baseline-docs', 'arm.yaml');
    writeFileSync(docs, `${readFileSync(docs, 'utf8')}docs_of: ghost\n`);
    const refusedDocs = checkCampaign(unknown.file);
    expect(refusedDocs.ok ? [] : refusedDocs.issues).toEqual([
      { path: 'arms[1]', message: "baseline-docs: docs_of names 'ghost', which is not an arm under arms/" },
    ]);
  });
});

const RULE = [
  '---',
  'id: r1',
  'type: directive',
  'title: "No new runtime dependency"',
  '---',
  '',
  '# No new runtime dependency',
  '',
  'Add no package to `dependencies`.',
  '',
].join('\n');

/** S1 in every v0.2 arm that exists: the harnesses, their docs controls (the repository's own arms), and the baseline. */
function controlsCampaign() {
  const repo = writeRepo(
    {
      ...harnessCampaign(),
      arms: ['baseline', 'wingfoil', 'baseline-docs', 'speckit', 'speckit-docs'],
      harnesses: {
        wingfoil: { tool: 'wingfoil', version: '3df305e' },
        speckit: { tool: 'speckit', version: 'v1.1.0' },
      },
    },
    ['S1@1.0'],
  );
  for (const arm of ['baseline-docs', 'speckit', 'speckit-docs']) {
    rmSync(join(repo.root, 'arms', arm), { recursive: true, force: true });
    cpSync(repoPath(`arms/${arm}`), join(repo.root, 'arms', arm), { recursive: true });
  }
  // The scenario's project rules, declared once as the wingfoil arm's directives (dl-005).
  const config = join(repo.root, 'scenarios', 'S1', '1.0', 'arms', 'wingfoil', '.wingfoil');
  mkdirSync(join(config, 'directives', 'custom'), { recursive: true });
  writeFileSync(join(config, 'roles.yaml'), 'assignments:\n  developer:\n    - r1\n');
  writeFileSync(join(config, 'directives', 'custom', 'r1.md'), RULE);
  return repo;
}

describe('competitors.feature, the docs controls and the setups', () => {
  it('@F7.1 Each harness has its own docs control', async () => {
    // Given each harness arm's configuration, captured by running its own setup
    const { file } = controlsCampaign();
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const execute = async () => {
      const ports = doubles({ commits: { '3df305e': SHA, 'v1.1.0': SPECKIT_SHA } });
      const summary = await runCampaign(checked.value, {
        ...ports,
        harnessSources: { wingfoil: '/clones/wingfoil', speckit: '/clones/spec-kit' },
      });
      const generated = (arm: string) =>
        readFileSync(join(summary.resultsDir, 'generated', 'S1@1.0', arm, 'PROJECT_RULES.md'), 'utf8');
      return { baselineDocs: generated('baseline-docs'), speckitDocs: generated('speckit-docs'), summary };
    };
    // When each docs environment is generated twice
    const first = await execute();
    const second = await execute();
    // Then both generations are byte-identical
    expect(second.baselineDocs).toBe(first.baselineDocs);
    expect(second.speckitDocs).toBe(first.speckitDocs);
    // And every kind of content the generator declares as rendered appears in it, and no kind it declares as left out
    expect(first.baselineDocs).toContain('### Fake rule');
    expect(first.baselineDocs).not.toContain('Benchmark Approver');
    expect(first.speckitDocs).toContain('### No new runtime dependency');
    for (const mechanics of ['speckit-specify', 'spec-template', 'workflow.yml', 'init-options'])
      expect(first.speckitDocs).not.toContain(mechanics);
    // Each docs control's run received its environment and recorded its digest.
    for (const arm of ['baseline-docs', 'speckit-docs']) {
      const run = first.summary.runs.find((r) => r.arm === arm);
      const record = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'run.json'), 'utf8')) as {
        generated_sha256?: string;
      };
      expect(record.generated_sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("@F7.1 Every harness arm's setup is published", async () => {
    const { root } = await siteExecution();
    // When the maintainer builds the site
    const build = await benchSite(root, 'site', 'build', EXECUTION);
    expect(build.code, build.stderr).toBe(0);
    // Then each harness arm has a setup page with its setup script, its telemetry setting, its operating manual, its
    // rules and what its docs control renders
    const page = readFileSync(
      join(root, 'site', 'abcdef012345', '1', 'material', 'setup-wingfoil.html'),
      'utf8',
    );
    expect(page).toContain(readFileSync(repoPath('arms/wingfoil/setup.sh'), 'utf8').split('\n')[1] ?? 'x');
    expect(page).toContain('id="telemetry"');
    expect(page).toContain('href="manual-wingfoil.html"');
    expect(page).toContain('id="rules"');
    expect(page).toContain('id="docs-control"');
    expect(page).toContain('baseline-docs');
    expect(page).toContain('carries no approval authority');
    expect(existsSync(join(root, 'site', 'abcdef012345', '1', 'material', 'setup-baseline.html'))).toBe(
      false,
    );
    const method = readFileSync(join(root, 'site', 'abcdef012345', '1', 'method.html'), 'utf8');
    expect(method).toContain('href="material/setup-wingfoil.html"');
  });
});
