import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { gitCli, systemProcess } from '../../../src/core/index.js';
import { readStoredRun } from '../../../src/results/index.js';
import { rebuildSnapshots } from '../../../src/scoring/index.js';
import { CANCEL, storedRun } from '../../support/score-fixture.js';
import { tempDir } from '../../support/scenario-fixture.js';

const git = gitCli(systemProcess);

/** Every file under `directory` but `.git/`, with its bytes, as `path: base64`. */
function contents(directory: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (name === '.git' && dir === directory) continue;
      if (statSync(path).isDirectory()) walk(path);
      else out[relative(directory, path)] = readFileSync(path).toString('base64');
    }
  };
  walk(directory);
  return out;
}

async function rebuild(fixture: Awaited<ReturnType<typeof storedRun>>) {
  const run = readStoredRun(fixture.runDir);
  if (!run.ok) throw new Error(JSON.stringify(run.issues));
  return rebuildSnapshots({
    scenario: fixture.scenario,
    run: run.value,
    runDir: fixture.runDir,
    git,
    workDir: tempDir('bench-rebuild-'),
  });
}

describe('rebuildSnapshots (task-027, REQ-SCO-01)', () => {
  it("rebuilds every step's snapshot from the seed, the setup patch and the step patches, binary files included", async () => {
    const binary = Buffer.from([0, 1, 2, 255, 254, 0, 10]);
    const fixture = await storedRun({
      setup: { 'CLAUDE.md': 'The manual.\n', '.wingfoil/dna.yaml': 'x: 1\n' },
      steps: [
        { ...CANCEL, 'assets/logo.bin': binary },
        { 'README.md': null, 'src/notes.md': 'n\n' },
      ],
    });

    const result = await rebuild(fixture);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.value.keys()]).toEqual([1, 2]);
    // The last one is the run's own workspace, byte for byte, without its history.
    expect(contents(result.value.get(2) ?? '')).toEqual(contents(fixture.workspace));
    expect(readFileSync(join(result.value.get(1) ?? '', 'assets', 'logo.bin'))).toEqual(binary);
    expect(readFileSync(join(result.value.get(1) ?? '', 'README.md'), 'utf8')).toBeTruthy();
  });

  it('rebuilds a step that changed nothing, and a setup that changed nothing', async () => {
    const fixture = await storedRun({ setup: {}, steps: [{}, CANCEL] });
    const result = await rebuild(fixture);
    expect(result.ok && [...result.value.keys()]).toEqual([1, 2]);
  });

  it('rebuilds only the steps a run reached', async () => {
    const fixture = await storedRun({ steps: [CANCEL] });
    const result = await rebuild(fixture);
    expect(result.ok && [...result.value.keys()]).toEqual([1]);
  });

  it('refuses a snapshot that does not rebuild to the tree the run recorded', async () => {
    const fixture = await storedRun({ steps: [CANCEL, {}] });
    const file = join(fixture.runDir, 'run.json');
    const record = JSON.parse(readFileSync(file, 'utf8')) as { steps: { tree: string }[] };
    record.steps[1] = { ...record.steps[1], tree: 'f'.repeat(40) } as { tree: string };
    writeFileSync(file, JSON.stringify(record));

    expect(await rebuild(fixture)).toEqual({
      ok: false,
      issues: [{ path: 'step 02', message: 'the rebuilt snapshot differs from the one the run recorded' }],
    });
  });

  it('refuses a patch that does not apply, naming the step', async () => {
    const fixture = await storedRun({ steps: [CANCEL] });
    writeFileSync(join(fixture.runDir, 'steps', '01', 'diff.patch'), 'diff --git a/x b/x\nnonsense\n');
    const result = await rebuild(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe('step 01');
  });

  it("names the setup when its patch is missing from the run's results", async () => {
    const fixture = await storedRun({ steps: [CANCEL] });
    rmSync(join(fixture.runDir, 'setup', 'diff.patch'));
    expect(await rebuild(fixture)).toEqual({
      ok: false,
      issues: [{ path: 'setup', message: `${join(fixture.runDir, 'setup', 'diff.patch')} is missing` }],
    });
  });

  it('refuses a run stored before runs recorded their trees', async () => {
    const fixture = await storedRun({ steps: [CANCEL] });
    const file = join(fixture.runDir, 'run.json');
    const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(file, JSON.stringify({ ...record, setup: { duration_ms: 1 } }));

    expect(await rebuild(fixture)).toEqual({
      ok: false,
      issues: [
        {
          path: 'run.json',
          message: 'was stored before runs recorded what their snapshots are rebuilt from (task-027)',
        },
      ],
    });
  });

  it('refuses a run of other content than the scenario version now holds', async () => {
    const fixture = await storedRun({ steps: [CANCEL] });
    const file = join(fixture.runDir, 'run.json');
    const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(file, JSON.stringify({ ...record, scenario_hash: 'sha256:other' }));

    expect(await rebuild(fixture)).toEqual({
      ok: false,
      issues: [
        {
          path: 'run.json.scenario_hash',
          message: `is sha256:other, and T3@1.0 now hashes to ${fixture.scenario.hash}: the seed is not the one the run started from`,
        },
      ],
    });
  });
});
