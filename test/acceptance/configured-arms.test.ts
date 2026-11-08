import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';

import { armDigest, loadArm, rulesGeneratorOf } from '../../src/arms/index.js';
import { checkCampaign } from '../../src/cli/index.js';
import type { RunOnceRequest } from '../../src/core/index.js';
import { aggregateExecution } from '../../src/results/index.js';
import { runCampaign } from '../../src/runner/index.js';
import { relativeFiles } from '../../src/scenario/index.js';
import { setupHtml } from '../../src/site/method.js';
import { escapeHtml } from '../../src/site/render.js';
import { execution } from '../support/aggregate-fixture.js';
import {
  configuredRepo,
  PINS,
  sha256,
  writeFixtureConfiguration,
} from '../support/configured-arm-fixture.js';
import { refusedRecord } from '../support/configured-fixture.js';
import { repoPath } from '../support/paths.js';
import { doubles, fakeBuild } from '../support/runner-doubles.js';
import { tempDir } from '../support/scenario-fixture.js';

const WINGFOIL_SHA = '3df305ea198d7e2ca0da73bfb12b14af865e9922';
const SPECKIT_SHA = '9a1c2b3d4e5f60718293a4b5c6d7e8f901234567';
const COMMITS = { '3df305e': WINGFOIL_SHA, 'v1.1.0': SPECKIT_SHA, '1.14.0': 'e'.repeat(40) };
const SOURCES = { wingfoil: '/clones/wingfoil', speckit: '/clones/spec-kit', openspec: '/clones/openspec' };

/** The configured rule a wingfoil configuration adds, and the roles that assign it. */
const R9 = '# Rule r9\n\nName every exported function after its effect.\n';
const WINGFOIL_CONFIGURATION = {
  '.wingfoil/directives/custom/r9.md': R9,
  '.wingfoil/roles.yaml': 'assignments:\n  developer:\n    - r1\n    - r9\n',
};

/** The issues of a refused campaign, as one string, or the empty string when it validates. */
function refusal(file: string): string {
  const checked = checkCampaign(file);
  return checked.ok ? '' : JSON.stringify(checked.issues);
}

/**
 * The doubles' one-off containers: a harness build as {@link fakeBuild}; a snapshot applies the scenario's wingfoil
 * configuration as the wingfoil setup does, and leaves Spec Kit's constitution template as its init does.
 */
function snapshots(request: RunOnceRequest): void {
  const build = request.mount.source;
  if (!request.command.join(' ').includes('/build/arm/')) {
    fakeBuild(request);
    return;
  }
  const overlay = join(build, 'scenario', '.wingfoil');
  if (existsSync(overlay)) cpSync(overlay, join(build, 'workspace', '.wingfoil'), { recursive: true });
  if (readFileSync(join(build, 'arm', 'arm.yaml'), 'utf8').includes('name: speckit\n')) {
    mkdirSync(join(build, 'workspace', '.specify', 'memory'), { recursive: true });
    writeFileSync(join(build, 'workspace', '.specify', 'memory', 'constitution.md'), '# [PROJECT_NAME]\n');
  }
}

/** The constitution Spec Kit's rules generator writes for a fixture scenario version (REQ-FMT-14). */
function generatedConstitution(root: string, scenario: string): string {
  const [id = '', version = ''] = scenario.split('@');
  const source = join(root, 'scenarios', id, version, 'arms', 'wingfoil');
  const files = new Map(
    relativeFiles(source).map((path) => [path, readFileSync(join(source, path), 'utf8')]),
  );
  return rulesGeneratorOf('speckit')?.render(files) ?? '';
}

/** The container the doubles created for the run in `workspace`, as they name it. */
function containerOf(
  ports: { recorded: { creates: readonly { workspace: string }[] } },
  workspace?: string,
): string {
  return `container-${ports.recorded.creates.findIndex((create) => create.workspace === workspace) + 1}`;
}

/** A run's run.json. */
function readRun(outputDir: string | undefined): { outcome: string } {
  return JSON.parse(readFileSync(join(outputDir ?? '', 'run.json'), 'utf8')) as { outcome: string };
}

describe('competitors.feature, the configured arms (task-142, F7.5)', () => {
  it('@F7.5 A configured arm declares only its name and its base', () => {
    for (const [base, extra, field] of [
      ['wingfoil', { setup: 'setup.sh' }, 'setup'],
      ['speckit-configured', {}, 'configured_of'],
      ['baseline', {}, 'configured_of'],
    ] as const) {
      // Given "arms/wingfoil-configured/arm.yaml" declares configured_of "<base>" and <extra>
      const root = tempDir('bench-configured-arm-');
      for (const arm of ['wingfoil', 'speckit', 'speckit-configured', 'baseline'])
        cpSync(repoPath(`arms/${arm}`), join(root, arm), { recursive: true });
      mkdirSync(join(root, 'wingfoil-configured'));
      writeFileSync(
        join(root, 'wingfoil-configured', 'arm.yaml'),
        stringify({ name: 'wingfoil-configured', configured_of: base, ...extra }),
      );
      // When the arm is loaded
      const loaded = loadArm(root, 'wingfoil-configured');
      // Then it is refused, naming the field
      expect(loaded.ok).toBe(false);
      if (!loaded.ok) expect(loaded.issues.map((issue) => issue.path)).toContain(field);
      // And the repository's configured arm loads as its base arm under its own name
      const repository = loadArm(repoPath('arms'), 'wingfoil-configured');
      if (!repository.ok) throw new Error(JSON.stringify(repository.issues));
      expect(repository.value).toMatchObject({
        name: 'wingfoil-configured',
        configuredOf: 'wingfoil',
        requires: 'wingfoil',
      });
      expect(repository.value.setupPath).toBe(repoPath('arms/wingfoil/setup.sh'));
    }
  });

  it('@F7.5 A configured docs control is generated from the configured arm', async () => {
    // Given "baseline-docs-configured" declares docs_of "wingfoil-configured"
    const repo = configuredRepo(
      ['baseline', 'wingfoil', 'baseline-docs', 'wingfoil-configured', 'baseline-docs-configured'],
      ['S1@1.1'],
      [{ scenario: 'S1@1.1', arm: 'wingfoil-configured', files: WINGFOIL_CONFIGURATION }],
    );
    const checked = checkCampaign(repo.file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    // When its environment is generated for S1 1.1
    const ports = doubles({ commits: COMMITS, onRunOnce: snapshots });
    const summary = await runCampaign(checked.value, { ...ports, harnessSources: SOURCES });
    const generated = (arm: string) =>
      readFileSync(join(summary.resultsDir, 'generated', 'S1@1.1', arm, 'PROJECT_RULES.md'), 'utf8');
    // Then it renders what baseline-docs renders, read from the configured arm after its setup and copy
    const plain = generated('baseline-docs');
    const configured = generated('baseline-docs-configured');
    expect(plain).toContain('Keep functions small.');
    expect(plain).not.toContain('Name every exported function after its effect.');
    expect(configured).toContain('Keep functions small.');
    expect(configured).toContain('Name every exported function after its effect.');
    const control = summary.runs.find((run) => run.arm === 'baseline-docs-configured');
    expect(readFileSync(join(control?.workspace ?? '', 'PROJECT_RULES.md'), 'utf8')).toBe(configured);
  });
});

describe("runner.feature, a configured arm's run (task-142, F7.5)", () => {
  it("@F7.5 A configured arm runs its base arm with the scenario's configuration over it", async () => {
    // Given "wingfoil-configured" declares configured_of "wingfoil"
    // And S8 1.1 holds a configuration for "wingfoil-configured"
    const repo = configuredRepo(
      ['baseline', 'wingfoil-configured'],
      ['S8@1.1'],
      [{ scenario: 'S8@1.1', arm: 'wingfoil-configured', files: WINGFOIL_CONFIGURATION }],
    );
    const checked = checkCampaign(repo.file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    // When a run of "wingfoil-configured" on S8 1.1 is set up
    const ports = doubles({ commits: COMMITS, onRunOnce: snapshots });
    const summary = await runCampaign(checked.value, { ...ports, harnessSources: SOURCES });
    const run = summary.runs.find((candidate) => candidate.arm === 'wingfoil-configured');
    // Then the wingfoil setup runs, S8's wingfoil configuration is copied, and the configured one over it
    const copies = ports.recorded.copies.filter((copy) =>
      copy.includes(` -> ${containerOf(ports, run?.workspace)}:`),
    );
    expect(copies.some((copy) => copy.startsWith(`${join(repo.root, 'arms', 'wingfoil')} ->`))).toBe(true);
    expect(
      copies.some((copy) =>
        copy.startsWith(`${join(repo.root, 'scenarios', 'S8', '1.1', 'arms', 'wingfoil')} ->`),
      ),
    ).toBe(true);
    expect(copies.some((copy) => copy.includes('wingfoil-configured'))).toBe(false);
    expect(
      readFileSync(join(run?.workspace ?? '', '.wingfoil', 'directives', 'custom', 'r9.md'), 'utf8'),
    ).toBe(R9);
    const record = JSON.parse(readFileSync(join(run?.outputDir ?? '', 'run.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(record).toMatchObject({ arm: 'wingfoil-configured', configured: { of: 'wingfoil' } });
    // And the arm's digest covers its own files and the wingfoil arm's
    const before = armDigest(repo.root, 'wingfoil-configured');
    writeFileSync(join(repo.root, 'arms', 'wingfoil', 'manual.md'), '# Another manual\n');
    const afterBase = armDigest(repo.root, 'wingfoil-configured');
    writeFileSync(join(repo.root, 'arms', 'wingfoil-configured', 'notes.md'), 'a note\n');
    expect(new Set([before, afterBase, armDigest(repo.root, 'wingfoil-configured')]).size).toBe(3);
  });

  it("@F7.5 A configured arm's copy comes after the project rules and before the setup commit", async () => {
    // Given S8 1.1 holds a configuration for "speckit-configured" that extends the generated constitution
    const repo = configuredRepo(['baseline', 'speckit-configured'], ['S8@1.1']);
    const rules = generatedConstitution(repo.root, 'S8@1.1');
    expect(rules).toContain('Keep functions small.');
    const constitution = `${rules}\n### Configured: every module has a README\n`;
    const configuration = {
      scenario: 'S8@1.1',
      arm: 'speckit-configured',
      files: { '.specify/memory/constitution.md': constitution },
      record: { rules_sha256: sha256(rules) },
    };
    writeFixtureConfiguration(repo.root, configuration);
    const checked = checkCampaign(repo.file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    // When a run of "speckit-configured" on S8 1.1 is set up
    const committed: string[] = [];
    const ports = doubles({
      commits: COMMITS,
      onRunOnce: snapshots,
      patchOf: (directory) => {
        const file = join(directory, '.specify', 'memory', 'constitution.md');
        if (existsSync(file)) committed.push(readFileSync(file, 'utf8'));
        return `diff of ${relative(repo.root, directory)}`;
      },
    });
    const summary = await runCampaign(checked.value, { ...ports, harnessSources: SOURCES });
    const run = summary.runs.find((candidate) => candidate.arm === 'speckit-configured');
    // Then the workspace holds the configured constitution, and "setup/diff.patch" holds it
    expect(readFileSync(join(run?.workspace ?? '', '.specify', 'memory', 'constitution.md'), 'utf8')).toBe(
      constitution,
    );
    expect(committed[0]).toBe(constitution);
    expect(readRun(run?.outputDir).outcome).toBe('completed');

    // And a run whose generated rules differ from the record's is refused before step 1
    const other = configuredRepo(['baseline', 'speckit-configured'], ['S8@1.1']);
    writeFixtureConfiguration(other.root, { ...configuration, record: { rules_sha256: 'f'.repeat(64) } });
    const otherChecked = checkCampaign(other.file);
    if (!otherChecked.ok) throw new Error(JSON.stringify(otherChecked.issues));
    const otherPorts = doubles({ commits: COMMITS, onRunOnce: snapshots });
    const refused = await runCampaign(otherChecked.value, { ...otherPorts, harnessSources: SOURCES });
    const refusedRun = refused.runs.find((candidate) => candidate.arm === 'speckit-configured');
    const refusedRecord = JSON.parse(readFileSync(join(refusedRun?.outputDir ?? '', 'run.json'), 'utf8')) as {
      outcome: string;
      steps: unknown[];
      error?: string;
    };
    expect(refusedRecord.outcome).toBe('failed');
    expect(refusedRecord.steps).toEqual([]);
    expect(refusedRecord.error).toMatch(/speckit-configured.*project rules/);
  });
});

describe("campaign.feature, a campaign's configured arms (task-142, F7.5)", () => {
  it('@F7.5 A configured arm on a version with no configuration is refused', () => {
    // Given a campaign that runs "speckit-configured" on S2 1.0
    const repo = configuredRepo(['baseline', 'speckit-configured'], ['S2@1.0']);
    // When the campaign is validated
    // Then it is refused, naming S2 1.0 and "speckit-configured"
    expect(refusal(repo.file)).toMatch(/S2@1\.0[^"]*speckit-configured|speckit-configured[^"]*S2@1\.0/);
  });

  it('@F7.5 A campaign over a configuration place that matches a seed file is refused', () => {
    // Given the speckit arm declares configuration "src/**"
    // And the speckit arm is otherwise valid, its state and its constitution's place declared
    // And a campaign that runs "speckit-configured" on S1 1.1
    const repo = configuredRepo(
      ['baseline', 'speckit-configured'],
      ['S1@1.1'],
      [
        {
          scenario: 'S1@1.1',
          arm: 'speckit-configured',
          files: { '.specify/memory/constitution.md': '# C\n' },
        },
      ],
    );
    expect(refusal(repo.file)).toBe('');
    const yaml = join(repo.root, 'arms', 'speckit', 'arm.yaml');
    const arm = parse(readFileSync(yaml, 'utf8')) as { configuration: unknown[] };
    arm.configuration.push({ glob: 'src/**', source: 'a test' });
    writeFileSync(yaml, stringify(arm));
    mkdirSync(join(repo.root, 'scenarios', 'S1', '1.1', 'seed', 'src'), { recursive: true });
    writeFileSync(join(repo.root, 'scenarios', 'S1', '1.1', 'seed', 'src', 'index.ts'), 'export {};\n');
    // When the campaign is validated
    const issues = refusal(repo.file);
    // Then it is refused, naming S1 1.1, "speckit-configured", the glob and the seed file
    for (const named of ['S1@1.1', 'speckit-configured', 'src/**', 'src/index.ts'])
      expect(issues).toContain(named);
  });

  it("@F7.5 A campaign whose pins differ from the configuration's record is refused", () => {
    // Given S1 1.1's record for "wingfoil-configured" pins wingfoil v0.3.1
    const configuration = {
      scenario: 'S1@1.1',
      arm: 'wingfoil-configured',
      files: WINGFOIL_CONFIGURATION,
      record: { harness: { tool: 'wingfoil', version: 'v0.3.1', commit: 'c'.repeat(40) } },
    };
    // And a campaign that runs "wingfoil-configured" on S1 1.1 with harnesses.wingfoil at v0.3.2
    const repo = configuredRepo(['baseline', 'wingfoil-configured'], ['S1@1.1'], [configuration], {
      harnesses: { wingfoil: { tool: 'wingfoil', version: 'v0.3.2' } },
    });
    // When the campaign is validated
    const issues = refusal(repo.file);
    // Then it is refused, naming S1 1.1, "wingfoil-configured" and "harnesses"
    expect(issues).toMatch(/harnesses\.wingfoil[^}]*S1@1\.1[^}]*wingfoil-configured[^}]*v0\.3\.1/);
    // And the campaign at the record's pin passes that check
    const matching = configuredRepo(['baseline', 'wingfoil-configured'], ['S1@1.1'], [configuration], {
      harnesses: { wingfoil: { tool: 'wingfoil', version: 'v0.3.1' } },
    });
    expect(refusal(matching.file)).not.toMatch(/wingfoil-configured/);
  });

  it('@F7.5 A campaign whose configurations disagree with their pins is refused', () => {
    for (const [field, changes] of [
      ['base_arm_digest', { S1: { base_arm_digest: 'ffffffffffff' } }],
      ['prompt_sha256', { S2: { prompt_sha256: sha256('another prompt\n') } }],
      ['profile_sha256', { S1: { profile_sha256: sha256('another profile\n') } }],
    ] as const) {
      // Given a campaign that runs "wingfoil-configured" on S1 1.1 and "speckit-configured" on S2 1.1
      const repo = configuredRepo(
        ['baseline', 'wingfoil-configured', 'speckit-configured'],
        ['S1@1.1', 'S2@1.1'],
      );
      const write = (record: Record<string, unknown> = {}) => {
        writeFixtureConfiguration(repo.root, {
          scenario: 'S1@1.1',
          arm: 'wingfoil-configured',
          files: WINGFOIL_CONFIGURATION,
          record: { ...(changes as Record<string, Record<string, unknown>>).S1, ...record },
        });
        for (const scenario of ['S1@1.1', 'S2@1.1'])
          writeFixtureConfiguration(repo.root, {
            scenario,
            arm: 'speckit-configured',
            files: { '.specify/memory/constitution.md': '# C\n' },
            record: {
              rules_sha256: sha256(generatedConstitution(repo.root, scenario)),
              ...(scenario === 'S2@1.1' ? (changes as Record<string, Record<string, unknown>>).S2 : {}),
            },
          });
      };
      write();
      // And <difference>
      // When the campaign is validated
      const issues = refusal(repo.file);
      // Then it is refused, naming the scenario, the arm and the field
      const scenario = field === 'prompt_sha256' ? 'S2@1.1' : 'S1@1.1';
      const arm = field === 'prompt_sha256' ? 'speckit-configured' : 'wingfoil-configured';
      expect(issues).toMatch(new RegExp(`${scenario}[^}]*${arm}[^}]*${field}`));
    }
  });

  it("a configured arm shares its base arm's harness and declares none of its own", () => {
    // Characterization of REQ-FMT-01 as amended in 1.50, beside the scenarios: no harnesses entry of its own
    const repo = configuredRepo(
      ['baseline', 'wingfoil-configured'],
      ['S1@1.1'],
      [{ scenario: 'S1@1.1', arm: 'wingfoil-configured', files: WINGFOIL_CONFIGURATION }],
      { harnesses: { wingfoil: PINS.wingfoil, 'wingfoil-configured': PINS.wingfoil } },
    );
    expect(refusal(repo.file)).toContain('wingfoil-configured');
  });
});

describe("scoring.feature and results.feature, a configured arm's figures (task-142, F7.5)", () => {
  it("@F7.5 The configuring cost counts once in M-K3, every session's", async () => {
    // Given S1 1.1's records for "wingfoil-configured": a refused session of 0.10 EUR and a written one of 0.40 EUR
    const repo = configuredRepo(
      ['baseline', 'wingfoil', 'wingfoil-configured', 'baseline-docs-configured'],
      ['S1@1.1'],
      [
        {
          scenario: 'S1@1.1',
          arm: 'wingfoil-configured',
          files: WINGFOIL_CONFIGURATION,
          earlier: [{ ...refusedRecord(), cost_eur: 0.1, date: '2026-11-07T09:00:00Z' }],
          record: { cost_eur: 0.4 },
        },
      ],
    );
    const checked = checkCampaign(repo.file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const ports = doubles({ commits: COMMITS, onRunOnce: snapshots });
    const summary = await runCampaign(checked.value, { ...ports, harnessSources: SOURCES });
    const configured = (arm: string) =>
      (
        JSON.parse(
          readFileSync(
            join(summary.runs.find((run) => run.arm === arm)?.outputDir ?? '', 'run.json'),
            'utf8',
          ),
        ) as { configured?: unknown }
      ).configured;
    // The runner records the configuration's cost with each run that reads it
    expect(configured('wingfoil-configured')).toEqual({ of: 'wingfoil', records: 2, cost_eur: 0.5 });
    expect(configured('baseline-docs-configured')).toEqual({ of: 'wingfoil', records: 2, cost_eur: 0.5 });
    expect(configured('wingfoil')).toBeUndefined();
    // When the execution is aggregated
    const record = { configured: { of: 'wingfoil', records: 2, cost_eur: 0.5 } };
    const step = [{ id: 'a', passed: 1, total: 1 }];
    const setup = { costEur: 0.2 };
    const dir = execution([
      { scenario: 'S1', version: '1.1', arm: 'wingfoil-configured', steps: [step], setup, record },
      { scenario: 'S1', version: '1.1', arm: 'wingfoil-configured', r: 2, steps: [step], setup, record },
      { scenario: 'S1', version: '1.1', arm: 'baseline-docs-configured', steps: [step], setup, record },
      { scenario: 'S1', version: '1.1', arm: 'wingfoil', steps: [step], setup },
    ]);
    const aggregated = aggregateExecution(dir);
    if (!aggregated.ok) throw new Error(JSON.stringify(aggregated.issues));
    const mK3 = (arm: string) => aggregated.value.m_k3?.find((entry) => entry.arm === arm);
    // Then M-K3 of "wingfoil-configured" and "baseline-docs-configured" on S1 1.1 include 0.50 EUR once
    expect(mK3('wingfoil-configured')).toMatchObject({ version: '1.1', configuration_eur: 0.5, value: 0.7 });
    expect(mK3('baseline-docs-configured')).toMatchObject({ configuration_eur: 0.5, value: 0.7 });
    // And M-K3 of "wingfoil" does not
    expect(mK3('wingfoil')).toMatchObject({
      configuration: 'not recorded',
      configuration_eur: 0,
      value: 0.2,
    });
  });

  it('@F7.5 A configured arm is compared with its configured docs control', async () => {
    // Given an execution that ran "speckit-configured" and "speckit-docs-configured" on S1 1.1
    const step = [{ id: 'a', passed: 1, total: 2 }];
    const dir = execution([
      { scenario: 'S1', version: '1.1', arm: 'baseline', steps: [step] },
      { scenario: 'S1', version: '1.1', arm: 'speckit-configured', steps: [step] },
      {
        scenario: 'S1',
        version: '1.1',
        arm: 'speckit-docs-configured',
        steps: [step],
        docsOf: 'speckit-configured',
      },
    ]);
    // When it is aggregated
    const aggregated = aggregateExecution(dir);
    if (!aggregated.ok) throw new Error(JSON.stringify(aggregated.issues));
    // Then the harness-versus-docs comparison pairs "speckit-configured" with "speckit-docs-configured"
    expect(aggregated.value.controls?.map(({ harness, control }) => ({ harness, control }))).toEqual([
      { harness: 'speckit-configured', control: 'speckit-docs-configured' },
    ]);

    // And the site gives "speckit-configured" a setup page with the speckit arm's manual and setup script
    const arm = loadArm(repoPath('arms'), 'speckit-configured');
    if (!arm.ok) throw new Error(JSON.stringify(arm.issues));
    const script = readFileSync(arm.value.setupPath, 'utf8');
    expect(arm.value.setupPath).toBe(repoPath('arms/speckit/setup.sh'));
    expect(arm.value.manualPath).toBe(repoPath('arms/speckit/manual.md'));
    const page = setupHtml(arm.value, script, ['speckit-docs-configured']);
    expect(page).toContain(escapeHtml(script));
    expect(page).toContain('<code>speckit-docs-configured</code>: the same agent');
    expect(page).toContain('href="manual-speckit-configured.html"');
    expect(page).toContain('Written to <code>.specify/memory/constitution.md</code>');
  });
});
