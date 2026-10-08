import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import type { Arm, CampaignFile, DockerPort, GitPort } from '../core/index.js';

import { hostUser } from './identity.js';

/**
 * A harness built for a campaign (REQ-RUN-14, adr-003 decisions 1–5): the installed artefact a run's
 * setup unpacks, and what identifies it. `run.json` records everything but the path (decision 4).
 */
export interface HarnessArtefact {
  readonly tool: string;
  /** The version the campaign pins (REQ-FMT-01): a release or a commit, as written. */
  readonly version?: string;
  /**
   * The full SHA the campaign's pin resolved to in the clone; for a tool fetched from the npm registry, which has no
   * commits, the SHA-256 of the registry's tarball, its content's identity (task-071).
   */
  readonly commit: string;
  readonly tarballSha256: string;
  readonly installedSha256: string;
  /** The installed artefact on the host, copied into each run's container. */
  readonly installed: string;
}

/**
 * What the harnesses are built for: a campaign or a dry run (task-021) — its identity, which is the
 * image a build runs in, its repository, whose `.cache/` keeps the artefacts, its arms and its pins.
 */
export interface HarnessTarget {
  readonly id: string;
  readonly repoRoot: string;
  readonly arms: readonly Arm[];
  readonly harnesses: CampaignFile['harnesses'];
}

/** What a harness build needs: the ports, and the local clone of each tool. */
export interface HarnessOptions {
  readonly docker: DockerPort;
  readonly git: GitPort;
  readonly harnessSources?: Readonly<Record<string, string>>;
}

/** The record kept next to a cached artefact, so that a cache hit is checked, not trusted. */
interface CacheRecord {
  readonly tool: string;
  readonly commit: string;
  /** For a registry tool (task-071): the version it was fetched at, which keys its cache. */
  readonly version?: string;
  /** The tool's own package's file name in the cache, which keeps the name the tool's packing gave it. */
  readonly tarball: string;
  readonly tarball_sha256: string;
  readonly installed_sha256: string;
}

/** How many lines of a failing build's error output its error keeps. */
const BUILD_ERROR_LINES = 5;

/** Where the build directory is mounted in the build container. */
const BUILD = '/build';

/**
 * The build of WingFoil at `sha`, in the campaign's image (adr-003 decisions 1, 2): `npm ci` and
 * `npm pack` on the clean archive, exactly as REQ-RUN-14 says; then the tarball installed next to the
 * archive's own lockfile, with its dependencies at the lock's versions and no install scripts; the
 * commit written inside it; the whole packed as one artefact. `HOME` is the build directory's: the
 * build runs as the host's user, who has no home in the image.
 */
function wingfoilBuild(sha: string): string {
  return [
    'set -euo pipefail',
    `export HOME=${BUILD}/home`,
    `mkdir -p ${BUILD}/home ${BUILD}/src ${BUILD}/out ${BUILD}/install`,
    `tar -xf ${BUILD}/src.tar -C ${BUILD}/src`,
    `cd ${BUILD}/src`,
    'npm ci --no-audit --no-fund',
    `npm pack --pack-destination ${BUILD}/out`,
    `tar -xzf ${BUILD}/out/wingfoil-*.tgz -C ${BUILD}/install`,
    `mv ${BUILD}/install/package ${BUILD}/install/wingfoil`,
    `cp ${BUILD}/src/package-lock.json ${BUILD}/install/wingfoil/`,
    `cd ${BUILD}/install/wingfoil`,
    'npm ci --omit=dev --ignore-scripts --no-audit --no-fund',
    `echo ${sha} > .wingfoil-commit`,
    `tar -czf ${BUILD}/out/installed.tgz -C ${BUILD}/install wingfoil`,
  ].join('\n');
}

/**
 * The build of Spec Kit at `sha`, in the campaign's image (REQ-FMT-12, task-065's B1): its wheel built from the clean
 * archive, and the wheels of its dependencies downloaded beside it, resolved once here for the image's Python. The
 * package is the tool's wheel; the installed artifact is the bundle, every wheel flat at its root, which the arm's
 * setup installs offline. `HOME` is the build directory's, as for WingFoil.
 */
function speckitBuild(sha: string): string {
  return [
    'set -euo pipefail',
    `export HOME=${BUILD}/home`,
    `mkdir -p ${BUILD}/home ${BUILD}/src ${BUILD}/out ${BUILD}/bundle`,
    `tar -xf ${BUILD}/src.tar -C ${BUILD}/src`,
    `cd ${BUILD}/src`,
    `uv build --wheel --out-dir ${BUILD}/bundle`,
    `uv run --no-project --with pip python -m pip download -q -d ${BUILD}/bundle ${BUILD}/bundle/specify_cli-*.whl`,
    `cp ${BUILD}/bundle/specify_cli-*.whl ${BUILD}/out/`,
    // The dependencies were resolved from ranges when the bundle was built: each wheel's digest travels with it.
    `(cd ${BUILD}/bundle && sha256sum *.whl > SHA256SUMS)`,
    `echo ${sha} > ${BUILD}/bundle/.speckit-commit`,
    `tar -czf ${BUILD}/out/installed.tgz -C ${BUILD}/bundle .`,
  ].join('\n');
}

/** Where every pinned harness's artifact is cached, from the repository root (REQ-FMT-12; git-ignored). */
export const HARNESS_CACHE = join('.cache', 'harnesses');

/**
 * The build of an npm package fetched from the registry at `version` (REQ-FMT-12, task-071, task-070's B1), in the
 * campaign's image: `npm pack` (npm checks the registry's integrity itself), then the tarball installed with its
 * dependencies into a prefix, which is the installed artifact (an npm cache alone does not install offline: its
 * package metadata is missing). The prefix is packed as the tool's name, so that the arm's setup unpacks it under one
 * directory. `HOME` is the build directory's, as for every build.
 */
function registryBuild(tool: string, spec: string): string {
  return [
    'set -euo pipefail',
    `export HOME=${BUILD}/home`,
    `mkdir -p ${BUILD}/home ${BUILD}/out ${BUILD}/install`,
    `npm pack --pack-destination ${BUILD}/out '${spec}'`,
    // No lifecycle scripts, as for WingFoil's installed tree: the build fetches, it does not run its dependencies.
    `npm install --global --prefix ${BUILD}/install/${tool} --no-audit --no-fund --ignore-scripts ${BUILD}/out/*.tgz`,
    `tar -czf ${BUILD}/out/installed.tgz -C ${BUILD}/install ${tool}`,
  ].join('\n');
}

/** A released version, as a registry pin must be (task-071): npm reads anything else as a tag. */
const RELEASE = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** The tools fetched from the npm registry by version, with no clone (task-071): their package, by tool. */
const REGISTRY_PACKAGES: Readonly<Record<string, string>> = { openspec: '@fission-ai/openspec' };

/** The harness tools this runner can build, by the name an arm `requires`. */
const BUILDERS: Readonly<Record<string, (sha: string) => string>> = {
  wingfoil: wingfoilBuild,
  speckit: speckitBuild,
};

/**
 * Build, or find in the cache, every harness the campaign's arms require, before any run starts
 * (REQ-RUN-14). A pin that is not a commit of its clone, a tool with no clone or no builder, or a build
 * that fails stops the campaign: an arm never runs without its harness.
 */
export async function prepareHarnesses(
  target: HarnessTarget,
  options: HarnessOptions,
): Promise<ReadonlyMap<string, HarnessArtefact>> {
  const artefacts = new Map<string, HarnessArtefact>();
  for (const arm of target.arms) {
    const tool = arm.requires;
    if (tool === undefined || artefacts.has(tool)) continue;
    artefacts.set(tool, await prepare(arm, tool, target, options));
  }
  return artefacts;
}

async function prepare(
  arm: Arm,
  tool: string,
  target: HarnessTarget,
  options: HarnessOptions,
): Promise<HarnessArtefact> {
  // Checked by the campaign or dry-run check (harness coverage); the guard keeps the type honest.
  const harness = target.harnesses[arm.name];
  if (harness === undefined) throw new Error(`arm ${arm.name} requires '${tool}' and pins no harness`);
  if (Object.hasOwn(REGISTRY_PACKAGES, harness.tool))
    return prepareFromRegistry(tool, harness, target, options);
  const builder = BUILDERS[harness.tool];
  if (builder === undefined) {
    throw new Error(`the harness '${harness.tool}' of arm ${arm.name} has no builder in this runner`);
  }
  const clone = options.harnessSources?.[tool];
  if (clone === undefined) {
    throw new Error(
      `the ${tool} harness of arm ${arm.name} needs a local clone of ${tool}, and none is configured`,
    );
  }
  const pin = harness.commit ?? harness.version;
  const sha = await options.git.resolveCommit(clone, pin);
  if (sha === undefined)
    throw new Error(`the ${tool} harness pins ${pin}, which is not a commit of ${clone}`);

  const cache = join(target.repoRoot, HARNESS_CACHE, tool, sha);
  const cached = fromCache(target.repoRoot, cache, tool, (record) => record.commit === sha);
  if (cached !== undefined) return { ...cached, version: harness.version };

  const build = join(cache, 'build');
  rmSync(build, { recursive: true, force: true });
  mkdirSync(build, { recursive: true });
  await options.git.archive(clone, sha, join(build, 'src.tar'));
  const record = await buildInto(cache, tool, sha, builder(sha), target, options, () => sha);
  return { ...artefactOf(record, join(cache, 'installed.tgz')), version: harness.version };
}

/**
 * A harness fetched from the npm registry (task-071): pinned by its released version, with no clone and no commit to
 * resolve; cached by that version, and identified in `run.json` by the SHA-256 of the registry's tarball.
 */
async function prepareFromRegistry(
  tool: string,
  harness: CampaignFile['harnesses'][string],
  target: HarnessTarget,
  options: HarnessOptions,
): Promise<HarnessArtefact> {
  if (harness.commit !== undefined) {
    throw new Error(
      `the ${tool} harness pins commit ${harness.commit}, but ${tool} is fetched from the npm registry by version`,
    );
  }
  const version = harness.version;
  if (!RELEASE.test(version)) {
    throw new Error(`the ${tool} harness pins ${version}, which is not a released version of ${tool}`);
  }
  const cache = join(target.repoRoot, HARNESS_CACHE, tool, version);
  const cached = fromCache(target.repoRoot, cache, tool, (record) => record.version === version);
  if (cached !== undefined) {
    // Its commit is its tarball's digest: a record saying otherwise was edited, and is refused as a tampered one is.
    if (cached.commit !== cached.tarballSha256) {
      throw new Error(
        `the cached harness record ${relative(target.repoRoot, join(cache, 'harness.json'))} names a commit that is not its tarball's digest: remove ${relative(target.repoRoot, cache)}/ to rebuild it`,
      );
    }
    return { ...cached, version };
  }

  const build = join(cache, 'build');
  rmSync(build, { recursive: true, force: true });
  mkdirSync(build, { recursive: true });
  const spec = `${REGISTRY_PACKAGES[tool] ?? tool}@${version}`;
  const record = await buildInto(
    cache,
    tool,
    version,
    registryBuild(tool, spec),
    target,
    options,
    (tarballSha) => tarballSha,
    version,
  );
  return { ...artefactOf(record, join(cache, 'installed.tgz')), version };
}

/**
 * Run `script` in the campaign's image on the build directory under `cache`, then keep its package and its installed
 * artifact there with their record: `commitOf` names the artifact's commit, given the package's digest.
 */
async function buildInto(
  cache: string,
  tool: string,
  label: string,
  script: string,
  target: HarnessTarget,
  options: HarnessOptions,
  commitOf: (tarballSha256: string) => string,
  version?: string,
): Promise<CacheRecord> {
  const build = join(cache, 'build');
  const result = await options.docker.runOnce({
    image: target.id,
    user: hostUser(),
    mount: { source: build, target: BUILD },
    command: ['bash', '-c', script],
  });
  if (result.code !== 0) {
    const tail = result.stderr.trimEnd().split('\n').slice(-BUILD_ERROR_LINES).join('\n');
    throw new Error(
      `building ${tool} ${label} failed with code ${result.code}${tail === '' ? '' : `: ${tail}`}`,
    );
  }
  const out = join(build, 'out');
  // The tool's own package: npm's tarball, or a Python tool's wheel.
  const tarball = readdirSync(out).find(
    (name) => name !== 'installed.tgz' && (name.endsWith('.tgz') || name.endsWith('.whl')),
  );
  if (tarball === undefined) throw new Error(`building ${tool} ${label} produced no tarball`);
  const installed = join(cache, 'installed.tgz');
  renameSync(join(out, 'installed.tgz'), installed);
  renameSync(join(out, tarball), join(cache, tarball));
  const tarballSha256 = sha256(join(cache, tarball));
  const record: CacheRecord = {
    tool,
    commit: commitOf(tarballSha256),
    ...(version === undefined ? {} : { version }),
    tarball,
    tarball_sha256: tarballSha256,
    installed_sha256: sha256(installed),
  };
  writeFileSync(join(cache, 'harness.json'), `${JSON.stringify(record, undefined, 2)}\n`);
  rmSync(build, { recursive: true, force: true });
  return record;
}

/**
 * A cached artefact, if its record names this tool and commit; `undefined` when there is none to reuse (no record, an
 * unreadable one, or another tool's or commit's), so that it is built. A cached file — the installed artifact, or the
 * package its record names — that is missing or whose bytes no longer match the digest its record holds is refused,
 * naming it (REQ-FMT-12, F7.1): rebuilding it silently would also hide a
 * tampered artifact, so the maintainer removes the directory to rebuild.
 */
function fromCache(
  repoRoot: string,
  cache: string,
  tool: string,
  matches: (record: CacheRecord) => boolean,
): HarnessArtefact | undefined {
  const recordFile = join(cache, 'harness.json');
  const installed = join(cache, 'installed.tgz');
  if (!existsSync(recordFile)) return undefined;
  let record: CacheRecord;
  try {
    record = JSON.parse(readFileSync(recordFile, 'utf8')) as CacheRecord;
  } catch {
    return undefined;
  }
  if (record.tool !== tool || !matches(record) || typeof record.tarball !== 'string') return undefined;
  const checks: [string, string][] = [
    [installed, record.installed_sha256],
    [join(cache, basename(record.tarball)), record.tarball_sha256],
  ];
  for (const [file, recorded] of checks) {
    const state = !existsSync(file)
      ? 'is missing'
      : sha256(file) !== recorded
        ? 'no longer matches its recorded digest'
        : '';
    if (state !== '') {
      throw new Error(
        `the cached harness artifact ${relative(repoRoot, file)} ${state}: remove ${relative(repoRoot, cache)}/ to rebuild it`,
      );
    }
  }
  return artefactOf(record, installed);
}

function artefactOf(record: CacheRecord, installed: string): HarnessArtefact {
  return {
    tool: record.tool,
    commit: record.commit,
    tarballSha256: record.tarball_sha256,
    installedSha256: record.installed_sha256,
    installed,
  };
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
