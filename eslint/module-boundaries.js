import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * REQ-ARC-01/02: the modules under `src/` and what each may import.
 * cli → (runner, scoring, site) → (campaign, scenario, arms, agents, results) → core;
 * scoring and runner never import each other.
 */
const MIDDLE = ['campaign', 'scenario', 'arms', 'agents', 'results'];
const TOP = ['runner', 'scoring', 'site'];

/** @type {Record<string, string[]>} */
export const ALLOWED_IMPORTS = {
  core: [],
  ...Object.fromEntries(MIDDLE.map((module) => [module, ['core']])),
  ...Object.fromEntries(TOP.map((module) => [module, ['core', ...MIDDLE]])),
  cli: ['core', ...MIDDLE, ...TOP],
};

const MODULES = Object.keys(ALLOWED_IMPORTS);

/**
 * @param {string} path
 * @returns {string}
 */
function firstSegment(path) {
  return path.split(sep)[0] ?? '';
}

/**
 * `path` with symbolic links resolved as far as it exists: lint may run on files not yet on disk.
 * @param {string} path
 * @returns {string}
 */
function real(path) {
  try {
    return realpathSync(path);
  } catch {
    const parent = dirname(path);
    return parent === path ? path : resolve(real(parent), path.slice(parent.length + 1));
  }
}

/**
 * Why an import from `file` to `source` breaks the module rule, or `null` when it does not.
 * @param {string} srcRoot
 * @param {string} file
 * @param {string} source
 * @returns {string | null}
 */
function violation(srcRoot, file, source) {
  const fromPath = relative(srcRoot, real(file));
  if (fromPath.startsWith('..')) return null;
  if (!fromPath.includes(sep)) return 'files under src/ must live in a module directory (REQ-ARC-01)';
  const from = firstSegment(fromPath);
  if (!MODULES.includes(from)) return `'${from}' is not a module of REQ-ARC-01`;

  const toPath = relative(srcRoot, real(resolve(dirname(file), source)));
  if (toPath === '' || toPath.startsWith('..')) {
    return `module '${from}' must not import from outside its own module directory (REQ-ARC-02)`;
  }
  const to = firstSegment(toPath);
  if (to === from) return null;
  if (!MODULES.includes(to)) return `'${to}' is not a module of REQ-ARC-01`;
  if (!ALLOWED_IMPORTS[from]?.includes(to)) return `module '${from}' must not import '${to}' (REQ-ARC-02)`;
  if (toPath !== `${to}${sep}index.js`) return `import module '${to}' through '${to}/index.js' only`;
  return null;
}

/**
 * The module specifier of an import node: a string literal, or a template literal with no `${}`.
 * @param {any} source an ESTree node, or `null`/`undefined` for exports without a source
 * @returns {string | null}
 */
function sourceText(source) {
  if (source?.type === 'Literal' && typeof source.value === 'string') return source.value;
  if (source?.type === 'TemplateLiteral' && source.expressions.length === 0)
    return source.quasis[0].value.cooked;
  return null;
}

/**
 * ESLint rule: every relative or absolute import, re-export, dynamic `import()` and TypeScript
 * `import('…')` type in `src/` respects REQ-ARC-02.
 */
/** @type {import('eslint').Rule.RuleModule} */
export const moduleBoundaries = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce the module dependency rule of REQ-ARC-02' },
    schema: [{ type: 'object', properties: { srcRoot: { type: 'string' } }, required: ['srcRoot'] }],
  },
  create(context) {
    const srcRoot = real(context.options[0].srcRoot);
    /** @param {any} node an import, export or `import()` node */
    function check(node) {
      const source = sourceText(node.source);
      if (source === null || !(source.startsWith('.') || isAbsolute(source))) return;
      const message = violation(srcRoot, context.filename, source);
      if (message) context.report({ node: node.source, message });
    }
    return {
      ImportDeclaration: check,
      ExportAllDeclaration: check,
      ExportNamedDeclaration: check,
      ImportExpression: check,
      TSImportType: check,
    };
  },
};
