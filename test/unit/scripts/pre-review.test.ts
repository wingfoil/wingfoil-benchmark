import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/pre-review.sh');

/**
 * A repository whose branch changes `files` over `main`, and stub `npx` and `npm` that record each call and fail the
 * command named by `failing`: what the script runs, without running a check (dl-020, task-098).
 */
function fixture(
  files: readonly (string | readonly [string, string])[],
  failing?: string,
  onMain: readonly string[] = [],
) {
  const root = tempDir('bench-pre-review-');
  const repo = join(root, 'repo');
  mkdirSync(repo);
  const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'seed');
  // Files already on main with their content: the branch then appends a short line to each.
  for (const entry of files) {
    const [file, content] = typeof entry === 'string' ? [entry, 'x\n'] : entry;
    if (!onMain.includes(file)) continue;
    mkdirSync(join(repo, dirname(file)), { recursive: true });
    writeFileSync(join(repo, file), content);
  }
  if (onMain.length > 0) {
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'main files');
  }
  git('checkout', '-q', '-b', 'task/x');
  for (const entry of files) {
    if (onMain.includes(typeof entry === 'string' ? entry : entry[0])) {
      const file = typeof entry === 'string' ? entry : entry[0];
      writeFileSync(join(repo, file), `${readFileSync(join(repo, file), 'utf8')}A short line.\n`);
      continue;
    }
    const [file, content] = typeof entry === 'string' ? [entry, 'x\n'] : entry;
    mkdirSync(join(repo, dirname(file)), { recursive: true });
    writeFileSync(join(repo, file), content);
  }
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'change');
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const calls = join(root, 'calls.txt');
  for (const tool of ['npx', 'npm']) {
    writeFileSync(
      join(bin, tool),
      [
        '#!/usr/bin/env bash',
        `echo "${tool} $*" >> '${calls}'`,
        failing === undefined ? 'exit 0' : `case "${tool} $*" in "${failing}"*) exit 1;; esac`,
        'exit 0',
      ].join('\n'),
    );
    chmodSync(join(bin, tool), 0o755);
  }
  const env = { ...process.env, LC_ALL: 'C.UTF-8', PATH: `${bin}:${process.env.PATH ?? ''}` };
  const run = Object.assign(() => spawnSync('bash', [SCRIPT, 'main'], { cwd: repo, env, encoding: 'utf8' }), {
    cwd: repo,
  });
  const recorded = () => (existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : []);
  return { run, recorded, git };
}

describe('scripts/pre-review.sh (dl-020, task-098)', () => {
  it('runs Prettier on every changed file, tsc, the touched tests with traceability, and test:bin for CLI changes', () => {
    const { run, recorded } = fixture(['src/cli/a.ts', 'test/unit/x.test.ts', 'docs/n.md']);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    expect(recorded()).toEqual([
      'npx prettier --check --ignore-unknown docs/n.md src/cli/a.ts test/unit/x.test.ts',
      'npx eslint src/cli/a.ts test/unit/x.test.ts',
      'npx tsc --noEmit -p .',
      'npx vitest run --maxWorkers=2 test/unit/x.test.ts',
      'npx vitest run --maxWorkers=2 test/acceptance/traceability.test.ts test/unit/docs/evaluate-page.test.ts',
      'npx vitest related --run --maxWorkers=2 src/cli/a.ts',
      'npm run test:bin -- --maxWorkers=2',
    ]);
  });

  it('runs Prettier in batches when the branch changes more files than one argument list holds (bug-053)', () => {
    const names = Array.from({ length: 450 }, (_, i) => `data/f${String(i).padStart(3, '0')}.json`);
    const { run, recorded } = fixture(names);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    const prettier = recorded().filter((call) => call.startsWith('npx prettier'));
    expect(prettier).toHaveLength(3);
    expect(prettier.join(' ').match(/data\/f\d+\.json/g)).toEqual(names);
  });

  it('passes no call more than 200 file arguments or 60000 bytes of them, whichever check it is (bug-053)', () => {
    const long = 'd'.repeat(200);
    const tests = Array.from(
      { length: 450 },
      (_, i) => `test/unit/${long}/${long}/t${String(i).padStart(3, '0')}.test.ts`,
    );
    const sources = Array.from(
      { length: 450 },
      (_, i) => `src/core/${long}/${long}/s${String(i).padStart(3, '0')}.ts`,
    );
    const { run, recorded } = fixture([...tests, ...sources]);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    const fixedTests = ['test/acceptance/traceability.test.ts', 'test/unit/docs/evaluate-page.test.ts'];
    for (const call of recorded()) {
      const files = call.split(' ').filter((word) => /^(src|test|data)\//.test(word));
      expect(files.length, call.slice(0, 80)).toBeLessThanOrEqual(200);
      expect(Buffer.byteLength(files.join(' ')), call.slice(0, 80)).toBeLessThanOrEqual(60000);
    }
    const run1 = recorded().filter((call) => call.startsWith('npx vitest run'));
    expect(run1.filter((call) => fixedTests.every((file) => call.includes(file)))).toHaveLength(1);
    const covered = (prefix: string) =>
      recorded()
        .filter((c) => c.startsWith(prefix))
        .join(' ');
    expect(covered('npx vitest run').match(/test\/unit\/d{200}\/d{200}\/t\d+\.test\.ts/g)).toEqual(tests);
    expect(covered('npx vitest related').match(/src\/core\/d{200}\/d{200}\/s\d+\.ts/g)).toEqual(sources);
  });

  it('bounds a batch by the bytes of its paths, not their characters, under a UTF-8 locale (bug-053)', () => {
    // A name holds at most 255 bytes: 60 four-byte characters per level. 130 paths of about 135 characters and 490 bytes
    // are 17500 characters (under the bound) and 64000 bytes (over it).
    const wide = '\u{1F600}'.repeat(60);
    const names = Array.from({ length: 130 }, (_, i) => `data/${wide}/${wide}/${String(i).padStart(3, '0')}.json`);
    const { run, recorded } = fixture(names);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    const prettier = recorded().filter((call) => call.startsWith('npx prettier'));
    expect(prettier).toHaveLength(2);
    for (const call of prettier) {
      const files = call.split(' ').filter((word) => word.startsWith('data/'));
      expect(Buffer.byteLength(files.join(' '))).toBeLessThanOrEqual(60000);
    }
    expect(prettier.join(' ').match(/data\/\S+\.json/g)).toEqual(names);
  });

  it('prints a line for every stage, run or skipped, in a branch that triggers none of the conditional ones', () => {
    const stages = ['markdown', 'prettier', 'eslint', 'tsc', 'tests', 'tests-related', 'test:bin'];
    for (const files of [['data/a.json'], ['src/cli/a.ts', 'test/unit/x.test.ts', 'docs/n.md']]) {
      const out = fixture(files).run().stdout;
      for (const stage of stages) {
        expect(out, `${stage} in ${files.join(',')}`).toMatch(
          new RegExp(`^pre-review: ${stage}( skipped: .+)?$`, 'm'),
        );
      }
    }
    const out = fixture(['data/a.json']).run().stdout;
    for (const stage of ['markdown', 'eslint', 'tests-related', 'test:bin']) {
      expect(out).toMatch(new RegExp(`^pre-review: ${stage} skipped: .+$`, 'm'));
    }
  });

  it('names a red batch and exits non-zero rather than stopping silently (bug-053)', () => {
    const names = Array.from({ length: 450 }, (_, i) => `data/f${String(i).padStart(3, '0')}.json`);
    const { run, recorded } = fixture(names, 'npx prettier');
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/pre-review: prettier is red/);
    expect(recorded()).toHaveLength(1);
  });

  it('passes every changed source that is not a test file to vitest related, wherever it sits (bug-053)', () => {
    const { run, recorded } = fixture(['src/core/deep.ts', 'eslint/module-boundaries.js', 'test/unit/x.test.ts']);
    expect(run().status).toBe(0);
    expect(recorded()).toContain(
      'npx vitest related --run --maxWorkers=2 eslint/module-boundaries.js src/core/deep.ts',
    );
  });

  it('selects a test that imports a changed file only through another module, with the real vitest (bug-053)', () => {
    const root = tempDir('bench-related-');
    writeFileSync(join(root, 'c.ts'), 'export const c = 1;\n');
    writeFileSync(join(root, 'b.ts'), "import { c } from './c.js';\nexport const b = c;\n");
    // Globals (--globals) so the temporary project needs no node_modules to import vitest from.
    writeFileSync(join(root, 'a.test.ts'), "import { b } from './b.js';\nit('a', () => expect(b).toBe(1));\n");
    writeFileSync(join(root, 'other.test.ts'), "it('other', () => undefined);\n");
    const vitest = repoPath('node_modules/vitest/vitest.mjs');
    const args = [vitest, 'related', '--run', '--globals', '--reporter=verbose', 'c.ts'];
    const out = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    expect(out.status, out.stderr).toBe(0);
    expect(out.stdout).toMatch(/a\.test\.ts/);
    expect(out.stdout).not.toMatch(/other\.test\.ts/);
  });

  it('says so when no related-test selection applies (bug-053)', () => {
    const { run } = fixture(['docs/n.md']);
    expect(run().stdout).toMatch(/tests-related skipped/);
  });

  it('runs test:bin only when files under src/cli/ or src/site/ changed', () => {
    const { run, recorded } = fixture(['src/core/a.ts', 'docs/n.md']);
    expect(run().status).toBe(0);
    expect(recorded().some((call) => call.includes('test:bin'))).toBe(false);
    const site = fixture(['src/site/b.ts']);
    expect(site.run().status).toBe(0);
    expect(site.recorded()).toContain('npm run test:bin -- --maxWorkers=2');
  });

  it('runs test:bin for a changed bin test, which the default vitest config excludes', () => {
    const { run, recorded } = fixture(['test/bin/z.test.ts']);
    expect(run().status).toBe(0);
    expect(recorded()).toContain('npm run test:bin -- --maxWorkers=2');
  });

  it('refuses a base that names no commit, rather than reporting nothing changed', () => {
    const { run, recorded } = fixture(['src/core/a.ts']);
    const result = spawnSync('bash', [SCRIPT, 'no-such-branch'], { cwd: run.cwd, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/no commit named 'no-such-branch'/);
    expect(recorded()).toEqual([]);
  });

  it('checks changed Markdown for lines over 120 characters and a final newline, before Prettier', () => {
    const long = 'word '.repeat(26).trim();
    const wide = fixture([['docs/a.md', `# Title\n\n${long}\n`]]);
    const result = wide.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/docs\/a\.md:3: 129 characters/);
    expect(wide.recorded()).toEqual([]);

    const noNewline = fixture([['docs/b.md', '# Title\n\nText']]);
    expect(noNewline.run().status).toBe(1);
    expect(noNewline.run().stderr).toMatch(/docs\/b\.md: no newline at the end/);
  });

  it('checks only the Markdown lines the branch added, not the long lines a file already had', () => {
    const long = 'word '.repeat(26).trim();
    const { run } = fixture([['docs/d.md', `# Title\n\n${long}\n`]], undefined, ['docs/d.md']);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
  });

  it('numbers the added lines right across hunks, and after an added line that starts with "++"', () => {
    const long = 'word '.repeat(26).trim();
    const before = ['# Title', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', ''].join('\n');
    const { run, git } = fixture([['docs/e.md', before]], undefined, ['docs/e.md']);
    // Two hunks: a short line changed near the top, a long line added between unchanged lines further down.
    const after = [
      '# Title',
      'one, changed',
      'two',
      'three',
      'four',
      'five',
      long,
      'six',
      'seven',
      'A short line.',
      '',
    ].join('\n');
    writeFileSync(join(run.cwd, 'docs/e.md'), after);
    writeFileSync(join(run.cwd, 'docs/p.md'), `# t\n++ plus\n${long}\n`);
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'more');
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/docs\/e\.md:7: 129 characters/);
    expect(result.stderr).not.toMatch(/docs\/e\.md:2:/);
    expect(result.stderr).toMatch(/docs\/p\.md:3: 129 characters/);
  });

  it('reports a long line after a closing fence and after a "---" that is not front matter', () => {
    const long = 'word '.repeat(26).trim();
    const text = ['# Title', '```', 'code', '```', long, '', '---', '', long, ''].join('\n');
    const result = fixture([['docs/f.md', text]]).run();
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/docs\/f\.md:5: 129 characters/);
    expect(result.stderr).toMatch(/docs\/f\.md:9: 129 characters/);
  });

  it('refuses to run outside a git repository', () => {
    const outside = tempDir('bench-pre-review-outside-');
    const result = spawnSync('bash', [SCRIPT, 'main'], { cwd: outside, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/not in a git repository/);
  });

  it('leaves tables, code blocks, front matter, links and byte-pinned paths out of the Markdown check', () => {
    const long = 'word '.repeat(26).trim();
    const exempt = [
      '---',
      `title: "${long}"`,
      '---',
      `| ${long} |`,
      '```',
      long,
      '```',
      `See [the page](https://example.com/${'p'.repeat(120)}).`,
      '',
    ].join('\n');
    const { run } = fixture([
      ['docs/c.md', exempt],
      ['scenarios/S1/1.0/notes.md', `${long}\n`],
      ['test/fixtures/wingfoil-config/x.md', `${long}\n`],
    ]);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
  });

  it("leaves out the Markdown a run's records keep under results/, WingFoil's output among it (bug-040)", () => {
    const long = 'x'.repeat(130);
    const { run } = fixture([
      ['results/dry-runs/112/generated/S10@1.0/baseline-docs/PROJECT_RULES.md', `${long}\n`],
    ]);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
  });

  it('leaves out the finding notes bench finding generates under findings/ (task-133)', () => {
    const long = 'x'.repeat(130);
    const { run } = fixture([['findings/c-1-s1-1.0-m-k1-baseline+wingfoil.md', `${long}\n`]]);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
  });

  it('stops at the first red check and exits non-zero, naming it', () => {
    const { run, recorded } = fixture(['src/cli/a.ts', 'docs/n.md'], 'npx prettier');
    const result = run();
    expect(result.status).not.toBe(0);
    expect(recorded()).toEqual(['npx prettier --check --ignore-unknown docs/n.md src/cli/a.ts']);
    expect(result.stdout + result.stderr).toMatch(/prettier/);
  });
});
