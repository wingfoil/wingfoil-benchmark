import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** A configuring session's record (REQ-RUN-20) with every field, its outcome `written`, for `files`. */
export function configuredRecord(
  files: Readonly<Record<string, string>>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    agent: { name: 'claude-code', version: '2.1.300' },
    model: 'claude-sonnet-5-5',
    prompt_sha256: 'a'.repeat(64),
    profile_sha256: 'b'.repeat(64),
    harness: { tool: 'wingfoil', version: 'v0.3.1', commit: 'c'.repeat(40) },
    base_arm_digest: 'cc009b5a52a9',
    rules_sha256: null,
    usage: {
      inputTokens: 10,
      outputTokens: 20,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      costUsd: 0.5,
      costEur: 0.45,
      turns: 3,
      durationMs: 60000,
    },
    cost_eur: 0.45,
    wall_time_s: 61,
    date: '2026-11-08T10:00:00Z',
    outcome: 'written',
    files: Object.entries(files)
      .map(([path, content]) => ({ path, sha256: sha256(content) }))
      .sort((a, b) => (a.path < b.path ? -1 : 1)),
    ...extra,
  };
}

/** A refused session's record: no files, its reason. */
export function refusedRecord(reason = "added 'src/helpers.ts', outside the configuration places") {
  const record = configuredRecord({});
  delete record.files;
  return { ...record, outcome: 'refused', reason };
}

/**
 * Write `arm`'s configuration into the scenario version `dir`: `arms/<arm>/` holding `files`, and `configured/`
 * holding `records` (default: one `written` record of the files) and the patch.
 */
export function writeConfiguration(
  dir: string,
  arm: string,
  files: Readonly<Record<string, string>>,
  records: readonly Record<string, unknown>[] = [configuredRecord(files)],
): void {
  for (const [path, content] of Object.entries(files)) {
    const file = join(dir, 'arms', arm, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  mkdirSync(join(dir, 'configured'), { recursive: true });
  writeFileSync(join(dir, 'configured', `${arm}.json`), `${JSON.stringify(records, null, 2)}\n`);
  if (records.some((record) => record.outcome === 'written')) {
    writeFileSync(join(dir, 'configured', `${arm}.patch`), 'diff --git a/x b/x\n');
  }
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
