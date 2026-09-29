import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { main } from '../../../src/cli/index.js';
import { repoPath } from '../../support/paths.js';
import {
  COMPLETE_FILES,
  completeScenarioYaml,
  tempDir,
  writeScenarioAt,
} from '../../support/scenario-fixture.js';

/** What a hold-out file holds: it must never reach an output (REQ-FMT-08, REQ-CLI-10). */
const SECRET = 'HOLDOUT-CONTENT-7f3a91';

/** A repository with scenario S9@1.0 (`holdout:` as given) under `scenarios/`. */
function repo(holdoutFlag = true): string {
  const root = tempDir('bench-repo-');
  writeScenarioAt(
    join(root, 'scenarios'),
    { ...completeScenarioYaml(), holdout: holdoutFlag },
    COMPLETE_FILES,
  );
  // The leak scan's declarations, as the repository has them (task-017).
  copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
  return root;
}

/** A hold-out checkout with `files` additions for S9@1.0, each holding {@link SECRET}. */
function holdout(files: readonly string[]): string {
  const root = tempDir('bench-holdout-');
  mkdirSync(join(root, 'scenarios', 'S9', '1.0'), { recursive: true });
  for (const file of files) {
    mkdirSync(dirname(join(root, 'scenarios', 'S9', '1.0', file)), { recursive: true });
    writeFileSync(join(root, 'scenarios', 'S9', '1.0', file), `expect(x).toBe('${SECRET}')\n`);
  }
  return root;
}

async function run(cwd: string, ...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    argv,
    { stdout: (t) => (stdout += t), stderr: (t) => (stderr += t) },
    undefined,
    cwd,
  );
  // Whatever happened, no byte of an addition reached an output or a file under the repository.
  expect(stdout + stderr).not.toContain(SECRET);
  expect(filesUnder(cwd).some((file) => readFileSync(file, 'utf8').includes(SECRET))).toBe(false);
  return { code, stdout, stderr };
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : entry.isFile() ? [path] : [];
  });
}

describe('bench scenario validate (REQ-CLI-04, REQ-CLI-10)', () => {
  const previous = process.env.BENCH_HOLDOUT_PATH;
  afterEach(() => {
    if (previous === undefined) delete process.env.BENCH_HOLDOUT_PATH;
    else process.env.BENCH_HOLDOUT_PATH = previous;
  });

  it('validates a scenario version and says the hold-out was not configured (K2)', async () => {
    delete process.env.BENCH_HOLDOUT_PATH;
    expect(await run(repo(), 'scenario', 'validate', 'S9@1.0')).toEqual({
      code: 0,
      stdout: 'scenario S9@1.0 is valid (hold-out: not configured)\n',
      stderr: '',
    });
  });

  it('counts the additions of a scenario that expects them, never showing them', async () => {
    const result = await run(
      repo(true),
      'scenario',
      'validate',
      'S9@1.0',
      '--holdout',
      holdout(['first/a.test.ts', 'all/b.test.ts']),
    );
    expect(result).toEqual({ code: 0, stdout: 'scenario S9@1.0 is valid (hold-out: 2 files)\n', stderr: '' });
  });

  it('takes the hold-out from BENCH_HOLDOUT_PATH, and --holdout over it', async () => {
    process.env.BENCH_HOLDOUT_PATH = holdout(['first/a.test.ts']);
    expect((await run(repo(), 'scenario', 'validate', 'S9@1.0')).stdout).toMatch(/\(hold-out: 1 file\)/);
    const option = holdout(['first/a.test.ts', 'first/b.test.ts', 'all/c.test.ts']);
    expect((await run(repo(), 'scenario', 'validate', 'S9@1.0', '--holdout', option)).stdout).toMatch(
      /3 files/,
    );
    process.env.BENCH_HOLDOUT_PATH = '';
    expect((await run(repo(), 'scenario', 'validate', 'S9@1.0')).stdout).toMatch(/not configured/);
  });

  it('rejects a scenario that expects additions when the hold-out has none for it', async () => {
    const empty = holdout([]);
    const result = await run(repo(true), 'scenario', 'validate', 'S9@1.0', '--holdout', empty);
    expect(result).toEqual({
      code: 1,
      stdout: '',
      stderr: `holdout: the scenario expects hold-out additions, and ${empty} has none for S9@1.0\n`,
    });
  });

  it('rejects additions for a scenario that declares none', async () => {
    const extra = holdout(['first/a.test.ts']);
    const result = await run(repo(false), 'scenario', 'validate', 'S9@1.0', '--holdout', extra);
    expect(result).toEqual({
      code: 1,
      stdout: '',
      stderr: `holdout: the scenario declares no hold-out additions, and ${extra} has 1 file for S9@1.0\n`,
    });
  });

  it('accepts a scenario that declares none when the hold-out has none', async () => {
    const result = await run(repo(false), 'scenario', 'validate', 'S9@1.0', '--holdout', holdout([]));
    expect(result.stdout).toBe('scenario S9@1.0 is valid (hold-out: none)\n');
  });

  it('names the variable or the option whose path is not a hold-out', async () => {
    const nowhere = join(tempDir('bench-x-'), 'nowhere');
    process.env.BENCH_HOLDOUT_PATH = nowhere;
    expect(await run(repo(), 'scenario', 'validate', 'S9@1.0')).toEqual({
      code: 1,
      stdout: '',
      stderr: `BENCH_HOLDOUT_PATH: ${nowhere} does not exist\n`,
    });
    expect((await run(repo(), 'scenario', 'validate', 'S9@1.0', '--holdout', nowhere)).stderr).toBe(
      `--holdout: ${nowhere} does not exist\n`,
    );
  });

  it('refuses a hold-out whose additions hold a symbolic link, by its relative path', async () => {
    const linked = holdout(['first/a.test.ts']);
    symlinkSync('/etc/hostname', join(linked, 'scenarios', 'S9', '1.0', 'escape'));
    expect((await run(repo(), 'scenario', 'validate', 'S9@1.0', '--holdout', linked)).stderr).toBe(
      "holdout: 'escape' is a symbolic link\n",
    );
  });

  it('refuses a hold-out file under no declared suite, naming the file only (dl-001)', async () => {
    const stray = holdout(['first/a.test.ts', 'a.test.ts', 'checks/b.yaml', 'other/c.test.ts']);
    expect(await run(repo(), 'scenario', 'validate', 'S9@1.0', '--holdout', stray)).toEqual({
      code: 1,
      stdout: '',
      stderr:
        "holdout: 'a.test.ts' is under no declared suite (all, first)\n" +
        "holdout: 'checks/b.yaml' is under no declared suite (all, first)\n" +
        "holdout: 'other/c.test.ts' is under no declared suite (all, first)\n",
    });
  });

  it('refuses to validate without the leak-scan declarations, rather than scan by defaults', async () => {
    const root = repo();
    rmSync(join(root, 'scenarios', 'leak-scan.yaml'));
    expect((await run(root, 'scenario', 'validate', 'S9@1.0')).stderr).toBe(
      `leak-scan.yaml: not found in ${join(root, 'scenarios')}\n`,
    );
  });

  it('refuses third-party material changed after it was pinned, naming the entry (dl-002)', async () => {
    delete process.env.BENCH_HOLDOUT_PATH;
    const root = repo();
    writeFileSync(join(root, 'scenarios', 'S9', '1.0', 'oracle', 'first', 'examples.json'), '{}\n');
    expect(await run(root, 'scenario', 'validate', 'S9@1.0')).toEqual({
      code: 1,
      stdout: '',
      stderr: "oracle.third_party[1].sha256: does not match 'oracle/first/examples.json'\n",
    });
  });

  it("reports the scenario's own issues as campaign validate does", async () => {
    const root = tempDir('bench-repo-');
    writeScenarioAt(join(root, 'scenarios'), { ...completeScenarioYaml(), profiles: [] }, COMPLETE_FILES);
    const result = await run(root, 'scenario', 'validate', 'S9@1.0');
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/^profiles: /);
    expect((await run(root, 'scenario', 'validate', 'S7@1.0')).stderr).toMatch(
      /^scenario\.yaml: not found in /,
    );
  });

  it.each([
    [['scenario', 'validate']],
    [['scenario', 'validate', 'S9']],
    [['scenario', 'validate', 's9@1.0']],
    [['scenario', 'validate', 'S9@1.0', '--holdout']],
    [['scenario', 'validate', 'S9@1.0', '--other']],
    [['scenario', 'validate', 'S9@1.0', '--holdout', '--other']],
    [['scenario', 'validate', 'S9@1.0', '--holdout', '/h', 'extra']],
    [['scenario', 'run', 'S9@1.0']],
  ])('is a usage error: %j', async (argv) => {
    const result = await run(repo(), ...argv);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/^usage: bench/);
  });
});
