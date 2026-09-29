// M-R2's public interface (REQ-SCO-05 as amended in 1.17, task-042), read in the scoring container from
// one run's final snapshot.
//
//   node interface.mjs <snapshot directory> '<files as JSON: ["src/a.ts", …]>'
//
// Each file is parsed with the pinned compiler's parser alone (no program, no type check, no tsconfig).
// Every exported declaration is one entry, `<file>: <signature>`: the declaration with its bodies and
// initializers removed, printed by the compiler's printer without comments, its whitespace collapsed. A
// class keeps its members that are not private; a `const` whose value is a function literal keeps the
// literal's parameters and return type. A file that does not parse is one entry, `<file>: (does not
// parse)`. The entries are printed sorted by code unit, without duplicates, one JSON string per line.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const [root, spec] = process.argv.slice(2);
if (root === undefined || spec === undefined) {
  process.stderr.write('usage: interface.mjs <snapshot> <files as JSON>\n');
  process.exit(2);
}

const f = ts.factory;
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const hasModifier = (node, kind) => (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);
const isExported = (node) => hasModifier(node, ts.SyntaxKind.ExportKeyword);
const isPrivate = (member) =>
  hasModifier(member, ts.SyntaxKind.PrivateKeyword) ||
  (member.name !== undefined && ts.isPrivateIdentifier(member.name));
const EMPTY = f.createBlock([]);

/** A constructor's parameters without `private`: the parameter is public, the property it makes is not. */
function publicParameters(parameters) {
  return parameters.map((p) =>
    f.updateParameterDeclaration(
      p,
      p.modifiers?.filter((m) => m.kind !== ts.SyntaxKind.PrivateKeyword),
      p.dotDotDotToken,
      p.name,
      p.questionToken,
      p.type,
      p.initializer,
    ),
  );
}

/** A class member as the interface sees it: no body, no initializer; undefined when it is private. */
function member(m) {
  if (isPrivate(m) || ts.isClassStaticBlockDeclaration(m)) return undefined;
  if (ts.isConstructorDeclaration(m)) {
    return f.updateConstructorDeclaration(m, m.modifiers, publicParameters(m.parameters), undefined);
  }
  if (ts.isMethodDeclaration(m)) {
    return f.updateMethodDeclaration(
      m,
      m.modifiers,
      m.asteriskToken,
      m.name,
      m.questionToken,
      m.typeParameters,
      m.parameters,
      m.type,
      undefined,
    );
  }
  if (ts.isGetAccessorDeclaration(m)) {
    return f.updateGetAccessorDeclaration(m, m.modifiers, m.name, m.parameters, m.type, undefined);
  }
  if (ts.isSetAccessorDeclaration(m)) {
    return f.updateSetAccessorDeclaration(m, m.modifiers, m.name, m.parameters, undefined);
  }
  if (ts.isPropertyDeclaration(m)) {
    return f.updatePropertyDeclaration(
      m,
      m.modifiers,
      m.name,
      m.questionToken ?? m.exclamationToken,
      m.type,
      undefined,
    );
  }
  return m;
}

/** A variable's value as the interface sees it: a function literal with an empty body, or nothing. */
function value(initializer) {
  if (initializer === undefined) return undefined;
  if (ts.isArrowFunction(initializer)) {
    return f.updateArrowFunction(
      initializer,
      initializer.modifiers,
      initializer.typeParameters,
      initializer.parameters,
      initializer.type,
      initializer.equalsGreaterThanToken,
      EMPTY,
    );
  }
  if (ts.isFunctionExpression(initializer)) {
    return f.updateFunctionExpression(
      initializer,
      initializer.modifiers,
      initializer.asteriskToken,
      initializer.name,
      initializer.typeParameters,
      initializer.parameters,
      initializer.type,
      EMPTY,
    );
  }
  return undefined;
}

/** The statement as the interface sees it, or undefined when it exports nothing. */
function signature(statement) {
  if (ts.isExportDeclaration(statement)) return statement;
  if (ts.isExportAssignment(statement)) {
    return ts.isIdentifier(statement.expression)
      ? statement
      : f.updateExportAssignment(statement, statement.modifiers, f.createIdentifier('…'));
  }
  if (!isExported(statement)) return undefined;
  if (ts.isFunctionDeclaration(statement)) {
    return f.updateFunctionDeclaration(
      statement,
      statement.modifiers,
      statement.asteriskToken,
      statement.name,
      statement.typeParameters,
      statement.parameters,
      statement.type,
      undefined,
    );
  }
  if (ts.isClassDeclaration(statement)) {
    return f.updateClassDeclaration(
      statement,
      statement.modifiers,
      statement.name,
      statement.typeParameters,
      statement.heritageClauses,
      statement.members.map(member).filter((m) => m !== undefined),
    );
  }
  if (ts.isVariableStatement(statement)) {
    const list = statement.declarationList;
    return f.updateVariableStatement(
      statement,
      statement.modifiers,
      f.updateVariableDeclarationList(
        list,
        list.declarations.map((d) =>
          f.updateVariableDeclaration(
            d,
            d.name,
            d.exclamationToken,
            d.type,
            d.type === undefined ? value(d.initializer) : undefined,
          ),
        ),
      ),
    );
  }
  if (ts.isModuleDeclaration(statement)) {
    return f.updateModuleDeclaration(statement, statement.modifiers, statement.name, undefined);
  }
  // Interfaces, type aliases, enums and `export import`: what they declare is their signature.
  return statement;
}

function entriesOf(file) {
  const text = readFileSync(join(root, file), 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  if (source.parseDiagnostics.length > 0) return [`${file}: (does not parse)`];
  return source.statements.flatMap((statement) => {
    const node = signature(statement);
    if (node === undefined) return [];
    const printed = printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s+/g, ' ').trim();
    return [`${file}: ${printed}`];
  });
}

const entries = [...new Set(JSON.parse(spec).flatMap(entriesOf))].sort(byCodeUnit);
for (const entry of entries) process.stdout.write(`${JSON.stringify(entry)}\n`);
