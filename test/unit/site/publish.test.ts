import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { anonymousGit, githubHttpsUrl, publishCli } from '../../../src/core/index.js';
import type { ProcessPort } from '../../../src/core/index.js';
import { tempDir } from '../../support/scenario-fixture.js';
import { benchPublish, gitIn, probeSaying, publishableSite } from '../../support/site-fixture.js';

/** Every file under `dir`, relative, with its bytes. */
function tree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    for (const name of readdirSync(at).sort()) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else out[relative(dir, path)] = readFileSync(path, 'base64');
    }
  };
  walk(dir);
  return out;
}

/** The files of `ref` in the bare repository `bare`, with their bytes. */
function published(bare: string, ref = 'gh-pages'): Record<string, string> {
  const out: Record<string, string> = {};
  for (const path of gitIn(bare, 'ls-tree', '-r', '--name-only', ref).trim().split('\n')) {
    out[path] = Buffer.from(gitIn(bare, 'show', `${ref}:${path}`), 'utf8').toString('base64');
  }
  return out;
}

const refs = (bare: string) => gitIn(bare, 'for-each-ref', '--format=%(refname)').trim();

describe('bench site publish (REQ-CLI-09, REQ-RES-04 as amended in 1.22, task-047)', () => {
  it('pushes exactly site/ to gh-pages, names the executions, and leaves the repository as it was', async () => {
    const { root, bare } = await publishableSite();
    const before = gitIn(root, 'status', '--porcelain', '--ignored') + gitIn(root, 'branch', '-a');

    const out = await benchPublish(root, probeSaying(true), 'site', 'publish');
    expect(out.code, out.stderr).toBe(0);
    expect(out.stdout).toMatch(/^published: gh-pages [0-9a-f]{40} \(abcdef012345\/1\)\n/);

    expect(published(bare)).toEqual(tree(join(root, 'site')));
    expect(gitIn(bare, 'log', '-1', '--format=%B', 'gh-pages')).toBe(
      'site: publish abcdef012345/1\n\nThe root page leads to abcdef012345/1/.\n\n',
    );
    expect(gitIn(root, 'status', '--porcelain', '--ignored') + gitIn(root, 'branch', '-a')).toBe(before);
  }, 120_000);

  it('keeps gh-pages history: a commit on top of the remote branch, its old files gone', async () => {
    const { root, bare } = await publishableSite();
    // An earlier publication, from elsewhere
    const other = tempDir('bench-pages-other-');
    gitIn(other, 'clone', '--quiet', bare, '.');
    gitIn(other, 'checkout', '--quiet', '--orphan', 'gh-pages');
    appendFileSync(join(other, 'old.html'), 'an older site\n');
    gitIn(other, 'add', 'old.html');
    gitIn(other, '-c', 'user.name=x', '-c', 'user.email=x@x', 'commit', '--quiet', '-m', 'old');
    gitIn(other, 'push', '--quiet', 'origin', 'gh-pages');
    const old = gitIn(bare, 'rev-parse', 'gh-pages').trim();

    expect((await benchPublish(root, probeSaying(true), 'site', 'publish')).code).toBe(0);
    expect(gitIn(bare, 'rev-parse', 'gh-pages^').trim()).toBe(old);
    expect(Object.keys(published(bare))).not.toContain('old.html');

    // Publishing the same site again changes nothing, and says so
    const head = gitIn(bare, 'rev-parse', 'gh-pages').trim();
    const again = await benchPublish(root, probeSaying(true), 'site', 'publish');
    expect(again.code).toBe(0);
    expect(again.stdout).toContain('already published');
    expect(gitIn(bare, 'rev-parse', 'gh-pages').trim()).toBe(head);
  }, 120_000);

  it('refuses while the repository is private, or its visibility cannot be read, pushing nothing', async () => {
    const { root, bare } = await publishableSite();
    const refused = await benchPublish(root, probeSaying(false), 'site', 'publish');
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('publishing waits for a public repository (REQ-RES-04)');
    expect(refs(bare)).toBe('');
  }, 120_000);

  it('refuses a site/ that is missing, or differs from a fresh build of its executions', async () => {
    const { root, bare } = await publishableSite();
    appendFileSync(join(root, 'site', 'abcdef012345', '1', 'index.html'), '<!-- edited -->\n');
    const stale = await benchPublish(root, probeSaying(true), 'site', 'publish');
    expect(stale.code).toBe(1);
    expect(stale.stderr).toContain('site/abcdef012345/1/index.html: differs from a fresh build');
    expect(stale.stderr).toContain('bench site build abcdef012345/1');

    rmSync(join(root, 'site'), { recursive: true });
    const missing = await benchPublish(root, probeSaying(true), 'site', 'publish');
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain('site: not built: run bench site build <campaign-id>/<n> first');
    expect(refs(bare)).toBe('');

    expect((await benchPublish(root, probeSaying(true), 'site', 'publish', 'extra')).code).toBe(2);
    const noRemote = await benchPublish(root, probeSaying(true), 'site', 'publish', '--remote', 'nowhere');
    expect(noRemote.code).toBe(1);
  }, 120_000);
});

describe('what publish pushes (task-047 review)', () => {
  it('refuses anything under site/ that no fresh build gives: a page, a directory, .git, .gitignore, a link', async () => {
    const { root, bare } = await publishableSite();
    const site = join(root, 'site');
    for (const [path, content] of [
      ['evil.html', 'x'],
      ['stray/a.html', 'x'],
      ['abcdef012345/c.html', 'x'],
      ['.gitignore', 'abcdef012345/1/index.html\n'],
      ['.git/config', '[remote "origin"]\n\turl = /elsewhere\n'],
    ] as const) {
      mkdirSync(join(site, path, '..'), { recursive: true });
      writeFileSync(join(site, path), content);
      const refused = await benchPublish(root, probeSaying(true), 'site', 'publish');
      expect(refused.code, path).toBe(1);
      expect(refused.stderr).toContain(`site/${path}: is not part of a fresh build`);
      rmSync(join(site, path.split('/')[0] as string), { recursive: true });
    }
    symlinkSync(join(site, 'style.css'), join(site, 'linked.css'));
    const linked = await benchPublish(root, probeSaying(true), 'site', 'publish');
    expect(linked.code).toBe(1);
    expect(linked.stderr).toContain('site/linked.css: is a link');
    expect(refs(bare)).toBe('');
  }, 240_000);

  it("pushes every file whatever the maintainer's git ignores", async () => {
    const { root, bare } = await publishableSite();
    const config = join(tempDir('bench-global-'), 'gitconfig');
    const excludes = `${config}.ignore`;
    writeFileSync(excludes, 'index.html\n*.css\n');
    writeFileSync(config, `[core]\n\texcludesFile = ${excludes}\n\tautocrlf = true\n`);
    process.env.GIT_CONFIG_GLOBAL = config;
    try {
      expect((await benchPublish(root, probeSaying(true), 'site', 'publish')).code).toBe(0);
    } finally {
      delete process.env.GIT_CONFIG_GLOBAL;
    }
    expect(published(bare)).toEqual(tree(join(root, 'site')));
  }, 120_000);
});

describe('the visibility probe', () => {
  it('reads GitHub remotes as their anonymous https address, and nothing else', () => {
    expect(githubHttpsUrl('git@github.com:wingfoil/wingfoil-benchmark.git')).toBe(
      'https://github.com/wingfoil/wingfoil-benchmark.git',
    );
    expect(githubHttpsUrl('ssh://git@github.com/o/r.git')).toBe('https://github.com/o/r.git');
    expect(githubHttpsUrl('https://github.com/o/r')).toBe('https://github.com/o/r.git');
    expect(githubHttpsUrl('/tmp/bare')).toBeUndefined();
    expect(githubHttpsUrl('git@gitlab.com:o/r.git')).toBeUndefined();
  });

  it("gives git no configuration at all to read: not the repository's, the environment's, the home's or netrc's", async () => {
    const repository = tempDir('bench-probe-repo-');
    gitIn(repository, 'init', '--quiet');
    gitIn(repository, 'config', 'url./tmp/elsewhere.insteadOf', 'https://github.com/');
    const saved = { ...process.env };
    Object.assign(process.env, {
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'credential.helper',
      GIT_CONFIG_VALUE_0: 'store',
      GIT_CONFIG_PARAMETERS: "'url./tmp/x.insteadof'='https://github.com/'",
      NETRC: join(repository, 'netrc'),
      CURL_HOME: repository,
    });
    const cwd = process.cwd();
    process.chdir(repository);
    try {
      const { cwd: probeCwd, env } = anonymousGit();
      const listed = execFileSync('git', ['-c', 'credential.helper=', 'config', '--list', '--show-origin'], {
        cwd: probeCwd,
        env: Object.fromEntries(
          Object.entries({ ...process.env, ...env }).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
          ),
        ),
        encoding: 'utf8',
      });
      expect(listed.split('\n').filter((line) => line !== '' && !line.startsWith('command line:'))).toEqual(
        [],
      );
      expect(env).toMatchObject({ NETRC: undefined, CURL_HOME: undefined, GIT_CONFIG_PARAMETERS: undefined });
      expect(env.HOME).toBe(probeCwd);
      expect(readdirSync(probeCwd)).toEqual([]);
    } finally {
      process.chdir(cwd);
      for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    }
  });

  it('asks anonymously, with no configuration that could lend it credentials, and refuses on any failure', async () => {
    const calls: {
      args: readonly string[];
      env: Readonly<Record<string, string | undefined>> | undefined;
    }[] = [];
    const answering = (code: number): ProcessPort => ({
      run: (_command, args, options) => {
        calls.push({ args, env: options?.env });
        return Promise.resolve({
          code,
          stdout: '',
          stderr: code === 0 ? '' : 'fatal: Authentication failed',
        });
      },
    });
    expect((await publishCli(answering(0)).isPublic('git@github.com:o/r.git')).ok).toBe(true);
    expect(calls[0]?.args).toEqual([
      '-c',
      'credential.helper=',
      'ls-remote',
      '--heads',
      'https://github.com/o/r.git',
    ]);
    expect(calls[0]?.env).toMatchObject({
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: 'true',
      SSH_ASKPASS: undefined,
    });

    const privateRepo = await publishCli(answering(128)).isPublic('git@github.com:o/r.git');
    expect(privateRepo.ok).toBe(false);
    const local = await publishCli(answering(0)).isPublic('/tmp/bare');
    expect(local.ok).toBe(false);
    expect(calls).toHaveLength(2);
  });
});
