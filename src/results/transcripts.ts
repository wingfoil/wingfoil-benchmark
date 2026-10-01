import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
}

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
      .filter((path) => existsSync(join(executionDir, path)));
    if (own.length === 0) runsWithout.push(run);
    else withTranscripts.push(run);
    paths.push(...own);
  }
  if (paths.length === 0) return fail([{ path: where, message: 'has no transcript on disk to pack' }]);

  const issues: Issue[] = [];
  for (const path of paths) {
    readFileSync(join(executionDir, path), 'utf8')
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
  for (const run of runs) {
    const file = join(executionDir, relativeRun(run), 'run.json');
    try {
      const record: unknown = JSON.parse(readFileSync(file, 'utf8'));
      if (record === null || typeof record !== 'object' || Array.isArray(record)) throw new Error('not an object');
      records.set(run, record as Record<string, unknown>);
    } catch (error) {
      issues.push({ path: `${relativeRun(run)}/run.json`, message: `cannot be read: ${(error as Error).message}` });
    }
  }
  if (issues.length > 0) return fail(issues);

  const relativeArchive = `${RELEASES}/${release}/${TRANSCRIPTS_ASSET}`;
  const archive = join(root, relativeArchive);
  mkdirSync(join(root, RELEASES, release), { recursive: true });
  // Written under another name and renamed once whole: a failed tar leaves no archive behind.
  const partial = `${archive}.partial`;
  const tar = await options.process.run('tar', [...REPRODUCIBLE, '-cf', partial, '-C', executionDir, ...[...paths].sort()]);
  if (tar.code !== 0) {
    rmSync(partial, { force: true });
    return fail([{ path: relativeArchive, message: `tar failed: ${tar.stderr.trim()}` }]);
  }
  renameSync(partial, archive);
  const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');

  for (const [run, record] of records) {
    const holds = withTranscripts.includes(run);
    const stale = (record.transcripts as { release?: unknown } | undefined)?.release === release;
    if (!holds && !stale) continue;
    if (holds) record.transcripts = { release, asset: TRANSCRIPTS_ASSET, sha256 };
    // A run whose transcripts are gone no longer points at this release's asset.
    else delete record.transcripts;
    writeFileSync(join(executionDir, relativeRun(run), 'run.json'), `${JSON.stringify(record, undefined, 2)}\n`);
  }
  return ok({ release, archive: relativeArchive, sha256, transcripts: paths.length, runsWithout });
}
