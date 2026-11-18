import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { EXECUTION } from '../../support/score-fixture.js';
import { benchSite, sha256Of, siteExecution } from '../../support/site-fixture.js';

const ARCHIVE = join('releases', 'abcdef012345-1', 'transcripts.tar.gz');
const RUN = (id: string, arm: string) => join('runs', `${id}@1.0`, arm, 'fake-model', 'r1');

/** The execution of the site fixture with two steps' transcripts on disk. */
async function withTranscripts(text = '{"type":"result","result":"done"}\n') {
  const fixture = await siteExecution();
  for (const [id, arm] of [
    ['TC', 'baseline'],
    ['TD', 'wingfoil'],
  ] as const) {
    const dir = join(fixture.executionDir, RUN(id, arm), 'steps', '01');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'transcript.jsonl'), text);
  }
  return fixture;
}

describe('bench transcripts pack (REQ-RES-06 as amended in 1.22, task-047)', () => {
  it('packs the transcripts into one reproducible archive, records it in their runs, and prints the release command', async () => {
    const { root, executionDir } = await withTranscripts();
    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);

    const archive = join(root, ARCHIVE);
    const sha = sha256Of(archive);
    expect(execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' })).toBe(
      'runs/TC@1.0/baseline/fake-model/r1/steps/01/transcript.jsonl\n' +
        'runs/TD@1.0/wingfoil/fake-model/r1/steps/01/transcript.jsonl\n',
    );
    expect(packed.stdout).toContain(`transcripts: ${ARCHIVE} (2 transcripts, sha256:${sha})\n`);
    expect(packed.stdout).toContain('4 runs have no transcript on disk');
    expect(packed.stdout).toContain(
      `gh release create abcdef012345-1 ${ARCHIVE} --title "Transcripts of abcdef012345/1"`,
    );

    const record = (id: string, arm: string) =>
      (JSON.parse(readFileSync(join(executionDir, RUN(id, arm), 'run.json'), 'utf8')) as Record<string, unknown>)
        .transcripts;
    expect(record('TC', 'baseline')).toEqual({
      release: 'abcdef012345-1',
      asset: 'transcripts.tar.gz',
      sha256: sha,
    });
    expect(record('TC', 'wingfoil')).toBeUndefined();

    // The same transcripts give the same bytes
    rmSync(archive);
    expect((await benchSite(root, 'transcripts', 'pack', EXECUTION)).code).toBe(0);
    expect(sha256Of(archive)).toBe(sha);

    // And a run whose transcript is gone says where it is
    rmSync(join(executionDir, RUN('TC', 'baseline'), 'steps', '01', 'transcript.jsonl'));
    const shown = await benchSite(root, 'run', 'show', join(executionDir, RUN('TC', 'baseline')));
    expect(shown.stdout).toContain(
      'transcript not on disk; in release abcdef012345-1, asset transcripts.tar.gz',
    );
  }, 120_000);

  it('refuses a transcript that holds a secret, naming where and never the value', async () => {
    const { root } = await withTranscripts('{"note":"sk-ant-api03-SECRETVALUE"}\n');
    const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain(
      'runs/TC@1.0/baseline/fake-model/r1/steps/01/transcript.jsonl:1: holds what looks like an Anthropic key or token',
    );
    expect(refused.stderr).not.toContain('SECRETVALUE');
    expect(existsSync(join(root, ARCHIVE))).toBe(false);
  }, 120_000);

  it("refuses a transcript that holds the agent token's value", async () => {
    const { root } = await withTranscripts('{"note":"the-token-value-1234"}\n');
    const tokenFile = join(root, 'token.txt');
    writeFileSync(tokenFile, 'the-token-value-1234\n');
    process.env.BENCH_AGENT_TOKEN_FILE = tokenFile;
    try {
      const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
      expect(refused.code).toBe(1);
      expect(refused.stderr).toContain(':1: holds the agent token (BENCH_AGENT_TOKEN_FILE)');
      expect(refused.stderr).not.toContain('the-token-value-1234');
    } finally {
      delete process.env.BENCH_AGENT_TOKEN_FILE;
    }
  }, 120_000);

  it('writes nothing when a run record cannot be read, and drops the record of a run that has no transcript left', async () => {
    const { root, executionDir } = await withTranscripts();
    const broken = join(executionDir, RUN('TF', 'wingfoil'), 'run.json');
    const kept = readFileSync(broken, 'utf8');
    writeFileSync(broken, '{');
    const before = readFileSync(join(executionDir, RUN('TC', 'baseline'), 'run.json'), 'utf8');
    const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('runs/TF@1.0/wingfoil/fake-model/r1/run.json: cannot be read');
    expect(existsSync(join(root, ARCHIVE))).toBe(false);
    expect(readFileSync(join(executionDir, RUN('TC', 'baseline'), 'run.json'), 'utf8')).toBe(before);
    writeFileSync(broken, kept);

    expect((await benchSite(root, 'transcripts', 'pack', EXECUTION)).code).toBe(0);
    rmSync(join(executionDir, RUN('TD', 'wingfoil'), 'steps', '01', 'transcript.jsonl'));
    expect((await benchSite(root, 'transcripts', 'pack', EXECUTION)).code).toBe(0);
    const record = JSON.parse(readFileSync(join(executionDir, RUN('TD', 'wingfoil'), 'run.json'), 'utf8')) as Record<string, unknown>;
    expect(record.transcripts).toBeUndefined();
    expect(readdirSync(join(root, 'releases', 'abcdef012345-1'))).toEqual(['transcripts.tar.gz']);
  }, 120_000);

  it('refuses a transcript that is a link, never packing what it points to', async () => {
    const { root, executionDir } = await withTranscripts();
    const file = join(executionDir, RUN('TC', 'baseline'), 'steps', '01', 'transcript.jsonl');
    rmSync(file);
    symlinkSync('/etc/hostname', file);
    const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    // ... and one that leads nowhere
    rmSync(file);
    symlinkSync('/nonexistent', file);
    expect((await benchSite(root, 'transcripts', 'pack', EXECUTION)).stderr).toContain('is not a regular file');
    expect(refused.stderr).toContain('runs/TC@1.0/baseline/fake-model/r1/steps/01/transcript.jsonl: is not a regular file');
    expect(existsSync(join(root, ARCHIVE))).toBe(false);
  }, 120_000);

  it('changes nothing when a record cannot be written: no archive, no partial file, every record as it was', async () => {
    const { root, executionDir } = await withTranscripts();
    const first = join(executionDir, RUN('TC', 'baseline'), 'run.json');
    const before = readFileSync(first, 'utf8');
    // Its directory read-only: no new file can be written there, as a full disk would refuse one
    const locked = join(executionDir, RUN('TD', 'wingfoil'));
    const lockedRecord = readFileSync(join(locked, 'run.json'), 'utf8');
    chmodSync(locked, 0o555);
    try {
      const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
      expect(refused.code).toBe(1);
      expect(refused.stderr).toContain('runs/TD@1.0/wingfoil/fake-model/r1/run.json: cannot be written');
    } finally {
      chmodSync(locked, 0o755);
    }
    expect(readFileSync(join(locked, 'run.json'), 'utf8')).toBe(lockedRecord);
    expect(readFileSync(first, 'utf8')).toBe(before);
    expect(existsSync(join(root, ARCHIVE))).toBe(false);
    expect(existsSync(join(root, 'releases'))).toBe(false);

    // With another release's assets already there, only this release's directory goes, theirs stay
    mkdirSync(join(root, 'releases', 'other-1'), { recursive: true });
    writeFileSync(join(root, 'releases', 'other-1', 'transcripts.tar.gz'), 'theirs');
    chmodSync(locked, 0o555);
    try {
      expect((await benchSite(root, 'transcripts', 'pack', EXECUTION)).code).toBe(1);
    } finally {
      chmodSync(locked, 0o755);
    }
    expect(readdirSync(join(root, 'releases'))).toEqual(['other-1']);
  }, 120_000);

  it('refuses what it cannot pack', async () => {
    const { root } = await siteExecution();
    expect((await benchSite(root, 'transcripts', 'pack')).code).toBe(2);
    expect((await benchSite(root, 'transcripts', 'pack', 'dry-runs/1')).code).toBe(1);
    const none = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(none.code).toBe(1);
    expect(none.stderr).toContain('results/abcdef012345/1: has no transcript on disk to pack');
  }, 120_000);
});

describe('the harness artifacts beside the transcripts (REQ-CLI-11 as amended, REQ-FMT-12, task-064)', () => {
  const sha = (text: string) => createHash('sha256').update(text).digest('hex');
  const COMMIT = '3df305ea198d7e2ca0da73bfb12b14af865e9922';
  const HARNESSES = join('releases', 'abcdef012345-1', 'harnesses.tar.gz');

  /** The wingfoil runs record the harness they installed; the cache holds its artifacts. */
  async function withHarness(cached: boolean) {
    const fixture = await withTranscripts();
    for (const id of ['TC', 'TD']) {
      const file = join(fixture.executionDir, RUN(id, 'wingfoil'), 'run.json');
      if (!existsSync(file)) continue;
      const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      record.harness = {
        tool: 'wingfoil',
        commit: COMMIT,
        tarball_sha256: sha('package, its LICENSE inside'),
        installed_sha256: sha('installed'),
        artifact_sha256: sha('installed'),
      };
      writeFileSync(file, `${JSON.stringify(record, undefined, 2)}\n`);
    }
    if (cached) {
      const cache = join(fixture.root, '.cache', 'harnesses', 'wingfoil', COMMIT);
      mkdirSync(cache, { recursive: true });
      writeFileSync(join(cache, 'installed.tgz'), 'installed');
      writeFileSync(join(cache, 'wingfoil-0.2.2.tgz'), 'package, its LICENSE inside');
      writeFileSync(join(cache, 'harness.json'), `${JSON.stringify({ tarball: 'wingfoil-0.2.2.tgz' })}\n`);
    }
    return fixture;
  }

  it('packs the artifacts the runs installed into a second reproducible asset, and the command attaches both', async () => {
    const { root } = await withHarness(true);
    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    const archive = join(root, HARNESSES);
    expect(execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' })).toBe(
      `wingfoil/${COMMIT}/harness.json\nwingfoil/${COMMIT}/installed.tgz\nwingfoil/${COMMIT}/wingfoil-0.2.2.tgz\n`,
    );
    const sha = sha256Of(archive);
    expect(packed.stdout).toContain(`harnesses: ${HARNESSES} (1 harness artifact, sha256:${sha})\n`);
    expect(packed.stdout).toContain(`gh release create abcdef012345-1 ${ARCHIVE} ${HARNESSES} --title`);
    rmSync(archive);
    expect((await benchSite(root, 'transcripts', 'pack', EXECUTION)).code).toBe(0);
    expect(sha256Of(archive)).toBe(sha);
  }, 120_000);

  it('packs a registry harness from its cache by version, its commit being its tarball digest (task-071)', async () => {
    const fixture = await withTranscripts();
    const tarball = sha('npm tarball');
    for (const id of ['TC', 'TD']) {
      const file = join(fixture.executionDir, RUN(id, 'wingfoil'), 'run.json');
      if (!existsSync(file)) continue;
      const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      record.harness = {
        tool: 'openspec',
        version: '1.14.0',
        commit: tarball,
        tarball_sha256: tarball,
        installed_sha256: sha('installed prefix'),
        artifact_sha256: sha('installed prefix'),
      };
      writeFileSync(file, `${JSON.stringify(record, undefined, 2)}\n`);
    }
    const cache = join(fixture.root, '.cache', 'harnesses', 'openspec', '1.14.0');
    mkdirSync(cache, { recursive: true });
    writeFileSync(join(cache, 'installed.tgz'), 'installed prefix');
    writeFileSync(join(cache, 'fission-ai-openspec-1.14.0.tgz'), 'npm tarball');
    writeFileSync(
      join(cache, 'harness.json'),
      `${JSON.stringify({ tool: 'openspec', commit: tarball, version: '1.14.0', tarball: 'fission-ai-openspec-1.14.0.tgz' })}\n`,
    );
    const packed = await benchSite(fixture.root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(execFileSync('tar', ['-tzf', join(fixture.root, HARNESSES)], { encoding: 'utf8' })).toBe(
      'openspec/1.14.0/fission-ai-openspec-1.14.0.tgz\nopenspec/1.14.0/harness.json\nopenspec/1.14.0/installed.tgz\n',
    );
    expect(packed.stdout).toContain('(1 harness artifact, sha256:');
  }, 120_000);

  it('refuses a cache that is not what the runs installed, naming the file, and writes nothing', async () => {
    const { root, executionDir } = await withHarness(true);
    const before = readFileSync(join(executionDir, RUN('TC', 'baseline'), 'run.json'), 'utf8');
    writeFileSync(join(root, '.cache', 'harnesses', 'wingfoil', COMMIT, 'installed.tgz'), 'rebuilt to other bytes');
    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code).toBe(1);
    expect(packed.stderr).toBe(
      `.cache/harnesses/wingfoil/${COMMIT}/installed.tgz: is not what the runs installed: ` +
        'its digest differs from the one they recorded\n',
    );
    expect(existsSync(join(root, 'releases'))).toBe(false);
    expect(readFileSync(join(executionDir, RUN('TC', 'baseline'), 'run.json'), 'utf8')).toBe(before);
  }, 120_000);

  it('refuses runs that recorded one harness with different digests, or without them', async () => {
    const cases: [string[], (record: Record<string, string>) => Record<string, string>, string][] = [
      [['TD'], (record) => ({ ...record, installed_sha256: sha('another build') }), 'the runs with different digests'],
      [['TC', 'TD'], (record) => ({ ...record, tarball_sha256: 'none' }), 'a run without its digests'],
    ];
    for (const [ids, change, reason] of cases) {
      const { root, executionDir } = await withHarness(true);
      for (const id of ids) {
        const file = join(executionDir, RUN(id, 'wingfoil'), 'run.json');
        const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
        record.harness = change(record.harness as Record<string, string>);
        writeFileSync(file, `${JSON.stringify(record, undefined, 2)}\n`);
      }
      const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
      expect(packed.code).toBe(1);
      expect(packed.stderr).toBe(`.cache/harnesses/wingfoil/${COMMIT}/: is recorded by ${reason}\n`);
      expect(existsSync(join(root, 'releases'))).toBe(false);
    }
  }, 120_000);

  it('removes an earlier pack\'s harness asset when the execution now packs none', async () => {
    const { root } = await withHarness(true);
    expect((await benchSite(root, 'transcripts', 'pack', EXECUTION)).code).toBe(0);
    expect(existsSync(join(root, HARNESSES))).toBe(true);
    rmSync(join(root, '.cache'), { recursive: true });
    expect((await benchSite(root, 'transcripts', 'pack', EXECUTION)).code).toBe(0);
    expect(existsSync(join(root, HARNESSES))).toBe(false);
  }, 120_000);

  it('names an artifact missing from the cache, and packs no empty asset', async () => {
    const { root } = await withHarness(false);
    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(packed.stdout).toContain(
      `harness artifact not in the cache: .cache/harnesses/wingfoil/${COMMIT}/ (rebuild it with a campaign run)\n`,
    );
    expect(existsSync(join(root, HARNESSES))).toBe(false);
    expect(packed.stdout).toContain(`gh release create abcdef012345-1 ${ARCHIVE} --title`);
  }, 120_000);

  it('packs no second asset for an execution without harness runs', async () => {
    const { root } = await withTranscripts();
    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.stdout).not.toContain('harness');
    expect(existsSync(join(root, HARNESSES))).toBe(false);
  }, 120_000);
});

describe("bench transcripts pack and earlier attempts (REQ-CLI-11 as amended in 1.26, task-080)", () => {
  it("packs an earlier attempt's transcripts beside the run's own", async () => {
    const { root, executionDir } = await withTranscripts();
    const dir = join(executionDir, RUN('TC', 'baseline'), 'attempts', '1', 'steps', '01');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'transcript.jsonl'), '{"type":"result","result":"earlier"}\n');

    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(execFileSync('tar', ['-tzf', join(root, ARCHIVE)], { encoding: 'utf8' })).toBe(
      'runs/TC@1.0/baseline/fake-model/r1/attempts/1/steps/01/transcript.jsonl\n' +
        'runs/TC@1.0/baseline/fake-model/r1/steps/01/transcript.jsonl\n' +
        'runs/TD@1.0/wingfoil/fake-model/r1/steps/01/transcript.jsonl\n',
    );
  }, 120_000);
});

describe("bench transcripts pack and the review loops' transcripts (REQ-CLI-11 as amended in 1.58, task-160)", () => {
  /** A review loop of `rounds` under the run, each round's sessions written unless listed in `absent`. */
  function reviewLoop(
    executionDir: string,
    run: string,
    rounds: readonly { readonly n: number; readonly fixed: boolean }[],
    absent: readonly string[] = [],
    text = '{"type":"result","result":"reviewed"}\n',
  ): void {
    const review = join(executionDir, run, 'review');
    mkdirSync(review, { recursive: true });
    writeFileSync(join(review, 'loop.json'), JSON.stringify({ outcome: 'clean', rounds }));
    for (const { n, fixed } of rounds) {
      mkdirSync(join(review, String(n)), { recursive: true });
      for (const name of ['reviewer.jsonl', ...(fixed ? ['fixer.jsonl'] : [])]) {
        if (!absent.includes(`${n}/${name}`)) writeFileSync(join(review, String(n), name), text);
      }
    }
  }

  it("packs every round's reviewer and fixer under the run's path, and counts them apart", async () => {
    const { root, executionDir } = await withTranscripts();
    reviewLoop(executionDir, RUN('TC', 'baseline'), [
      { n: 1, fixed: true },
      { n: 2, fixed: false },
    ]);

    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    const base = 'runs/TC@1.0/baseline/fake-model/r1';
    expect(execFileSync('tar', ['-tzf', join(root, ARCHIVE)], { encoding: 'utf8' })).toBe(
      `${base}/review/1/fixer.jsonl\n${base}/review/1/reviewer.jsonl\n${base}/review/2/reviewer.jsonl\n` +
        `${base}/steps/01/transcript.jsonl\nruns/TD@1.0/wingfoil/fake-model/r1/steps/01/transcript.jsonl\n`,
    );
    expect(packed.stdout).toContain(`(5 transcripts, sha256:${sha256Of(join(root, ARCHIVE))})\n`);
    expect(packed.stdout).toContain('2 of the steps, 3 of the review loops, 0 of the configuring sessions\n');
  }, 120_000);

  it("packs an earlier attempt's review loop, and a fixer's session its round does not mark as fixed", async () => {
    const { root, executionDir } = await withTranscripts();
    const attempt = join(RUN('TC', 'baseline'), 'attempts', '1');
    reviewLoop(executionDir, attempt, [{ n: 1, fixed: false }]);
    writeFileSync(join(executionDir, attempt, 'review', '1', 'fixer.jsonl'), '{"type":"result","result":"failed"}\n');

    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    const listed = execFileSync('tar', ['-tzf', join(root, ARCHIVE)], { encoding: 'utf8' });
    expect(listed).toContain('runs/TC@1.0/baseline/fake-model/r1/attempts/1/review/1/reviewer.jsonl\n');
    expect(listed).toContain('runs/TC@1.0/baseline/fake-model/r1/attempts/1/review/1/fixer.jsonl\n');
  }, 120_000);

  it('refuses a review transcript that holds a secret or is a link, and changes nothing', async () => {
    const secret = await withTranscripts();
    reviewLoop(
      secret.executionDir,
      RUN('TC', 'baseline'),
      [{ n: 1, fixed: false }],
      [],
      '{"note":"sk-ant-api03-SECRETVALUE"}\n',
    );
    const refused = await benchSite(secret.root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain(
      'runs/TC@1.0/baseline/fake-model/r1/review/1/reviewer.jsonl:1: holds what looks like an Anthropic key or token',
    );
    expect(refused.stderr).not.toContain('SECRETVALUE');
    expect(existsSync(join(secret.root, ARCHIVE))).toBe(false);

    const link = await withTranscripts();
    reviewLoop(link.executionDir, RUN('TC', 'baseline'), [{ n: 1, fixed: false }], ['1/reviewer.jsonl']);
    symlinkSync(
      join(link.root, 'token.txt'),
      join(link.executionDir, RUN('TC', 'baseline'), 'review', '1', 'reviewer.jsonl'),
    );
    const linked = await benchSite(link.root, 'transcripts', 'pack', EXECUTION);
    expect(linked.code).toBe(1);
    expect(linked.stderr).toContain('review/1/reviewer.jsonl: is not a regular file');
    expect(existsSync(join(link.root, ARCHIVE))).toBe(false);
  }, 120_000);

  it('names a review transcript the loop recorded and the disk no longer holds, and packs the others', async () => {
    const { root, executionDir } = await withTranscripts();
    reviewLoop(executionDir, RUN('TC', 'baseline'), [{ n: 1, fixed: true }], ['1/fixer.jsonl']);

    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(packed.stdout).toContain(
      'transcript not on this machine: results/abcdef012345/1/runs/TC@1.0/baseline/fake-model/r1/review/1/fixer.jsonl\n',
    );
    expect(packed.stdout).toContain('2 of the steps, 1 of the review loops, 0 of the configuring sessions\n');
  }, 120_000);

  it('refuses a loop record it cannot read, and changes nothing', async () => {
    const { root, executionDir } = await withTranscripts();
    reviewLoop(executionDir, RUN('TC', 'baseline'), [{ n: 1, fixed: false }]);
    writeFileSync(join(executionDir, RUN('TC', 'baseline'), 'review', 'loop.json'), '{ not json');

    const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('runs/TC@1.0/baseline/fake-model/r1/review/loop.json: cannot be read');
    expect(existsSync(join(root, ARCHIVE))).toBe(false);
  }, 120_000);

  it('expects a fixer only where its round is marked fixed, and names a missing reviewer', async () => {
    const { root, executionDir } = await withTranscripts();
    reviewLoop(
      executionDir,
      RUN('TC', 'baseline'),
      [
        { n: 1, fixed: false },
        { n: 2, fixed: false },
      ],
      ['2/reviewer.jsonl'],
    );

    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(packed.stdout).toContain(
      'transcript not on this machine: results/abcdef012345/1/runs/TC@1.0/baseline/fake-model/r1/review/2/reviewer.jsonl\n',
    );
    expect(packed.stdout).not.toContain('fixer.jsonl');
  }, 120_000);

  it('records the asset in a run that keeps only its review transcripts, and says its steps are gone', async () => {
    const { root, executionDir } = await withTranscripts();
    reviewLoop(executionDir, RUN('TC', 'wingfoil'), [{ n: 1, fixed: false }]);

    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    const record = JSON.parse(readFileSync(join(executionDir, RUN('TC', 'wingfoil'), 'run.json'), 'utf8')) as {
      transcripts?: { release?: string };
    };
    expect(record.transcripts?.release).toBe('abcdef012345-1');
    expect(packed.stdout).toContain(
      'no step transcript on this machine: results/abcdef012345/1/runs/TC@1.0/wingfoil/fake-model/r1\n',
    );
  }, 120_000);

  it.each([
    ['rounds that are not a list', { rounds: 'none' }],
    ['a round number that is a path', { rounds: [{ n: '../..', fixed: false }] }],
    ['a round with no number', { rounds: [null] }],
  ])('refuses a loop record with %s', async (_name, loop) => {
    const { root, executionDir } = await withTranscripts();
    reviewLoop(executionDir, RUN('TC', 'baseline'), [{ n: 1, fixed: false }]);
    writeFileSync(join(executionDir, RUN('TC', 'baseline'), 'review', 'loop.json'), JSON.stringify(loop));

    const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('review/loop.json: cannot be read');
    expect(existsSync(join(root, ARCHIVE))).toBe(false);
  }, 120_000);

  it('refuses a review path that is a file, and leaves out a folder that is not a round', async () => {
    const file = await withTranscripts();
    writeFileSync(join(file.executionDir, RUN('TC', 'baseline'), 'review'), 'not a folder\n');
    const refused = await benchSite(file.root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('runs/TC@1.0/baseline/fake-model/r1/review: is not a directory');

    const stray = await withTranscripts();
    reviewLoop(stray.executionDir, RUN('TC', 'baseline'), [{ n: 1, fixed: false }]);
    const notes = join(stray.executionDir, RUN('TC', 'baseline'), 'review', 'notes');
    mkdirSync(notes);
    writeFileSync(join(notes, 'reviewer.jsonl'), '{"type":"result"}\n');
    const packed = await benchSite(stray.root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(execFileSync('tar', ['-tzf', join(stray.root, ARCHIVE)], { encoding: 'utf8' })).not.toContain('review/notes');
  }, 120_000);

  it('refuses a transcript reached through a linked folder, whichever folder of its path is the link', async () => {
    const outside = (root: string) => {
      const dir = join(root, 'outside');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'reviewer.jsonl'), '{"type":"result"}\n');
      writeFileSync(join(dir, 'transcript.jsonl'), '{"type":"result"}\n');
      return dir;
    };
    const round = await withTranscripts();
    mkdirSync(join(round.executionDir, RUN('TC', 'baseline'), 'review'));
    symlinkSync(outside(round.root), join(round.executionDir, RUN('TC', 'baseline'), 'review', '1'));
    const roundLinked = await benchSite(round.root, 'transcripts', 'pack', EXECUTION);
    expect(roundLinked.code).toBe(1);
    expect(roundLinked.stderr).toContain('review/1/reviewer.jsonl: is not a regular file');
    expect(existsSync(join(round.root, ARCHIVE))).toBe(false);

    const review = await withTranscripts();
    symlinkSync(outside(review.root), join(review.executionDir, RUN('TC', 'baseline'), 'review'));
    const reviewLinked = await benchSite(review.root, 'transcripts', 'pack', EXECUTION);
    expect(reviewLinked.code).toBe(1);
    expect(reviewLinked.stderr).toContain('r1/review: is not a directory');

    const step = await withTranscripts();
    const steps = join(step.executionDir, RUN('TC', 'baseline'), 'steps');
    rmSync(join(steps, '01'), { recursive: true });
    symlinkSync(outside(step.root), join(steps, '01'));
    const stepLinked = await benchSite(step.root, 'transcripts', 'pack', EXECUTION);
    expect(stepLinked.code).toBe(1);
    expect(stepLinked.stderr).toContain('steps/01/transcript.jsonl: is not a regular file');
  }, 120_000);
});

describe("bench transcripts pack and the configuring sessions' transcripts (REQ-CLI-11 as amended in 1.50, task-160)", () => {
  const SESSION = (root: string, n: number) =>
    join(root, 'results', 'configuring', 'TC@1.0', 'wingfoil', String(n), 'transcript.jsonl');
  const ASSET = (n: number) => `configuring/TC@1.0/wingfoil/${n}/transcript.jsonl`;

  /** Marks the run as reading WingFoil's configuration of TC@1.0, of `records` sessions. */
  function readsConfiguration(executionDir: string, run: string, records: number): void {
    const file = join(executionDir, run, 'run.json');
    const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(file, `${JSON.stringify({ ...record, configured: { of: 'wingfoil', records, cost_eur: 0.07 } })}\n`);
  }

  function session(root: string, n: number, text = '{"type":"result","result":"configured"}\n'): void {
    mkdirSync(join(SESSION(root, n), '..'), { recursive: true });
    writeFileSync(SESSION(root, n), text);
  }

  it('packs each session once however many runs read it, and records the asset in those runs', async () => {
    const { root, executionDir } = await withTranscripts();
    readsConfiguration(executionDir, RUN('TC', 'baseline'), 2);
    // This run has no transcript of its own on disk: the configuration it read is what it holds.
    readsConfiguration(executionDir, RUN('TC', 'wingfoil'), 2);
    session(root, 1);
    session(root, 2);

    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(execFileSync('tar', ['-tzf', join(root, ARCHIVE)], { encoding: 'utf8' })).toBe(
      `${ASSET(1)}\n${ASSET(2)}\n` +
        'runs/TC@1.0/baseline/fake-model/r1/steps/01/transcript.jsonl\n' +
        'runs/TD@1.0/wingfoil/fake-model/r1/steps/01/transcript.jsonl\n',
    );
    expect(packed.stdout).toContain('2 of the steps, 0 of the review loops, 2 of the configuring sessions\n');
    const record = JSON.parse(
      readFileSync(join(executionDir, RUN('TC', 'wingfoil'), 'run.json'), 'utf8'),
    ) as { transcripts?: unknown };
    expect(record.transcripts).toEqual({
      release: 'abcdef012345-1',
      asset: 'transcripts.tar.gz',
      sha256: sha256Of(join(root, ARCHIVE)),
    });
    expect(packed.stdout).toContain('3 runs have no transcript on disk');

    // The same transcripts give the same bytes
    const sha = sha256Of(join(root, ARCHIVE));
    rmSync(join(root, ARCHIVE));
    expect((await benchSite(root, 'transcripts', 'pack', EXECUTION)).code).toBe(0);
    expect(sha256Of(join(root, ARCHIVE))).toBe(sha);
  }, 120_000);

  it('leaves out a configuration no run of the execution read', async () => {
    const { root } = await withTranscripts();
    session(root, 1);
    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(execFileSync('tar', ['-tzf', join(root, ARCHIVE)], { encoding: 'utf8' })).not.toContain('configuring/');
  }, 120_000);

  it('names a session missing from this machine, and packs the others', async () => {
    const { root, executionDir } = await withTranscripts();
    readsConfiguration(executionDir, RUN('TC', 'baseline'), 2);
    session(root, 1);

    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(packed.stdout).toContain(
      'transcript not on this machine: results/configuring/TC@1.0/wingfoil/2/transcript.jsonl\n',
    );
    expect(packed.stdout).toContain('2 of the steps, 0 of the review loops, 1 of the configuring sessions\n');
  }, 120_000);

  it('refuses a session that holds a secret or is a link, naming its path in the asset', async () => {
    const secret = await withTranscripts();
    readsConfiguration(secret.executionDir, RUN('TC', 'baseline'), 1);
    session(secret.root, 1, '{"note":"sk-ant-api03-SECRETVALUE"}\n');
    const refused = await benchSite(secret.root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain(`${ASSET(1)}:1: holds what looks like an Anthropic key or token`);
    expect(refused.stderr).not.toContain('SECRETVALUE');
    expect(existsSync(join(secret.root, ARCHIVE))).toBe(false);

    const link = await withTranscripts();
    readsConfiguration(link.executionDir, RUN('TC', 'baseline'), 1);
    mkdirSync(join(SESSION(link.root, 1), '..'), { recursive: true });
    symlinkSync(join(link.root, 'token.txt'), SESSION(link.root, 1));
    const linked = await benchSite(link.root, 'transcripts', 'pack', EXECUTION);
    expect(linked.code).toBe(1);
    expect(linked.stderr).toContain(`${ASSET(1)}: is not a regular file`);
  }, 120_000);

  it('refuses a configuration record that does not say which sessions it read', async () => {
    const { root, executionDir } = await withTranscripts();
    const file = join(executionDir, RUN('TC', 'baseline'), 'run.json');
    const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(file, JSON.stringify({ ...record, configured: { of: '../../elsewhere', records: 1 } }));
    const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('runs/TC@1.0/baseline/fake-model/r1/run.json: its configured record');
    expect(existsSync(join(root, ARCHIVE))).toBe(false);
  }, 120_000);

  it('says which run keeps no step transcript when the configuration it read is all it holds', async () => {
    const { root, executionDir } = await withTranscripts();
    readsConfiguration(executionDir, RUN('TC', 'wingfoil'), 1);
    session(root, 1);
    const packed = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(packed.code, packed.stderr).toBe(0);
    expect(packed.stdout).toContain(
      'no step transcript on this machine: results/abcdef012345/1/runs/TC@1.0/wingfoil/fake-model/r1\n',
    );
    expect(packed.stdout).not.toContain(
      'no step transcript on this machine: results/abcdef012345/1/runs/TC@1.0/baseline/fake-model/r1\n',
    );
  }, 120_000);

  it.each([
    ['no sessions', { of: 'wingfoil', records: 0 }],
    ['a count that is not a number', { of: 'wingfoil', records: '1' }],
    ['nothing at all', null],
  ])('refuses a configured record with %s', async (_name, configured) => {
    const { root, executionDir } = await withTranscripts();
    const file = join(executionDir, RUN('TC', 'baseline'), 'run.json');
    const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(file, JSON.stringify({ ...record, configured }));
    const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('runs/TC@1.0/baseline/fake-model/r1/run.json: its configured record');
    expect(existsSync(join(root, ARCHIVE))).toBe(false);
  }, 120_000);

  it("refuses a session reached through a linked harness folder", async () => {
    const { root, executionDir } = await withTranscripts();
    readsConfiguration(executionDir, RUN('TC', 'baseline'), 1);
    const elsewhere = join(root, 'elsewhere', '1');
    mkdirSync(elsewhere, { recursive: true });
    writeFileSync(join(elsewhere, 'transcript.jsonl'), '{"type":"result"}\n');
    mkdirSync(join(root, 'results', 'configuring', 'TC@1.0'), { recursive: true });
    symlinkSync(join(root, 'elsewhere'), join(root, 'results', 'configuring', 'TC@1.0', 'wingfoil'));
    const refused = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain(`${ASSET(1)}: is not a regular file`);
    expect(existsSync(join(root, ARCHIVE))).toBe(false);
  }, 120_000);
});
