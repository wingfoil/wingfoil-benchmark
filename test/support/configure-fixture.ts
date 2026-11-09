import { copyFileSync, cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { parse, stringify } from 'yaml';

import { main } from '../../src/cli/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import type { RunOnceRequest } from '../../src/core/index.js';

import { repoPath } from './paths.js';
import { doubles } from './runner-doubles.js';
import type { AgentRequest, Doubles } from './runner-doubles.js';
import { tempDir } from './scenario-fixture.js';

/** The commit every harness pin of a clone resolves to in these tests. */
export const HARNESS_SHA = 'f1d3a4f8337ebbd3ae22760a9c12e3352b93a175';

/**
 * Whether `path`, relative to a scenario version, is one of its configurations or their records (REQ-FMT-04, 1.50):
 * `arms/<harness>-configured/`, a name REQ-FMT-05 reserves for configured arms, and `configured/`.
 */
export function isConfigurationPath(path: string): boolean {
  const posix = path.split(sep).join('/');
  return /^configured(\/|$)/.test(posix) || /^arms\/[^/]+-configured(\/|$)/.test(posix);
}

/**
 * Copy the scenario version `source` to `target` as it was before its configurations were written (task-143): the
 * tests that write or refuse a configuration start from a version that holds none.
 */
export function copyUnconfigured(source: string, target: string): void {
  cpSync(source, target, { recursive: true, filter: (path) => !isConfigurationPath(relative(source, path)) });
}

/**
 * A repository for `bench scenario configure` (task-141): the scenario versions `versions` (`S1@1.1`), less their
 * configurations, and the arms `arms` copied from this repository, the leak-scan declarations, the configuring prompt
 * and its profile; the profile's
 * agent the fake one unless `agent` is `claude-code`, the repository's own.
 */
export function configureRepo(
  versions: readonly string[],
  arms: readonly string[],
  agent: 'fake' | 'claude-code' = 'fake',
): string {
  const root = tempDir('bench-configure-');
  for (const ref of versions) {
    const [id = '', version = ''] = ref.split('@');
    copyUnconfigured(repoPath(join('scenarios', id, version)), join(root, 'scenarios', id, version));
  }
  mkdirSync(join(root, 'scenarios'), { recursive: true });
  copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
  for (const arm of arms) cpSync(repoPath(join('arms', arm)), join(root, 'arms', arm), { recursive: true });
  mkdirSync(join(root, 'configuring'));
  copyFileSync(repoPath('configuring/prompt.md'), join(root, 'configuring', 'prompt.md'));
  const profile = parse(readFileSync(repoPath('configuring/profile.yaml'), 'utf8')) as Record<
    string,
    unknown
  >;
  writeFileSync(
    join(root, 'configuring', 'profile.yaml'),
    stringify(
      agent === 'fake'
        ? { ...profile, agent: { name: 'fake', version: '1.0.0' }, models: { default: 'fake-model' } }
        : profile,
    ),
  );
  return root;
}

/** What each harness arm's setup leaves in the workspace in these tests, in place of the real tool's files. */
export const SETUP_FILES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  wingfoil: {
    '.wingfoil/dna.yaml': [
      'project:',
      '  name: Fake',
      'team:',
      '  members:',
      '    - name: Benchmark Approver',
      '      email: approver@benchmark.localhost',
      '      roles: [approver]',
      '  roles:',
      '    - name: developer',
      '    - name: approver',
      '',
    ].join('\n'),
    '.wingfoil/roles.yaml': 'assignments:\n  developer: []\n',
    '.wingfoil/directives/built-in/testing.md': '# Testing\n',
    'docs/memory/plan/plan-001.md': '# Plan\n',
  },
  speckit: {
    '.specify/memory/constitution.md': '# [PROJECT_NAME] Constitution\n',
    '.specify/templates/spec-template.md': '# Spec\n',
    '.claude/skills/speckit-specify/SKILL.md': '# Specify\n',
  },
  openspec: {
    'openspec/config.yaml': 'schema: spec-driven\n',
    '.claude/commands/opsx/propose.md': '# Propose\n',
  },
};

/** Write `files` under `dir`, each at its path. */
export function writeFiles(dir: string, files: Readonly<Record<string, string>>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
}

/** Every file under `dir`, by its path from `dir`, `.git/` left out, sorted. */
export function workspaceFiles(dir: string, prefix = ''): string[] {
  return readdirSync(join(dir, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (path === '.git') return [];
      return entry.isDirectory() ? workspaceFiles(dir, path) : [path];
    })
    .sort();
}

/** A harness build that writes what the real one writes, whichever tool it builds: its package and its install. */
function build(request: RunOnceRequest): void {
  const command = request.command.join(' ');
  const out = join(request.mount.source, 'out');
  mkdirSync(out, { recursive: true });
  const name = command.includes('specify_cli')
    ? 'specify_cli-1.1.0-py3-none-any.whl'
    : command.includes('openspec')
      ? 'fission-ai-openspec-1.14.0.tgz'
      : 'wingfoil-0.3.1.tgz';
  writeFileSync(join(out, name), `${name} package`);
  writeFileSync(join(out, 'installed.tgz'), 'installed');
}

/**
 * The ports of a configuring session (task-141): Docker and the agent are doubles, git is the real one on the
 * workspace (a harness clone's revisions still resolve through the double). The arm `arm`'s setup leaves
 * {@link SETUP_FILES}; `session` is what the agent does in the workspace.
 */
export function configurePorts(
  arm: string,
  options: {
    readonly session?: (workspace: string, request: AgentRequest) => void;
    readonly doubles?: Parameters<typeof doubles>[0];
  } = {},
): Doubles {
  const workspace = () => made.recorded.creates.at(-1)?.workspace ?? '';
  const made: Doubles = doubles({
    commits: { 'v0.3.1': HARNESS_SHA, 'v1.1.0': HARNESS_SHA },
    onRunOnce: build,
    execResultOf: (command) => {
      if (command[0] === 'bash' && command[1]?.endsWith('/setup.sh') === true) {
        writeFiles(workspace(), SETUP_FILES[arm] ?? {});
        return { code: 0, stdout: 'setup done\n', stderr: '' };
      }
      return undefined;
    },
    onStep: (request) => options.session?.(workspace(), request),
    ...options.doubles,
  });
  const real = gitCli(systemProcess);
  return { ...made, git: { ...real, resolveCommit: made.git.resolveCommit, archive: made.git.archive } };
}

/** `bench scenario configure` with `argv`, against `ports`, in `root`. */
export async function benchConfigure(root: string, argv: readonly string[], ports: Doubles) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    ['scenario', 'configure', ...argv],
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    ports,
    root,
  );
  return { code, stdout, stderr };
}

/** The records of `harness`'s configuration in scenario version `dir`, as stored. */
export function storedRecords(dir: string, harness: string): Record<string, unknown>[] {
  return JSON.parse(readFileSync(join(dir, 'configured', `${harness}-configured.json`), 'utf8')) as Record<
    string,
    unknown
  >[];
}
