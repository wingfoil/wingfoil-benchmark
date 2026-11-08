import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

import { armDigest, rulesGeneratorOf } from '../../src/arms/index.js';
import type { RunOnceRequest } from '../../src/core/index.js';
import { relativeFiles } from '../../src/scenario/index.js';
import { completeCampaignYaml, writeRepo } from './campaign-fixture.js';
import type { RepoFixture } from './campaign-fixture.js';
import { configuredRecord, writeConfiguration } from './configured-fixture.js';
import { repoPath } from './paths.js';
import { fakeBuild } from './runner-doubles.js';

/** The configuring prompt and profile a fixture repository commits (REQ-RUN-20), and their SHA-256. */
export const FIXTURE_PROMPT = '# Configure the harness\n\nWrite its configuration for this project.\n';
export const FIXTURE_PROFILE = 'agent:\n  name: claude-code\n';
export const PROMPT_SHA = sha256(FIXTURE_PROMPT);
export const PROFILE_SHA = sha256(FIXTURE_PROFILE);

/** The harness pins of the fixture campaigns, by base arm, and what a record states for them. */
export const PINS: Readonly<Record<string, { tool: string; version: string }>> = {
  wingfoil: { tool: 'wingfoil', version: '3df305e' },
  speckit: { tool: 'speckit', version: 'v1.1.0' },
  openspec: { tool: 'openspec', version: '1.14.0' },
};

/** A configuration a fixture scenario version holds: its configured arm, files, and its records' changes. */
export interface FixtureConfiguration {
  readonly scenario: string;
  readonly arm: string;
  readonly files: Readonly<Record<string, string>>;
  /** Fields of the written record to change. */
  readonly record?: Record<string, unknown>;
  /** Records before the written one, as {@link configuredRecord}'s changes. */
  readonly earlier?: readonly Record<string, unknown>[];
}

/**
 * A repository with a campaign running `arms` on `scenarios`, the repository's harness arms and docs controls copied in
 * (their configured ones too), the scenarios' project rules declared as the wingfoil arm's directives, `configured`
 * written with records that match the campaign's pins, and the configuring prompt and profile committed.
 */
export function configuredRepo(
  arms: readonly string[],
  scenarios: readonly string[],
  configured: readonly FixtureConfiguration[] = [],
  campaign: Record<string, unknown> = {},
): RepoFixture {
  const bases = [...new Set(arms.map((arm) => arm.replace(/-configured$/, '').replace(/-docs$/, '')))];
  const harnesses = Object.fromEntries(
    bases.filter((base) => base !== 'baseline').map((base) => [base, PINS[base]]),
  );
  const refs = scenarios.map((entry) => {
    const [id = '', version = ''] = entry.split('@');
    return { id, version };
  });
  const repo = writeRepo(
    {
      ...completeCampaignYaml(),
      arms,
      harnesses,
      scenarios: refs,
      models: { default: 'claude-sonnet-5' },
      repetitions: Object.fromEntries(refs.map((ref) => [ref.id, 1])),
      ...campaign,
    },
    scenarios,
  );
  const copied = new Set([...arms, ...arms.map((arm) => arm.replace(/-configured$/, ''))]);
  for (const arm of [...copied].filter((name) => name !== 'baseline')) {
    rmSync(join(repo.root, 'arms', arm), { recursive: true, force: true });
    cpSync(repoPath(`arms/${arm}`), join(repo.root, 'arms', arm), { recursive: true });
  }
  for (const entry of scenarios) {
    const [id = '', version = ''] = entry.split('@');
    const config = join(repo.root, 'scenarios', id, version, 'arms', 'wingfoil', '.wingfoil');
    mkdirSync(join(config, 'directives', 'custom'), { recursive: true });
    writeFileSync(join(config, 'roles.yaml'), 'assignments:\n  developer:\n    - r1\n');
    writeFileSync(join(config, 'directives', 'custom', 'r1.md'), '# Rule r1\n\nKeep functions small.\n');
  }
  mkdirSync(join(repo.root, 'configuring'), { recursive: true });
  writeFileSync(join(repo.root, 'configuring', 'prompt.md'), FIXTURE_PROMPT);
  writeFileSync(join(repo.root, 'configuring', 'profile.yaml'), FIXTURE_PROFILE);
  commitAll(repo.root);
  for (const configuration of configured) writeFixtureConfiguration(repo.root, configuration);
  return repo;
}

/** Write `configuration` into its scenario version, its records matching the repository's pins and arms. */
export function writeFixtureConfiguration(root: string, configuration: FixtureConfiguration): void {
  const [id = '', version = ''] = configuration.scenario.split('@');
  const base = configuration.arm.replace(/-configured$/, '');
  const pin = PINS[base] ?? { tool: base, version: 'v0' };
  const common = {
    prompt_sha256: PROMPT_SHA,
    profile_sha256: PROFILE_SHA,
    harness: { tool: pin.tool, version: pin.version, commit: 'c'.repeat(40) },
    base_arm_digest: armDigest(root, base).slice(0, 12),
    date: '2026-11-07T10:00:00Z',
  };
  const earlier = (configuration.earlier ?? []).map((extra) => {
    const record = configuredRecord({}, { ...common, ...extra });
    if (record.outcome !== 'written') delete record.files;
    return record;
  });
  writeConfiguration(join(root, 'scenarios', id, version), configuration.arm, configuration.files, [
    ...earlier,
    configuredRecord(configuration.files, { ...common, ...configuration.record }),
  ]);
}

/** A campaign file's YAML with `changes` over it, rewritten in place. */
export function rewriteCampaign(repo: RepoFixture, yaml: Record<string, unknown>): void {
  writeFileSync(repo.file, stringify(yaml));
}

/** Commit everything in `root`, a repository made on first use, under a fixed identity. */
export function commitAll(root: string): void {
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', root, ...args], {
      stdio: 'ignore',
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_AUTHOR_NAME: 'Fixture',
        GIT_AUTHOR_EMAIL: 'fixture@benchmark.localhost',
        GIT_COMMITTER_NAME: 'Fixture',
        GIT_COMMITTER_EMAIL: 'fixture@benchmark.localhost',
      },
    });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '--allow-empty', '-m', 'fixture');
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** The harness commits the doubles' clones know, and the clones (REQ-RUN-14). */
export const WINGFOIL_SHA = '3df305ea198d7e2ca0da73bfb12b14af865e9922';
export const SPECKIT_SHA = '9a1c2b3d4e5f60718293a4b5c6d7e8f901234567';
export const COMMITS = { '3df305e': WINGFOIL_SHA, 'v1.1.0': SPECKIT_SHA, '1.14.0': 'e'.repeat(40) };
export const SOURCES = {
  wingfoil: '/clones/wingfoil',
  speckit: '/clones/spec-kit',
  openspec: '/clones/openspec',
};

/**
 * The doubles' one-off containers: a harness build as {@link fakeBuild}; a snapshot applies the scenario's wingfoil
 * configuration as the wingfoil setup does, and leaves Spec Kit's constitution template as its init does.
 */
export function snapshots(request: RunOnceRequest): void {
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
export function generatedConstitution(root: string, scenario: string): string {
  const [id = '', version = ''] = scenario.split('@');
  const source = join(root, 'scenarios', id, version, 'arms', 'wingfoil');
  const files = new Map(
    relativeFiles(source).map((path) => [path, readFileSync(join(source, path), 'utf8')]),
  );
  return rulesGeneratorOf('speckit')?.render(files) ?? '';
}
