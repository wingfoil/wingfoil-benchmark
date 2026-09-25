import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Arm, DockerPort, GitPort } from '../core/index.js';

import type { CheckedCampaign } from './campaign.js';
import { hostUser } from './identity.js';

/**
 * A harness built for a campaign (REQ-RUN-14, adr-003 decisions 1–5): the installed artefact a run's
 * setup unpacks, and what identifies it. `run.json` records everything but the path (decision 4).
 */
export interface HarnessArtefact {
  readonly tool: string;
  /** The full SHA the campaign's pin resolved to in the clone. */
  readonly commit: string;
  readonly tarballSha256: string;
  readonly installedSha256: string;
  /** The installed artefact on the host, copied into each run's container. */
  readonly installed: string;
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

/** The harness tools this runner can build, by the name an arm `requires` (v0.1: WingFoil only). */
const BUILDERS: Readonly<Record<string, (sha: string) => string>> = { wingfoil: wingfoilBuild };

/**
 * Build, or find in the cache, every harness the campaign's arms require, before any run starts
 * (REQ-RUN-14). A pin that is not a commit of its clone, a tool with no clone or no builder, or a build
 * that fails stops the campaign: an arm never runs without its harness.
 */
export async function prepareHarnesses(
  checked: CheckedCampaign,
  options: HarnessOptions,
): Promise<ReadonlyMap<string, HarnessArtefact>> {
  const artefacts = new Map<string, HarnessArtefact>();
  for (const arm of checked.arms) {
    const tool = arm.requires;
    if (tool === undefined || artefacts.has(tool)) continue;
    artefacts.set(tool, await prepare(arm, tool, checked, options));
  }
  return artefacts;
}

async function prepare(
  arm: Arm,
  tool: string,
  { campaign }: CheckedCampaign,
  options: HarnessOptions,
): Promise<HarnessArtefact> {
  // Checked by the campaign check (harness coverage); the guard keeps the type honest.
  const harness = campaign.spec.harnesses[arm.name];
  if (harness === undefined) throw new Error(`arm ${arm.name} requires '${tool}' and pins no harness`);
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

  const cache = join(campaign.repoRoot, '.cache', 'harness', tool, sha);
  const cached = fromCache(cache, tool, sha);
  if (cached !== undefined) return cached;

  const build = join(cache, 'build');
  rmSync(build, { recursive: true, force: true });
  mkdirSync(build, { recursive: true });
  await options.git.archive(clone, sha, join(build, 'src.tar'));
  const result = await options.docker.runOnce({
    image: campaign.id,
    user: hostUser(),
    mount: { source: build, target: BUILD },
    command: ['bash', '-c', builder(sha)],
  });
  if (result.code !== 0) {
    const tail = result.stderr.trimEnd().split('\n').slice(-BUILD_ERROR_LINES).join('\n');
    throw new Error(
      `building ${tool} ${sha} failed with code ${result.code}${tail === '' ? '' : `: ${tail}`}`,
    );
  }
  const out = join(build, 'out');
  const tarball = readdirSync(out).find((name) => name !== 'installed.tgz' && name.endsWith('.tgz'));
  if (tarball === undefined) throw new Error(`building ${tool} ${sha} produced no tarball`);
  const installed = join(cache, 'installed.tgz');
  renameSync(join(out, 'installed.tgz'), installed);
  renameSync(join(out, tarball), join(cache, tarball));
  const record: CacheRecord = {
    tool,
    commit: sha,
    tarball_sha256: sha256(join(cache, tarball)),
    installed_sha256: sha256(installed),
  };
  writeFileSync(join(cache, 'harness.json'), `${JSON.stringify(record, undefined, 2)}\n`);
  rmSync(build, { recursive: true, force: true });
  return artefactOf(record, installed);
}

/** A cached artefact, if its record names this tool and commit and its digest still matches. */
function fromCache(cache: string, tool: string, sha: string): HarnessArtefact | undefined {
  const recordFile = join(cache, 'harness.json');
  const installed = join(cache, 'installed.tgz');
  if (!existsSync(recordFile) || !existsSync(installed)) return undefined;
  const record = JSON.parse(readFileSync(recordFile, 'utf8')) as CacheRecord;
  if (record.tool !== tool || record.commit !== sha || record.installed_sha256 !== sha256(installed)) {
    return undefined;
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
