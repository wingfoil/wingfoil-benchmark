import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

  it('refuses what it cannot pack', async () => {
    const { root } = await siteExecution();
    expect((await benchSite(root, 'transcripts', 'pack')).code).toBe(2);
    expect((await benchSite(root, 'transcripts', 'pack', 'dry-runs/1')).code).toBe(1);
    const none = await benchSite(root, 'transcripts', 'pack', EXECUTION);
    expect(none.code).toBe(1);
    expect(none.stderr).toContain('results/abcdef012345/1: has no transcript on disk to pack');
  }, 120_000);
});
