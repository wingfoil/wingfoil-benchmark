import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';

import { fail, ok } from '../core/index.js';
import type { Issue, ProcessPort, Result } from '../core/index.js';

import { AGGREGATE_FILE } from './aggregate.js';
import type { AggregateFile } from './aggregate.js';

/**
 * An execution's transcripts as one release asset (REQ-RES-06 as amended in 1.22, task-047): transcripts
 * are git-ignored, so they are published as one archive attached to the GitHub release `<campaign-id>-<n>`,
 * and each run whose transcripts it holds records it in its `run.json`. The archive is made here; attaching
 * it is the maintainer's, by the command this prints.
 */

/** Where release assets are made, git-ignored (`/releases/`). */
export const RELEASES = 'releases';

/** The asset's file name. */
export const TRANSCRIPTS_ASSET = 'transcripts.tar.gz';

const TRANSCRIPT = 'transcript.jsonl';

/** The shape of an Anthropic key or token: never in a transcript (REQ-NFR-01). */
const ANTHROPIC_SECRET = /sk-ant-[A-Za-z0-9_-]+/;

/** A secret the transcripts must not hold: its value, and how to name it without showing it. */
export interface KnownSecret {
  readonly value: string;
  readonly name: string;
}

/** What a pack made: the archive, its digest, the transcripts it holds, and the runs that had none. */
export interface TranscriptPack {
  readonly release: string;
  readonly archive: string;
  readonly sha256: string;
  readonly transcripts: number;
  readonly runsWithout: readonly string[];
  /** The harness artifacts the runs installed (REQ-CLI-11 as amended); absent when no run installed one. */
  readonly harnesses?: HarnessPack;
}

/** The second asset: the cached artifacts packed, and those the cache no longer holds, by directory. */
export interface HarnessPack {
  readonly archive?: string;
  readonly sha256?: string;
  readonly artifacts: number;
  readonly missing: readonly string[];
}

/** The release asset of the harness artifacts an execution used (REQ-CLI-11 as amended, REQ-FMT-12). */
export const HARNESSES_ASSET = 'harnesses.tar.gz';

/** Where the runner caches every harness artifact, from the repository root (REQ-FMT-12). */
const HARNESS_CACHE = join('.cache', 'harnesses');

/** GNU tar's flags for an archive whose bytes depend on its files' content and paths only (REQ-NFR-05). */
const REPRODUCIBLE = [
  '--sort=name',
  '--mtime=@0',
  '--owner=0',
  '--group=0',
  '--numeric-owner',
  '--mode=u=rw,go=r',
  '--format=gnu',
  '--use-compress-program=gzip -n',
];

/**
 * Pack the transcripts of the aggregated execution `results/<execution>` in `root` into
 * `releases/<campaign-id>-<n>/transcripts.tar.gz`, after checking none holds a `secrets` value or the shape
 * of an Anthropic key; then record the asset in each run whose transcripts it holds.
 */
export async function packTranscripts(
  root: string,
  execution: string,
  options: { readonly process: ProcessPort; readonly secrets: readonly KnownSecret[] },
): Promise<Result<TranscriptPack>> {
  const executionDir = join(root, 'results', execution);
  const where = `results/${execution}`;
  const aggregateFile = join(executionDir, AGGREGATE_FILE);
  if (!existsSync(aggregateFile)) {
    return fail([{ path: where, message: `has no ${AGGREGATE_FILE}: score it first (bench score)` }]);
  }
  let aggregate: AggregateFile;
  try {
    aggregate = JSON.parse(readFileSync(aggregateFile, 'utf8')) as AggregateFile;
  } catch (error) {
    return fail([{ path: `${where}/${AGGREGATE_FILE}`, message: `cannot be read: ${(error as Error).message}` }]);
  }
  const runs = [...aggregate.groups, ...aggregate.slices].flatMap((group) => group.runs);
  /** A run's directory, relative to the execution: its aggregate name less `<campaign-id>/<n>/`. */
  const relativeRun = (run: string) => run.split('/').slice(2).join('/');

  const paths: string[] = [];
  const withTranscripts: string[] = [];
  const runsWithout: string[] = [];
  for (const run of runs) {
    const steps = join(executionDir, relativeRun(run), 'steps');
    const own = (existsSync(steps) ? readdirSync(steps).sort() : [])
      .map((step) => `${relativeRun(run)}/steps/${step}/${TRANSCRIPT}`)
      .filter((path) => present(join(executionDir, path)));
    if (own.length === 0) runsWithout.push(run);
    else withTranscripts.push(run);
    paths.push(...own);
  }
  if (paths.length === 0) return fail([{ path: where, message: 'has no transcript on disk to pack' }]);
  // A link would pack what it points to (task-047's third review): only regular files are transcripts.
  const irregular = paths.filter((path) => !lstatSync(join(executionDir, path)).isFile());
  if (irregular.length > 0) {
    return fail(irregular.map((path) => ({ path, message: 'is not a regular file: a transcript is never a link' })));
  }

  // The transcripts are copied aside first: what is checked for secrets is what is packed (task-047's
  // second review), whatever changes on disk meanwhile.
  const copies = mkdtempSync(join(tmpdir(), 'bench-transcripts-'));
  try {
    for (const path of paths) {
      mkdirSync(dirname(join(copies, path)), { recursive: true });
      copyFileSync(join(executionDir, path), join(copies, path));
    }
    return await packCopies(root, executionDir, copies, aggregate, { paths, runs, withTranscripts, runsWithout }, options);
  } finally {
    rmSync(copies, { recursive: true, force: true });
  }
}

/** The pack of the transcripts copied into `copies`: the checks, the archive and the records. */
async function packCopies(
  root: string,
  executionDir: string,
  copies: string,
  aggregate: AggregateFile,
  found: {
    readonly paths: readonly string[];
    readonly runs: readonly string[];
    readonly withTranscripts: readonly string[];
    readonly runsWithout: readonly string[];
  },
  options: { readonly process: ProcessPort; readonly secrets: readonly KnownSecret[] },
): Promise<Result<TranscriptPack>> {
  const { paths, runs, withTranscripts, runsWithout } = found;
  const relativeRun = (run: string) => run.split('/').slice(2).join('/');
  const issues: Issue[] = [];
  for (const path of paths) {
    readFileSync(join(copies, path), 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (ANTHROPIC_SECRET.test(line)) {
          issues.push({ path: `${path}:${index + 1}`, message: 'holds what looks like an Anthropic key or token' });
        }
        for (const secret of options.secrets) {
          if (secret.value !== '' && line.includes(secret.value)) {
            issues.push({ path: `${path}:${index + 1}`, message: `holds ${secret.name}` });
          }
        }
      });
  }
  if (issues.length > 0) return fail(issues);

  const release = `${aggregate.campaign}-${aggregate.execution}`;
  // Every run record is read before anything is written: a pack either completes or changes nothing.
  const records = new Map<string, Record<string, unknown>>();
  const originals = new Map<string, string>();
  for (const run of runs) {
    const file = join(executionDir, relativeRun(run), 'run.json');
    try {
      const text = readFileSync(file, 'utf8');
      originals.set(run, text);
      const record: unknown = JSON.parse(text);
      if (record === null || typeof record !== 'object' || Array.isArray(record)) throw new Error('not an object');
      records.set(run, record as Record<string, unknown>);
    } catch (error) {
      issues.push({ path: `${relativeRun(run)}/run.json`, message: `cannot be read: ${(error as Error).message}` });
    }
  }
  if (issues.length > 0) return fail(issues);

  const relativeArchive = `${RELEASES}/${release}/${TRANSCRIPTS_ASSET}`;
  const harnessesArchive = join(root, RELEASES, release, HARNESSES_ASSET);
  const harnessesPartial = `${harnessesArchive}.partial`;
  const archive = join(root, relativeArchive);
  const createdReleases = !existsSync(join(root, RELEASES));
  const createdRelease = !existsSync(join(root, RELEASES, release));
  /** What a failed pack takes back: the directories it created, and nothing else. */
  const undo = () => {
    rmSync(partial, { force: true });
    rmSync(harnessesPartial, { force: true });
    if (createdReleases) rmSync(join(root, RELEASES), { recursive: true, force: true });
    else if (createdRelease) rmSync(join(root, RELEASES, release), { recursive: true, force: true });
  };
  mkdirSync(join(root, RELEASES, release), { recursive: true });
  // Written under another name, and renamed into place last, once its records are written: a failed tar
  // leaves no archive behind, and the archive in place always matches its records.
  const partial = `${archive}.partial`;
  const tar = await options.process.run('tar', [...REPRODUCIBLE, '-cf', partial, '-C', copies, ...[...paths].sort()]);
  if (tar.code !== 0) {
    undo();
    return fail([{ path: relativeArchive, message: `tar failed: ${tar.stderr.trim()}` }]);
  }
  const sha256 = createHash('sha256').update(readFileSync(partial)).digest('hex');
  // The harness artifacts, checked against what the runs installed and packed aside, before any record is written: a
  // pack either completes or changes nothing, the second asset included.
  let harnesses: Result<HarnessPack | undefined>;
  try {
    harnesses = await packHarnesses(root, [...records.values()], harnessesPartial, options.process);
  } catch (error) {
    harnesses = fail([{ path: HARNESS_CACHE, message: `cannot be read: ${(error as Error).message}` }]);
  }
  if (!harnesses.ok) {
    undo();
    return harnesses;
  }

  // The records, then the archive. Each record is written beside itself and renamed into place, so it is
  // never left cut short; one that cannot be written puts back those already written and removes the
  // partial archive, so a failed pack changes nothing (task-047's third and fourth reviews).
  const written: string[] = [];
  for (const [run, record] of records) {
    const holds = withTranscripts.includes(run);
    const stale = (record.transcripts as { release?: unknown } | undefined)?.release === release;
    if (!holds && !stale) continue;
    if (holds) record.transcripts = { release, asset: TRANSCRIPTS_ASSET, sha256 };
    // A run whose transcripts are gone no longer points at this release's asset.
    else delete record.transcripts;
    const file = join(executionDir, relativeRun(run), 'run.json');
    const replaced = replaceFile(file, `${JSON.stringify(record, undefined, 2)}\n`);
    if (!replaced.ok) {
      // A record that cannot be put back is named: it would point at an archive that is gone.
      const unrestored = written.filter(
        (done) => !replaceFile(join(executionDir, relativeRun(done), 'run.json'), originals.get(done) ?? '').ok,
      );
      undo();
      return fail([
        ...unrestored.map((done) => ({
          path: `${relativeRun(done)}/run.json`,
          message: 'cannot be put back: it records an archive this failed pack removed',
        })),{ path: `${relativeRun(run)}/run.json`, message: `cannot be written: ${replaced.issues[0]?.message ?? ''}` }]);
    }
    written.push(run);
  }
  renameSync(partial, archive);
  // The second asset, or none: an earlier pack's is not left beside an execution that now packs none.
  if (harnesses.value?.archive !== undefined) renameSync(harnessesPartial, harnessesArchive);
  else rmSync(harnessesArchive, { force: true });
  return ok({
    release,
    archive: relativeArchive,
    sha256,
    transcripts: paths.length,
    runsWithout,
    ...(harnesses.value === undefined ? {} : { harnesses: harnesses.value }),
  });
}

/** What a run records of the harness it installed (REQ-FMT-06 as amended). */
interface RecordedHarness {
  readonly tool?: unknown;
  readonly commit?: unknown;
  readonly version?: unknown;
  readonly installed_sha256?: unknown;
  readonly tarball_sha256?: unknown;
}

/**
 * The harness artifacts the runs recorded, packed from the cache into `partial` as `<tool>/<commit>/<file>` (or
 * `<tool>/<version>/<file>` for a registry tool, cached by its version, task-071),
 * reproducibly, their licences inside unchanged, so that a reader can install the bytes the runs installed
 * (REQ-FMT-12). Each cached file is checked against the digest the runs recorded: a cache tampered with, or rebuilt to
 * other bytes, since the runs is refused, naming the file, rather than published; so are runs that recorded one
 * harness with different digests, or without them, since nothing then says which bytes they installed. An artifact the cache no longer
 * holds is named, and the others are packed; none at all packs no asset.
 */
async function packHarnesses(
  root: string,
  records: readonly Record<string, unknown>[],
  partial: string,
  process: ProcessPort,
): Promise<Result<HarnessPack | undefined>> {
  // Every run's record of each harness: the digests it installed, which must be one pair per tool and commit.
  const recordedBy = new Map<string, Set<string>>();
  // A registry tool (task-071) is cached by its version, its commit being its tarball's digest: where to look too.
  const versionDir = new Map<string, string>();
  for (const record of records) {
    const harness = record.harness as RecordedHarness | undefined;
    if (typeof harness?.tool !== 'string' || typeof harness.commit !== 'string') continue;
    const dir = `${harness.tool}/${harness.commit}`;
    const pair = `${String(harness.installed_sha256)} ${String(harness.tarball_sha256)}`;
    recordedBy.set(dir, (recordedBy.get(dir) ?? new Set()).add(pair));
    if (typeof harness.version === 'string') versionDir.set(dir, `${harness.tool}/${harness.version}`);
  }
  const used = new Map<string, RecordedHarness>();
  const disagreeing: Issue[] = [];
  for (const [dir, pairs] of recordedBy) {
    const [installed = '', tarball = ''] = [...pairs][0]?.split(' ') ?? [];
    if (pairs.size > 1) {
      disagreeing.push({ path: `${HARNESS_CACHE}/${dir}/`, message: 'is recorded by the runs with different digests' });
    } else if (!/^[0-9a-f]{64}$/.test(installed) || !/^[0-9a-f]{64}$/.test(tarball)) {
      disagreeing.push({ path: `${HARNESS_CACHE}/${dir}/`, message: 'is recorded by a run without its digests' });
    } else used.set(dir, { installed_sha256: installed, tarball_sha256: tarball });
  }
  if (disagreeing.length > 0) return fail(disagreeing);
  if (used.size === 0) return ok(undefined);
  const cacheRoot = join(root, HARNESS_CACHE);
  const files: string[] = [];
  const missing: string[] = [];
  const issues: Issue[] = [];
  for (const [recordedDir, recorded] of [...used].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const dir = cachedAt(cacheRoot, recordedDir, versionDir.get(recordedDir));
    const full = join(cacheRoot, dir);
    let tarball: unknown;
    try {
      tarball = (JSON.parse(readFileSync(join(full, 'harness.json'), 'utf8')) as { tarball?: unknown }).tarball;
    } catch {
      tarball = undefined;
    }
    const own = ['harness.json', 'installed.tgz', ...(typeof tarball === 'string' ? [basename(tarball)] : [])];
    if (typeof tarball !== 'string' || !own.every((name) => existsSync(join(full, name)))) {
      missing.push(`${HARNESS_CACHE}/${dir}/`);
      continue;
    }
    const checks: [string, unknown][] = [
      ['installed.tgz', recorded.installed_sha256],
      [basename(tarball), recorded.tarball_sha256],
    ];
    for (const [name, digest] of checks) {
      if (sha256Of(join(full, name)) !== digest) {
        issues.push({
          path: `${HARNESS_CACHE}/${dir}/${name}`,
          message: 'is not what the runs installed: its digest differs from the one they recorded',
        });
      }
    }
    files.push(...own.map((name) => `${dir}/${name}`));
  }
  if (issues.length > 0) return fail(issues);
  if (files.length === 0) return ok({ artifacts: 0, missing });
  const tar = await process.run('tar', [...REPRODUCIBLE, '-cf', partial, '-C', cacheRoot, ...files.sort()]);
  const archive = relative(root, partial.slice(0, -'.partial'.length));
  if (tar.code !== 0) return fail([{ path: archive, message: `tar failed: ${tar.stderr.trim()}` }]);
  return ok({ archive, sha256: sha256Of(partial), artifacts: used.size - missing.length, missing });
}

/**
 * Where the cache holds the artifact a run recorded as `<tool>/<commit>`: there, or, for a registry tool cached by its
 * version (task-071), `<tool>/<version>` when its record names the same commit. Otherwise the recorded place, which is
 * then reported missing.
 */
function cachedAt(cacheRoot: string, recordedDir: string, byVersion: string | undefined): string {
  if (existsSync(join(cacheRoot, recordedDir)) || byVersion === undefined) return recordedDir;
  try {
    const record = JSON.parse(readFileSync(join(cacheRoot, byVersion, 'harness.json'), 'utf8')) as { commit?: unknown };
    return record.commit === recordedDir.slice(recordedDir.indexOf('/') + 1) ? byVersion : recordedDir;
  } catch {
    return recordedDir;
  }
}

function sha256Of(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/** Whether `path` is there, a link that leads nowhere included (`existsSync` follows links). */
function present(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/** Replace `file` by `text` through a file beside it, renamed into place: whole, or not at all. */
function replaceFile(file: string, text: string): Result<true> {
  const next = `${file}.next`;
  try {
    writeFileSync(next, text);
    renameSync(next, file);
    return ok(true);
  } catch (error) {
    try {
      rmSync(next, { recursive: true, force: true });
    } catch {
      // Nothing more can be done for a file beside the record: the failure is reported below.
    }
    return fail([{ path: file, message: (error as Error).message }]);
  }
}

