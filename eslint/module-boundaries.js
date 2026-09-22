import { dirname, relative, resolve, sep } from 'node:path';

/**
 * REQ-ARC-01/02: the modules under `src/` and what each may import.
 * cli → (runner, scoring, site) → (campaign, scenario, arms, agents, results) → core;
 * scoring and runner never import each other.
 */
const MIDDLE = ['campaign', 'scenario', 'arms', 'agents', 'results'];
const TOP = ['runner', 'scoring', 'site'];

export const ALLOWED_IMPORTS = {
  core: [],
  ...Object.fromEntries(MIDDLE.map((module) => [module, ['core']])),
  ...Object.fromEntries(TOP.map((module) => [module, ['core', ...MIDDLE]])),
  cli: ['core', ...MIDDLE, ...TOP],
};

const MODULES = Object.keys(ALLOWED_IMPORTS);

function firstSegment(path) {
  return path.split(sep)[0];
}

/** Why an import from `file` to `source` breaks the module rule, or `null` when it does not. */
function violation(srcRoot, file, source) {
  const fromPath = relative(srcRoot, file);
  if (fromPath.startsWith('..')) return null;
  if (!fromPath.includes(sep)) return 'files under src/ must live in a module directory (REQ-ARC-01)';
  const from = firstSegment(fromPath);
  if (!MODULES.includes(from)) return `'${from}' is not a module of REQ-ARC-01`;

  const toPath = relative(srcRoot, resolve(dirname(file), source));
  if (toPath.startsWith('..')) return `module '${from}' must not import from outside src/`;
  const to = firstSegment(toPath);
  if (to === from) return null;
  if (!MODULES.includes(to)) return `'${to}' is not a module of REQ-ARC-01`;
  if (!ALLOWED_IMPORTS[from].includes(to)) return `module '${from}' must not import '${to}' (REQ-ARC-02)`;
  if (toPath !== `${to}${sep}index.js`) return `import module '${to}' through '${to}/index.js' only`;
  return null;
}

/** ESLint rule: every relative import, re-export and dynamic import in `src/` respects REQ-ARC-02. */
export const moduleBoundaries = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce the module dependency rule of REQ-ARC-02' },
    schema: [{ type: 'object', properties: { srcRoot: { type: 'string' } }, required: ['srcRoot'] }],
  },
  create(context) {
    const { srcRoot } = context.options[0];
    function check(node) {
      const source = node.source;
      if (source?.type !== 'Literal' || typeof source.value !== 'string' || !source.value.startsWith('.'))
        return;
      const message = violation(srcRoot, context.filename, source.value);
      if (message) context.report({ node: source, message });
    }
    return {
      ImportDeclaration: check,
      ExportAllDeclaration: check,
      ExportNamedDeclaration: check,
      ImportExpression: check,
    };
  },
};
