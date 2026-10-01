import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { fail, ok } from '../core/index.js';
import type { Issue, PublishPort, Result } from '../core/index.js';

import { buildSite, SITE } from './build.js';

/**
 * Publishing the site (F5.6, REQ-RES-04 as amended in 1.22, task-047): `site/` pushed to the remote's
 * `gh-pages` branch, and only by this, only when asked. What is pushed is checked first to be, byte for
 * byte, what the committed results give; the repository must be readable by anyone. The repository's own
 * working tree, index and branches are never touched: the push is made from a temporary clone.
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

/** Every file under `dir`, relative, with its bytes. */
function filesOf(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const walk = (at: string) => {
    for (const name of readdirSync(at).sort()) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.set(relative(dir, path), readFileSync(path));
    }
  };
  walk(dir);
  return out;
}

/** The executions built under `site/`: each `<campaign-id>/<n>/`, in order. */
function builtExecutions(site: string): string[] {
  return readdirSync(site)
    .filter((name) => EXECUTION_DIR.test(name) && statSync(join(site, name)).isDirectory())
    .sort()
    .flatMap((campaign) =>
      readdirSync(join(site, campaign))
        .filter((n) => /^[1-9]\d*$/.test(n))
        .sort((a, b) => Number(a) - Number(b))
        .map((n) => `${campaign}/${n}`),
    );
}

/**
 * Check `site/` of `root` against a fresh build of every execution under it: each execution's files, the
 * stylesheet, and the root page (the build of the execution it leads to). Returns the executions.
 */
export function checkBuiltSite(root: string): Result<string[]> {
  const site = join(root, SITE);
  const missing = ['index.html', 'style.css'].filter((file) => !existsSync(join(site, file)));
  const executions = existsSync(site) ? builtExecutions(site) : [];
  if (!existsSync(site) || missing.length > 0 || executions.length === 0) {
    return fail([{ path: SITE, message: 'not built: run bench site build <campaign-id>/<n> first' }]);
  }
  const target = /url=([0-9a-f]{12}\/[1-9]\d*)\//.exec(readFileSync(join(site, 'index.html'), 'utf8'))?.[1];
  const issues: Issue[] = [];
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
      const expected = filesOf(fresh);
      const actual = filesOf(join(site, execution));
      const own = (files: Map<string, Buffer>, prefix: string) =>
        new Map(
          [...files]
            .filter(([path]) => path.startsWith(prefix))
            .map(([path, bytes]) => [path.slice(prefix.length), bytes]),
        );
      const want = own(expected, `${execution}/`);
      for (const path of new Set([...want.keys(), ...actual.keys()])) {
        const a = actual.get(path);
        const b = want.get(path);
        if (a === undefined || b === undefined || !a.equals(b)) {
          issues.push({
            path: `${SITE}/${execution}/${path}`,
            message: `differs from a fresh build of the results: run bench site build ${execution}`,
          });
        }
      }
      const shared = execution === target ? ['index.html', 'style.css'] : ['style.css'];
      for (const file of shared) {
        if (!(expected.get(file) ?? Buffer.alloc(0)).equals(readFileSync(join(site, file)))) {
          issues.push({
            path: `${SITE}/${file}`,
            message: `differs from a fresh build of the results: run bench site build ${execution}`,
          });
        }
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
  return issues.length > 0 ? fail(issues) : ok(executions);
}

/**
 * Publish `site/` of `root` to `remote`'s `gh-pages` (REQ-RES-04): checked against a fresh build, the
 * repository public by `port`'s probe, then a commit on top of the remote branch — its history kept, never
 * a force push — whose tree is exactly `site/`, naming the executions.
 */
export async function publishSite(
  root: string,
  remote: string,
  port: PublishPort,
): Promise<Result<Publication>> {
  const checked = checkBuiltSite(root);
  if (!checked.ok) return checked;
  const executions = checked.value;
  const url = await port.git(['remote', 'get-url', remote], root);
  if (url.code !== 0)
    return fail([{ path: remote, message: `is not a remote of this repository: ${url.stderr.trim()}` }]);
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

  const work = mkdtempSync(join(tmpdir(), 'bench-publish-'));
  try {
    const step = async (args: readonly string[]): Promise<Result<string>> => {
      const result = await port.git(args, work);
      return result.code === 0
        ? ok(result.stdout)
        : fail([{ path: `git ${args[0] ?? ''}`, message: (result.stderr || result.stdout).trim() }]);
    };
    // The maintainer's own identity, from this repository's configuration
    const name = (await port.git(['config', 'user.name'], root)).stdout.trim();
    const email = (await port.git(['config', 'user.email'], root)).stdout.trim();
    for (const args of [
      ['init', '--quiet'],
      ['remote', 'add', 'origin', address],
    ]) {
      const done = await step(args);
      if (!done.ok) return done;
    }
    const fetched = await port.git(['fetch', '--quiet', 'origin', PAGES_BRANCH], work);
    const hadBranch = fetched.code === 0;
    const checkout = hadBranch
      ? await step(['checkout', '--quiet', '-B', PAGES_BRANCH, 'FETCH_HEAD'])
      : await step(['checkout', '--quiet', '--orphan', PAGES_BRANCH]);
    if (!checkout.ok) return checkout;
    for (const entry of readdirSync(work)) {
      if (entry !== '.git') rmSync(join(work, entry), { recursive: true, force: true });
    }
    cpSync(join(root, SITE), work, { recursive: true });
    const added = await step(['add', '--all']);
    if (!added.ok) return added;
    const status = await step(['status', '--porcelain']);
    if (!status.ok) return status;
    if (hadBranch && status.value.trim() === '') {
      const head = await step(['rev-parse', 'HEAD']);
      return head.ok ? ok({ commit: head.value.trim(), executions, unchanged: true }) : head;
    }
    const target = /url=([0-9a-f]{12}\/[1-9]\d*\/)/.exec(
      readFileSync(join(root, SITE, 'index.html'), 'utf8'),
    )?.[1];
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
    rmSync(work, { recursive: true, force: true });
  }
}
