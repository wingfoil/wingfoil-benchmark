import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { fail, ok } from '../core/index.js';
import type { Issue, PublishPort, Result } from '../core/index.js';

import { buildSite, SITE } from './build.js';

/**
 * Publishing the site (F5.6, REQ-RES-04 as amended in 1.22, task-047): `site/` pushed to the remote's
 * `gh-pages` branch, and only by this, only when asked. `site/` is first copied aside, so that what is
 * checked is what is pushed; the copy must be, file for file and byte for byte, what fresh builds of its
 * executions give; the repository must be readable by anyone. The repository's own working tree, index and
 * branches are never touched: the push is made from a temporary clone.
 */

/** The branch GitHub Pages serves (REQ-RES-04). */
export const PAGES_BRANCH = 'gh-pages';

/** What a publication did: the commit pushed, or that the remote already held this site. */
export interface Publication {
  readonly commit: string;
  readonly executions: readonly string[];
  readonly unchanged: boolean;
}

const EXECUTION_DIR = /^[0-9a-f]{12}$/;

/**
 * The settings every publishing git command runs with, whatever the maintainer's configuration says: no
 * ignore file can leave a page out, no line-ending conversion can change its bytes, no hook can run.
 */
const FIXED = [
  '-c',
  'core.excludesFile=/dev/null',
  '-c',
  'core.autocrlf=false',
  '-c',
  'core.hooksPath=/dev/null',
];

/** Every file under `dir`, relative, with its bytes; and every entry that is a link, which is refused. */
function filesOf(dir: string): { files: Map<string, Buffer>; links: string[] } {
  const files = new Map<string, Buffer>();
  const links: string[] = [];
  const walk = (at: string) => {
    for (const name of readdirSync(at).sort()) {
      const path = join(at, name);
      const entry = lstatSync(path);
      if (entry.isSymbolicLink()) links.push(relative(dir, path));
      else if (entry.isDirectory()) walk(path);
      else files.set(relative(dir, path), readFileSync(path));
    }
  };
  walk(dir);
  return { files, links };
}

/** The executions built under a site directory: each `<campaign-id>/<n>/`, in order. */
function builtExecutions(site: string): string[] {
  return readdirSync(site)
    .filter((name) => EXECUTION_DIR.test(name) && statSync(join(site, name)).isDirectory())
    .sort()
    .flatMap((campaign) =>
      readdirSync(join(site, campaign))
        .filter((n) => /^[1-9]\d*$/.test(n) && statSync(join(site, campaign, n)).isDirectory())
        .sort((a, b) => Number(a) - Number(b))
        .map((n) => `${campaign}/${n}`),
    );
}

/**
 * Check the site in `dir` (a copy of `site/`) against fresh builds, from the results of `root`, of every
 * execution under it: the set of its files must be exactly the union of the builds' — each execution's
 * pages, the stylesheet, and the root page of the execution it leads to — and every byte the same. A link,
 * or any entry no build gives (`.git`, `.gitignore`, a stray page), is refused. Returns the executions.
 */
export function checkSiteCopy(root: string, dir: string): Result<string[]> {
  const missing = ['index.html', 'style.css'].filter((file) => !existsSync(join(dir, file)));
  const executions = builtExecutions(dir);
  if (missing.length > 0 || executions.length === 0) {
    return fail([{ path: SITE, message: 'not built: run bench site build <campaign-id>/<n> first' }]);
  }
  const { files, links } = filesOf(dir);
  const issues: Issue[] = links.map((path) => ({
    path: `${SITE}/${path}`,
    message: 'is a link: a published site holds files only',
  }));
  const target = /url=([0-9a-f]{12}\/[1-9]\d*)\//.exec(
    (files.get('index.html') ?? Buffer.alloc(0)).toString('utf8'),
  )?.[1];
  const expected = new Map<string, { bytes: Buffer; execution: string }>();
  const scratch = mkdtempSync(join(tmpdir(), 'bench-site-check-'));
  try {
    for (const execution of executions) {
      const fresh = join(scratch, execution.replace('/', '-'));
      const built = buildSite(root, execution, fresh);
      if (!built.ok) {
        issues.push(
          ...built.issues.map((issue) => ({
            ...issue,
            message: `${issue.message} (rebuilding ${execution})`,
          })),
        );
        continue;
      }
      for (const [path, bytes] of filesOf(fresh).files) {
        const own =
          path.startsWith(`${execution}/`) ||
          path === 'style.css' ||
          (path === 'index.html' && execution === target);
        if (own) expected.set(path, { bytes, execution });
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  if (target === undefined || !executions.includes(target)) {
    issues.push({
      path: `${SITE}/index.html`,
      message: 'leads to no execution under site/: run bench site build',
    });
  }
  for (const path of [...new Set([...files.keys(), ...expected.keys()])].sort()) {
    const actual = files.get(path);
    const want = expected.get(path);
    if (want === undefined) {
      issues.push({
        path: `${SITE}/${path}`,
        message: 'is not part of a fresh build of any execution: remove it, or rebuild site/',
      });
    } else if (actual === undefined || !actual.equals(want.bytes)) {
      issues.push({
        path: `${SITE}/${path}`,
        message: `differs from a fresh build of the results: run bench site build ${want.execution}`,
      });
    }
  }
  return issues.length > 0 ? fail(issues) : ok(executions);
}

/**
 * Publish `site/` of `root` to `remote`'s `gh-pages` (REQ-RES-04): `site/` copied aside and the copy
 * checked against fresh builds, the repository public by `port`'s probe, then a commit on top of the
 * remote branch — its history kept, never a force push — whose tree is exactly the copy, naming the
 * executions.
 */
export async function publishSite(
  root: string,
  remote: string,
  port: PublishPort,
): Promise<Result<Publication>> {
  if (!existsSync(join(root, SITE)) || !lstatSync(join(root, SITE)).isDirectory()) {
    return fail([{ path: SITE, message: 'not built: run bench site build <campaign-id>/<n> first' }]);
  }
  const scratch = mkdtempSync(join(tmpdir(), 'bench-publish-'));
  try {
    // What is checked is what is pushed: a copy, which a build running meanwhile cannot change.
    const copy = join(scratch, 'site');
    cpSync(join(root, SITE), copy, { recursive: true, verbatimSymlinks: true });
    const checked = checkSiteCopy(root, copy);
    if (!checked.ok) return checked;
    const executions = checked.value;

    const url = await port.git(['remote', 'get-url', remote], root);
    if (url.code !== 0) {
      return fail([{ path: remote, message: `is not a remote of this repository: ${url.stderr.trim()}` }]);
    }
    const address = url.stdout.trim();
    const visible = await port.isPublic(address);
    if (!visible.ok) {
      return fail([
        ...visible.issues,
        {
          path: remote,
          message:
            'the repository is private, or its visibility cannot be read: publishing waits for a public repository (REQ-RES-04)',
        },
      ]);
    }

    const work = join(scratch, 'clone');
    const step = async (args: readonly string[]): Promise<Result<string>> => {
      const result = await port.git([...FIXED, ...args], work);
      return result.code === 0
        ? ok(result.stdout)
        : fail([{ path: `git ${args[0] ?? ''}`, message: (result.stderr || result.stdout).trim() }]);
    };
    // The maintainer's own identity, from this repository's configuration
    const name = (await port.git(['config', 'user.name'], root)).stdout.trim();
    const email = (await port.git(['config', 'user.email'], root)).stdout.trim();
    const created = await port.git(['init', '--quiet', work], scratch);
    if (created.code !== 0) return fail([{ path: 'git init', message: created.stderr.trim() }]);
    const added = await step(['remote', 'add', 'origin', address]);
    if (!added.ok) return added;
    const fetched = await port.git([...FIXED, 'fetch', '--quiet', 'origin', PAGES_BRANCH], work);
    const hadBranch = fetched.code === 0;
    const checkout = hadBranch
      ? await step(['checkout', '--quiet', '-B', PAGES_BRANCH, 'FETCH_HEAD'])
      : await step(['checkout', '--quiet', '--orphan', PAGES_BRANCH]);
    if (!checkout.ok) return checkout;
    for (const entry of readdirSync(work)) {
      if (entry !== '.git') rmSync(join(work, entry), { recursive: true, force: true });
    }
    cpSync(copy, work, { recursive: true });
    const staged = await step(['add', '--all', '--force']);
    if (!staged.ok) return staged;
    const status = await step(['status', '--porcelain', '--ignored']);
    if (!status.ok) return status;
    if (hadBranch && status.value.trim() === '') {
      const head = await step(['rev-parse', 'HEAD']);
      return head.ok ? ok({ commit: head.value.trim(), executions, unchanged: true }) : head;
    }
    const target = /url=([0-9a-f]{12}\/[1-9]\d*\/)/.exec(readFileSync(join(copy, 'index.html'), 'utf8'))?.[1];
    const message = `site: publish ${executions.join(', ')}\n\nThe root page leads to ${target ?? '?'}.`;
    const identity = [
      ...(name === '' ? [] : ['-c', `user.name=${name}`]),
      ...(email === '' ? [] : ['-c', `user.email=${email}`]),
    ];
    const committed = await step([...identity, 'commit', '--quiet', '-m', message]);
    if (!committed.ok) return committed;
    const pushed = await step(['push', '--quiet', 'origin', `${PAGES_BRANCH}:${PAGES_BRANCH}`]);
    if (!pushed.ok) return pushed;
    const head = await step(['rev-parse', 'HEAD']);
    return head.ok ? ok({ commit: head.value.trim(), executions, unchanged: false }) : head;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
