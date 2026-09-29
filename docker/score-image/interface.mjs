// M-R2's public interface (REQ-SCO-05 as amended in 1.17, task-042), read in the scoring container from
// one run's final snapshot.
//
//   node interface.mjs <snapshot directory> '<files as JSON: ["src/a.ts", …]>'
//
// Each file is parsed with the pinned compiler's parser alone (no program, no type check, no tsconfig).
// Every exported declaration is one entry, `<file>: <signature>`: the declaration with its bodies and
// initializers removed, printed by the compiler's printer without comments, its whitespace collapsed. A
// class keeps its members that are not private, and a private parameter property is a plain parameter;
// an overload's implementation is left out, for functions, methods and constructors alike, a static
// member apart from an instance one; a namespace keeps its exported members, and an ambient one all of
// them unless it declares its exports. A value that is a function or class literal, behind parentheses
// or `satisfies` or as a default export, keeps its parameters and types; one asserted `as T`, behind
// `satisfies` too, has the type T. A file that does not parse is one entry, `<file>: (does not parse)`.
// The entries are printed sorted by code unit, without duplicates, one JSON string per line.
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

/** The modifiers a parameter property takes; a private one is no property of the interface. */
const PROPERTY = new Set([
  ts.SyntaxKind.PrivateKeyword,
  ts.SyntaxKind.ReadonlyKeyword,
  ts.SyntaxKind.OverrideKeyword,
]);

/** A constructor's parameters: a private parameter property is a plain parameter, since it is public. */
function publicParameters(parameters) {
  return parameters.map((p) =>
    hasModifier(p, ts.SyntaxKind.PrivateKeyword)
      ? f.updateParameterDeclaration(
          p,
          p.modifiers?.filter((m) => !PROPERTY.has(m.kind)),
          p.dotDotDotToken,
          p.name,
          p.questionToken,
          p.type,
          p.initializer,
        )
      : p,
  );
}

/**
 * A callable's name as callers see it: its text for a plain, quoted or numeric name, static apart; a
 * nameless default function is `default`, and a constructor `constructor`, which no method can be named.
 */
function nameOf(node) {
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  const name = node.name;
  const text =
    name === undefined
      ? 'default'
      : ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
        ? name.text
        : name.getText();
  return `${hasModifier(node, ts.SyntaxKind.StaticKeyword) ? 'static ' : ''}${text}`;
}

/** A function, method or constructor: the declarations that can be overloaded. */
const isCallable = (node) =>
  ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node);

/**
 * The overloaded callables among `nodes`, by {@link nameOf}: those declared without a body. Their
 * implementation, which has one, is hidden from callers. An abstract or ambient declaration has no body
 * and no implementation, and hides nothing.
 */
function overloaded(nodes) {
  return new Set(nodes.filter((n) => isCallable(n) && n.body === undefined).map(nameOf));
}
const isImplementation = (node, names) =>
  isCallable(node) && node.body !== undefined && names.has(nameOf(node));

/** A class's members as the interface sees them. */
function members(list) {
  const names = overloaded(list);
  return list
    .filter((m) => !isImplementation(m, names))
    .map(member)
    .filter((m) => m !== undefined);
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

/** An expression without the parentheses and `satisfies` around it, which change no signature. */
function unwrapped(expression) {
  let e = expression;
  while (e !== undefined && (ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e)))
    e = e.expression;
  return e;
}

/** The type an expression is asserted to have (`as T`, `<T>`, behind `satisfies`), which is what its users see. */
function asserted(expression) {
  let e = expression;
  while (e !== undefined && (ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e))) {
    e = e.expression;
  }
  return e !== undefined &&
    (ts.isAsExpression(e) || ts.isTypeAssertionExpression(e)) &&
    !ts.isConstTypeReference(e.type)
    ? e.type
    : undefined;
}

/** A value as the interface sees it: a function literal with an empty body, a class without bodies, or nothing. */
function value(expression) {
  const initializer = unwrapped(expression);
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
  if (ts.isClassExpression(initializer)) {
    return f.updateClassExpression(
      initializer,
      initializer.modifiers,
      initializer.name,
      initializer.typeParameters,
      initializer.heritageClauses,
      members(initializer.members),
    );
  }
  return undefined;
}

/**
 * A namespace's body as the interface sees it: its exported members, nested namespaces included. In an
 * ambient (`declare`) namespace every member is exported, with or without the keyword.
 */
function namespaceBody(body, ambient) {
  if (body === undefined) return undefined;
  if (ts.isModuleDeclaration(body)) {
    return f.updateModuleDeclaration(body, body.modifiers, body.name, namespaceBody(body.body, ambient));
  }
  if (ts.isModuleBlock(body)) {
    // An ambient body that declares its exports exports only those (TypeScript's binder).
    const declares = body.statements.some((st) => ts.isExportDeclaration(st) || ts.isExportAssignment(st));
    return f.updateModuleBlock(body, statements(body.statements, ambient && !declares));
  }
  return body;
}

/** The statement as the interface sees it, or undefined when it exports nothing. */
function signature(statement, ambient = false) {
  if (ts.isExportDeclaration(statement)) return statement;
  if (ts.isExportAssignment(statement)) {
    if (ts.isIdentifier(statement.expression)) return statement;
    const type = asserted(statement.expression);
    const elided = f.createIdentifier('…');
    return f.updateExportAssignment(
      statement,
      statement.modifiers,
      type === undefined ? (value(statement.expression) ?? elided) : f.createAsExpression(elided, type),
    );
  }
  if (!ambient && !isExported(statement)) return undefined;
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
      members(statement.members),
    );
  }
  if (ts.isVariableStatement(statement)) {
    const list = statement.declarationList;
    return f.updateVariableStatement(
      statement,
      statement.modifiers,
      f.updateVariableDeclarationList(
        list,
        list.declarations.map((d) => {
          const type = d.type ?? asserted(d.initializer);
          return f.updateVariableDeclaration(
            d,
            d.name,
            d.exclamationToken,
            type,
            type === undefined ? value(d.initializer) : undefined,
          );
        }),
      ),
    );
  }
  if (ts.isModuleDeclaration(statement)) {
    return f.updateModuleDeclaration(
      statement,
      statement.modifiers,
      statement.name,
      namespaceBody(statement.body, ambient || hasModifier(statement, ts.SyntaxKind.DeclareKeyword)),
    );
  }
  // Interfaces, type aliases, enums and `export import`: what they declare is their signature.
  return statement;
}

/** The statements of a file or a namespace as the interface sees them: an overload's implementation left out. */
function statements(list, ambient = false) {
  const names = overloaded(list);
  return list
    .filter((statement) => !isImplementation(statement, names))
    .map((statement) => signature(statement, ambient))
    .filter((node) => node !== undefined);
}

function entriesOf(file) {
  const text = readFileSync(join(root, file), 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  if (source.parseDiagnostics.length > 0) return [`${file}: (does not parse)`];
  return statements(source.statements).map((node) => {
    const printed = printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s+/g, ' ').trim();
    return `${file}: ${printed}`;
  });
}

const entries = [...new Set(JSON.parse(spec).flatMap(entriesOf))].sort(byCodeUnit);
for (const entry of entries) process.stdout.write(`${JSON.stringify(entry)}\n`);
