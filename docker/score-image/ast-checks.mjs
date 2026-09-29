// The AST checks of M-E1 (REQ-SCO-05, task-037), run in the scoring container on one step's snapshot.
//
//   node ast-checks.mjs <snapshot directory> '<checks as JSON: [{ "id", "dir", "rules" }]>'
//
// For each check, it reads the TypeScript files under the check's directory of the snapshot, parses
// them with the pinned compiler's parser alone (no program, no type check, no tsconfig), and prints
// one JSON line per violation: { "id", "file", "line", "rule" }, the file relative to the snapshot and
// the line 1-based, in the order of the checks, then by file, line and rule. The rules match syntax;
// a value reached through an alias is not seen, and that limit is published with the method.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';

const [root, spec] = process.argv.slice(2);
if (root === undefined || spec === undefined) {
  process.stderr.write('usage: ast-checks.mjs <snapshot> <checks as JSON>\n');
  process.exit(2);
}

/** Source files the rules read; declaration files and tests are not domain code. */
const SOURCE = /\.(ts|tsx|mts|cts)$/;
const LEFT_OUT = /(\.d\.[cm]?ts$)|(\.(test|spec)\.[cm]?tsx?$)/;
/** Node's `crypto` functions that return random values. */
const RANDOM = new Set(['randomUUID', 'getRandomValues', 'randomBytes', 'randomInt']);
const CRYPTO_MODULES = new Set(['crypto', 'node:crypto']);

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** The source files under `directory`, relative to the snapshot, sorted; `node_modules` is not entered. */
function sources(directory) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) return [];
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort(byCodeUnit)) {
      const path = join(dir, name);
      const stats = statSync(path);
      if (stats.isDirectory()) {
        if (name !== 'node_modules') walk(path);
      } else if (stats.isFile() && SOURCE.test(name) && !LEFT_OUT.test(name)) {
        found.push(relative(root, path).split(sep).join('/'));
      }
    }
  };
  walk(directory);
  return found;
}

const isExported = (node) =>
  (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** Whether the comment right before `node` is a `/** … *\/` block. */
function documented(node, text) {
  const comments = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  const last = comments[comments.length - 1];
  return (
    last !== undefined &&
    text.slice(last.pos, last.pos + 3) === '/**' &&
    text.slice(last.pos, last.pos + 4) !== '/**/'
  );
}

const isFunctionValue = (node) =>
  node !== undefined && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));

/** Every violation of `rules` in one parsed file, as [line, rule]. */
function violations(file, rules) {
  const text = readFileSync(join(root, file), 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const found = [];
  const at = (node, rule) =>
    found.push([source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, rule]);

  // The names a file gives to Node's crypto module, and to its random functions.
  const cryptoNames = new Set(['crypto']);
  const randomNames = new Set();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!CRYPTO_MODULES.has(statement.moduleSpecifier.text)) continue;
    const clause = statement.importClause;
    if (clause?.name !== undefined) cryptoNames.add(clause.name.text);
    const bindings = clause?.namedBindings;
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) cryptoNames.add(bindings.name.text);
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (RANDOM.has((element.propertyName ?? element.name).text)) randomNames.add(element.name.text);
      }
    }
  }
  const isCrypto = (node) =>
    (ts.isIdentifier(node) && cryptoNames.has(node.text)) ||
    (ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'globalThis' &&
      node.name.text === 'crypto');

  if (rules.includes('undocumented-export')) {
    // A function is documented when any of its declarations is (an overload carries the TSDoc).
    const functions = new Map();
    for (const statement of source.statements) {
      if (ts.isFunctionDeclaration(statement) && isExported(statement)) {
        const name = statement.name?.text ?? 'default';
        const entry = functions.get(name) ?? { first: statement, documented: false };
        entry.documented ||= documented(statement, text);
        functions.set(name, entry);
      } else if (ts.isVariableStatement(statement) && isExported(statement)) {
        const functional = statement.declarationList.declarations.some((d) => isFunctionValue(d.initializer));
        if (functional && !documented(statement, text)) at(statement, 'undocumented-export');
      }
    }
    for (const { first, documented: ok } of functions.values()) if (!ok) at(first, 'undocumented-export');
  }

  const visit = (node) => {
    if (rules.includes('throw') && ts.isThrowStatement(node)) at(node, 'throw');
    if (ts.isNewExpression(node) && rules.includes('wall-clock')) {
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Date' &&
        (node.arguments ?? []).length === 0
      ) {
        at(node, 'wall-clock');
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
        const [object, name] = [callee.expression.text, callee.name.text];
        if (rules.includes('wall-clock') && object === 'Date' && name === 'now') at(node, 'wall-clock');
        if (rules.includes('randomness') && object === 'Math' && name === 'random') at(node, 'randomness');
      }
      if (rules.includes('randomness')) {
        if (
          ts.isPropertyAccessExpression(callee) &&
          RANDOM.has(callee.name.text) &&
          isCrypto(callee.expression)
        ) {
          at(node, 'randomness');
        } else if (ts.isIdentifier(callee) && randomNames.has(callee.text)) {
          at(node, 'randomness');
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

for (const check of JSON.parse(spec)) {
  const lines = [];
  for (const file of sources(join(root, check.dir))) {
    for (const [line, rule] of violations(file, check.rules)) lines.push({ id: check.id, file, line, rule });
  }
  lines.sort((a, b) => byCodeUnit(a.file, b.file) || a.line - b.line || byCodeUnit(a.rule, b.rule));
  for (const line of lines) process.stdout.write(`${JSON.stringify(line)}\n`);
}
