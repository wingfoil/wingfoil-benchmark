import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { armDigest } from '../../src/arms/index.js';
import { checkCampaign } from '../../src/cli/index.js';
import type { RunOnceRequest } from '../../src/core/index.js';
import { runCampaign } from '../../src/runner/index.js';
import { escapeHtml } from '../../src/site/render.js';
import { repoPath } from '../support/paths.js';
import { doubles, fakeBuild } from '../support/runner-doubles.js';
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

/** One competitor row of the outline (competitors.feature): its arm, how it is set up, and how its harness is pinned. */
interface CompetitorRow {
  readonly arm: 'speckit' | 'openspec';
  readonly pin: { readonly tool: string; readonly version: string };
  readonly init: string;
  readonly telemetryOff: readonly string[];
  /** What the doubles need to build it: a clone and its commit, or nothing for a registry tool. */
  readonly sources: Readonly<Record<string, string>>;
  readonly commits?: Readonly<Record<string, string>>;
  readonly commit: unknown;
}

const ROWS: readonly CompetitorRow[] = [
  {
    arm: 'speckit',
    pin: { tool: 'speckit', version: 'v1.1.0' },
    init: 'specify init --here --force --integration claude --script sh --ignore-agent-tools',
    telemetryOff: [],
    sources: { speckit: '/clones/spec-kit' },
    commits: { 'v1.1.0': SPECKIT_SHA },
    commit: SPECKIT_SHA,
  },
  {
    arm: 'openspec',
    pin: { tool: 'openspec', version: '1.14.0' },
    init: 'openspec init --tools claude --profile core --force',
    telemetryOff: ['OPENSPEC_TELEMETRY=0'],
    sources: {},
    // Fetched from the npm registry by version (task-071): its commit is its tarball's digest.
    commit: createHash('sha256').update('tarball').digest('hex'),
  },
];

/** One run of S1 in the baseline arm and the row's arm, with the fake agent; the arm is the repository's own. */
function competitorCampaign(row: CompetitorRow): { root: string; file: string } {
  const repo = writeRepo(
    { ...harnessCampaign(), arms: ['baseline', row.arm], harnesses: { [row.arm]: row.pin } },
    ['S1@1.0'],
  );
  rmSync(join(repo.root, 'arms', row.arm), { recursive: true, force: true });
  cpSync(repoPath(`arms/${row.arm}`), join(repo.root, 'arms', row.arm), { recursive: true });
  return repo;
}

/** The outline's steps for one row. */
async function runsUnderTheSameRules(row: CompetitorRow): Promise<void> {
  // Given the arm installs its tool from its pinned artifact and initializes it as its documentation says for Claude
  // Code, and the tool's telemetry is turned off
  const { root, file } = competitorCampaign(row);
  const setup = readFileSync(join(root, 'arms', row.arm, 'setup.sh'), 'utf8');
  expect(setup, row.arm).toContain('tar -xzf "$HOME/harness.tgz"');
  expect(setup, row.arm).toContain(row.init);
  const checked = checkCampaign(file);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  expect(checked.value.arms.find((arm) => arm.name === row.arm)?.telemetryOff, row.arm).toEqual(
    row.telemetryOff,
  );
  // When the maintainer runs a scenario in the arm with the fake agent; step 1 asks a question
  const ports = doubles({
    ...(row.commits === undefined ? {} : { commits: row.commits }),
    onRunOnce: build,
    messageOf: (request) =>
      'reply' in request || request.step !== 1 ? undefined : 'Which currency do you use?',
  });
  const summary = await runCampaign(checked.value, { ...ports, harnessSources: row.sources });
  // Then every step runs in a fresh session started by the runner, with the same prompt as in every other arm
  // The runs are sequential, baseline's first: the first half of the requests is baseline's, the second the arm's.
  const half = <T>(all: readonly T[], first: boolean): T[] =>
    first ? all.slice(0, all.length / 2) : all.slice(all.length / 2);
  const prompts = (first: boolean) => half(ports.recorded.steps, first).map((step) => step.prompt);
  expect(prompts(false), row.arm).toEqual(prompts(true));
  expect(new Set(ports.recorded.steps.map((step) => step.sessionId)).size).toBe(ports.recorded.steps.length);
  expect(
    ports.recorded.execs.filter((exec) => exec.command.join(' ') === 'bash /home/node/arm/setup.sh'),
  ).toHaveLength(2);
  // And the neutral approver answers the sessions that wait, and no other approval exists in the arm
  const replies = (first: boolean) => half(ports.recorded.resumes, first).map((r) => r.reply);
  expect(replies(false), row.arm).toEqual(replies(true));
  expect(replies(false)).toHaveLength(1);
  for (const name of ['setup.sh', 'manual.md', 'arm.yaml'])
    expect(readFileSync(join(root, 'arms', row.arm, name), 'utf8'), `${row.arm}/${name}`).not.toMatch(
      /approver|approve /i,
    );
  // And the run records the tool, its version, the artifact's digest and the arm's digest
  const run = summary.runs.find((r) => r.arm === row.arm);
  const record = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'run.json'), 'utf8')) as {
    harness?: Record<string, string>;
    arm_digest?: string;
    telemetry_off?: string[];
  };
  expect(record.harness, row.arm).toMatchObject({
    ...row.pin,
    commit: row.commit,
    artifact_sha256: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown,
  });
  expect(record.arm_digest, row.arm).toBe(armDigest(root, row.arm));
  expect(record.telemetry_off, row.arm).toEqual(row.telemetryOff);
}

describe('competitors.feature, the competitor arms', () => {
  it('@F7.1 A competitor arm runs a scenario under the same rules', async () => {
    for (const row of ROWS) await runsUnderTheSameRules(row);
  });

  it('@F7.1 An arm definition that misses what v0.2 requires is refused', () => {
    // Given a harness arm that declares no telemetry setting
    const noTelemetry = competitorCampaign(ROWS[0] as CompetitorRow);
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
    writeFileSync(docs, readFileSync(docs, 'utf8').replace('docs_of: wingfoil', 'docs_of: ghost'));
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
function controlsCampaign(extra: readonly ('openspec' | 'openspec-docs')[] = []) {
  const repo = writeRepo(
    {
      ...harnessCampaign(),
      arms: ['baseline', 'wingfoil', 'baseline-docs', 'speckit', 'speckit-docs', ...extra],
      harnesses: {
        wingfoil: { tool: 'wingfoil', version: '3df305e' },
        speckit: { tool: 'speckit', version: 'v1.1.0' },
        ...(extra.includes('openspec') ? { openspec: { tool: 'openspec', version: '1.14.0' } } : {}),
      },
    },
    ['S1@1.0'],
  );
  for (const arm of ['baseline-docs', 'speckit', 'speckit-docs', ...extra]) {
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

/**
 * The doubles' one-off containers, with the speckit arm's setup leaving what Spec Kit's init leaves: its constitution
 * template, its mechanics (a template, a workflow, its init options) and its skills.
 */
function harnessSetups(request: RunOnceRequest): void {
  const build = request.mount.source;
  const arm = join(build, 'arm', 'arm.yaml');
  const snapshot = request.command.join(' ').includes('/build/arm/');
  // OpenSpec's init (task-070, B2): its commands, its skills, its configuration with the schema only.
  if (snapshot && readFileSync(arm, 'utf8').includes('name: openspec\n')) {
    for (const [file, text] of [
      ['.claude/commands/opsx/propose.md', '# opsx:propose\n'],
      ['.claude/skills/openspec-propose/SKILL.md', '# openspec-propose\n'],
      // Its commented keys too: a commented context is not one.
      [
        'openspec/config.yaml',
        'schema: spec-driven\n\n# context: |\n#   commented\n# rules:\n#   proposal: []\n',
      ],
      ['openspec/specs/.gitkeep', ''],
      ['openspec/changes/archive/.gitkeep', ''],
    ] as const) {
      mkdirSync(join(build, 'workspace', file, '..'), { recursive: true });
      writeFileSync(join(build, 'workspace', file), text);
    }
    return;
  }
  if (!(snapshot && readFileSync(arm, 'utf8').includes('name: speckit'))) {
    fakeBuild(request);
    return;
  }
  const workspace = join(build, 'workspace');
  for (const [file, text] of [
    ['.specify/memory/constitution.md', '# [PROJECT_NAME] Constitution\n\n### [PRINCIPLE_1_NAME]\n'],
    ['.specify/templates/spec-template.md', '# Spec template\n'],
    ['.specify/workflows/speckit/workflow.yml', 'name: workflow\n'],
    ['.specify/init-options.json', '{ "init-options": true }\n'],
    ['.claude/skills/speckit-specify/SKILL.md', '# speckit-specify\n'],
  ] as const) {
    mkdirSync(join(workspace, file, '..'), { recursive: true });
    writeFileSync(join(workspace, file), text);
  }
}

describe('competitors.feature, the docs controls and the setups', () => {
  it("@F7.1 A scenario's project rules reach every arm without changing the scenario", async () => {
    // Given a scenario whose project rules are declared once (as the wingfoil arm's directives, dl-005)
    const { root, file } = controlsCampaign(['openspec', 'openspec-docs']);
    const scenarioDir = join(root, 'scenarios', 'S1', '1.0');
    const before = treeOf(scenarioDir);
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const hash = checked.value.scenarios[0]?.hash;
    // When it runs in the wingfoil, speckit and openspec arms and in their docs controls
    // The doubles' wingfoil snapshot also applies the scenario's configuration, as the arm's own setup does.
    const snapshots = (request: RunOnceRequest) => {
      harnessSetups(request);
      const overlay = join(request.mount.source, 'scenario', '.wingfoil');
      if (existsSync(overlay))
        cpSync(overlay, join(request.mount.source, 'workspace', '.wingfoil'), { recursive: true });
    };
    const ports = doubles({ commits: { '3df305e': SHA, 'v1.1.0': SPECKIT_SHA }, onRunOnce: snapshots });
    const summary = await runCampaign(checked.value, {
      ...ports,
      harnessSources: { wingfoil: '/clones/wingfoil', speckit: '/clones/spec-kit' },
    });
    const workspace = (arm: string) =>
      ports.recorded.creates.find((c) => c.workspace.includes(`/${arm}/`))?.workspace ?? '';
    // Then each harness arm gets the rules in its tool's own place
    expect(
      ports.recorded.copies.some(
        (copy) => copy.includes('/arms/wingfoil ') && copy.includes(':/home/node/scenario'),
      ),
    ).toBe(true);
    expect(
      readFileSync(join(workspace('speckit'), '.specify', 'memory', 'constitution.md'), 'utf8'),
    ).toContain('### No new runtime dependency');
    expect(readFileSync(join(workspace('openspec'), 'openspec', 'config.yaml'), 'utf8')).toContain(
      '## No new runtime dependency',
    );
    // And each docs control gets them as Markdown; the baseline gets none
    for (const control of ['baseline-docs', 'speckit-docs', 'openspec-docs'])
      expect(readFileSync(join(workspace(control), 'PROJECT_RULES.md'), 'utf8'), control).toContain(
        'No new runtime dependency',
      );
    expect(existsSync(join(workspace('baseline'), 'PROJECT_RULES.md'))).toBe(false);
    // And the scenario's content hash is the one its earlier results recorded: every run recorded the same, and the
    // scenario's files are as they were
    for (const run of summary.runs) {
      const record = JSON.parse(readFileSync(join(run.outputDir, 'run.json'), 'utf8')) as {
        scenario_hash: string;
      };
      expect(record.scenario_hash, run.arm).toBe(hash);
    }
    expect(treeOf(scenarioDir)).toEqual(before);
  });

  it('@F7.1 Each harness has its own docs control', async () => {
    // Given each harness arm's configuration, captured by running its own setup
    const { file } = controlsCampaign(['openspec', 'openspec-docs']);
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const execute = async () => {
      const ports = doubles({ commits: { '3df305e': SHA, 'v1.1.0': SPECKIT_SHA }, onRunOnce: harnessSetups });
      const summary = await runCampaign(checked.value, {
        ...ports,
        harnessSources: { wingfoil: '/clones/wingfoil', speckit: '/clones/spec-kit' },
      });
      const generated = (arm: string) =>
        readFileSync(join(summary.resultsDir, 'generated', 'S1@1.0', arm, 'PROJECT_RULES.md'), 'utf8');
      return {
        baselineDocs: generated('baseline-docs'),
        speckitDocs: generated('speckit-docs'),
        openspecDocs: generated('openspec-docs'),
        summary,
      };
    };
    // When each docs environment is generated twice
    const first = await execute();
    const second = await execute();
    // Then both generations are byte-identical
    expect(second.baselineDocs).toBe(first.baselineDocs);
    expect(second.speckitDocs).toBe(first.speckitDocs);
    expect(second.openspecDocs).toBe(first.openspecDocs);
    // And every kind of content the generator declares as rendered appears in it, and no kind it declares as left out
    expect(first.baselineDocs).toContain('### Fake rule');
    expect(first.baselineDocs).not.toContain('Benchmark Approver');
    expect(first.speckitDocs).toContain('### No new runtime dependency');
    for (const mechanics of [
      '[PROJECT_NAME]',
      'speckit-specify',
      'Spec template',
      'name: workflow',
      'init-options',
    ])
      expect(first.speckitDocs).not.toContain(mechanics);
    // Of the speckit configuration its setup left, the control kept its memory, not its mechanics.
    const kept = join(first.summary.resultsDir, 'generated', 'S1@1.0', 'speckit-docs', 'speckit');
    expect(existsSync(join(kept, '.specify', 'memory', 'constitution.md'))).toBe(true);
    expect(existsSync(join(kept, '.specify', 'templates'))).toBe(false);
    expect(existsSync(join(kept, '.claude'))).toBe(false);
    // openspec-docs (task-072): the context's rule, rendered; nothing of the schema, the commands or the skills.
    expect(first.openspecDocs).toContain('### No new runtime dependency');
    for (const mechanics of ['spec-driven', 'schema', 'opsx', 'openspec-propose'])
      expect(first.openspecDocs).not.toContain(mechanics);
    const keptOpenSpec = join(first.summary.resultsDir, 'generated', 'S1@1.0', 'openspec-docs', 'openspec');
    expect(existsSync(join(keptOpenSpec, 'openspec', 'config.yaml'))).toBe(true);
    expect(existsSync(join(keptOpenSpec, '.claude'))).toBe(false);
    // Each docs control's run received its environment and recorded its digest.
    for (const arm of ['baseline-docs', 'speckit-docs', 'openspec-docs']) {
      const run = first.summary.runs.find((r) => r.arm === arm);
      const record = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'run.json'), 'utf8')) as {
        generated_sha256?: string;
      };
      expect(record.generated_sha256).toBe(
        createHash('sha256')
          .update(
            readFileSync(join(first.summary.resultsDir, 'generated', 'S1@1.0', arm, 'PROJECT_RULES.md')),
          )
          .digest('hex'),
      );
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
    expect(page).toContain(
      escapeHtml(readFileSync(repoPath('arms/wingfoil/setup.sh'), 'utf8').split('\n')[1] ?? 'x'),
    );
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

/** Every file under `dir`, by relative path, with its bytes as text: a tree to compare before and after. */
function treeOf(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string, prefix: string) => {
    for (const name of readdirSync(at).sort()) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path, `${prefix}${name}/`);
      else out[`${prefix}${name}`] = readFileSync(path, 'utf8');
    }
  };
  walk(dir, '');
  return out;
}
