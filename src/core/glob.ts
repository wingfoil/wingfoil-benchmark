/**
 * The globs of a harness arm's configuration and state places (REQ-FMT-05 as amended in 1.50): paths relative to the
 * workspace, `/`-separated, with `*` (any characters but `/`), `?` (one character but `/`) and `**` (a whole
 * segment: any number of segments, none included). A glob ending in `/` names a directory: everything below it. Unlike
 * a shell's, a segment starting with a dot is matched like any other, since a tool's state often lives in one.
 */

/** Why `glob` is not one {@link matchesGlob} reads, or `undefined` when it is. */
export function globIssue(glob: string): string | undefined {
  if (glob === '') return 'is empty';
  if (glob.includes('\\')) return 'must use forward slashes';
  if (glob.startsWith('/')) return 'must be relative to the workspace';
  const segments = (glob.endsWith('/') ? glob.slice(0, -1) : glob).split('/');
  if (segments.includes('..')) return "must not hold '..'";
  if (segments.includes('.')) return "must not hold '.'";
  if (segments.includes('')) return 'must not hold an empty segment';
  if (segments.some((segment) => segment.includes('**') && segment !== '**'))
    return "'**' must be a whole segment";
  if (/[[\]{}!]/.test(glob)) return 'supports only *, ** and ?';
  return undefined;
}

/** Whether the workspace path `path` lies in `glob` (a glob {@link globIssue} accepts). */
export function matchesGlob(glob: string, path: string): boolean {
  return toRegExp(glob).test(path);
}

const cache = new Map<string, RegExp>();

function toRegExp(glob: string): RegExp {
  const cached = cache.get(glob);
  if (cached !== undefined) return cached;
  const segments = (glob.endsWith('/') ? `${glob}**` : glob).split('/');
  let source = '';
  segments.forEach((segment, index) => {
    const last = index === segments.length - 1;
    if (segment === '**') {
      // `a/**` is everything below `a`; `**/b` and `a/**/b` let `**` stand for no segment at all.
      source += last ? (index === 0 ? '.*' : '.+') : '(?:[^/]+/)*';
      return;
    }
    source += segment
      .replace(/[.+^$()|\\]/g, '\\$&')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    if (!last) source += '/';
  });
  const regExp = new RegExp(`^${source}$`);
  cache.set(glob, regExp);
  return regExp;
}
