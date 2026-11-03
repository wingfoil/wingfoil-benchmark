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
//
// Version 2 (REQ-SCO-07 as amended in 1.49, task-129): `node interface.mjs <snapshot> --v2` reads the interface the
// entry point `src/index.ts` exposes. Each name it exports, followed through re-exports to its declaration, is one
// entry per signature, `<name>: <signature>`, with no file path and no `export`/`default` keyword; a name exported
// through `export * as ns` or an `import * as ns` is its module's names, each `ns.<name>: <signature>`. Specifiers:
// `.js` read as its `.ts` source, extensionless or a directory as its `.ts` file or `index.ts`, relative only. The
// special entries: `(no entry point)`, `<file>: (does not parse)`, `(unresolved <specifier>)`.
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import ts from 'typescript';

const [root, spec] = process.argv.slice(2);
if (root === undefined || spec === undefined) {
  process.stderr.write('usage: interface.mjs <snapshot> <files as JSON> | interface.mjs <snapshot> --v2\n');
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

// ---- Version 2: the interface resolved from the entry point (REQ-SCO-07 as amended in 1.49, task-129). ----

/** The entry point, a constant of the scorer: every scenario so far requires it. */
const ENTRY = 'src/index.ts';

/** A declaration printed as its signature: whitespace collapsed, its `export` and `default` keywords left out. */
function printed(node, source) {
  const text = printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s+/g, ' ').trim();
  return text.replace(/^export\s+/, '').replace(/^default\s+/, '');
}

/** A top-level declaration's signature whether or not it is exported; a namespace keeps its exported members. */
function declared(statement) {
  if (ts.isModuleDeclaration(statement)) {
    const ambient = hasModifier(statement, ts.SyntaxKind.DeclareKeyword);
    return f.updateModuleDeclaration(
      statement,
      statement.modifiers,
      statement.name,
      namespaceBody(statement.body, ambient),
    );
  }
  return signature(statement, true);
}

/** The names a declaration statement declares, each with its own statement to print. */
function declarations(statement) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .filter((d) => ts.isIdentifier(d.name))
      .map((d) => [
        d.name.text,
        f.updateVariableStatement(
          statement,
          statement.modifiers,
          f.updateVariableDeclarationList(statement.declarationList, [d]),
        ),
      ]);
  }
  const named =
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isImportEqualsDeclaration(statement) ||
    (ts.isModuleDeclaration(statement) && ts.isIdentifier(statement.name));
  if (!named) return [];
  const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
  const name = statement.name === undefined ? (isDefault ? '*default*' : undefined) : statement.name.text;
  return name === undefined ? [] : [[name, statement]];
}

const modules = new Map();

/** One module's imports, exports and local declarations, read once; or that it does not parse. */
function moduleOf(file) {
  const cached = modules.get(file);
  if (cached !== undefined) return cached;
  const text = readFileSync(join(root, file), 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const mod = { file, locals: new Map(), imports: new Map(), exports: new Map(), stars: [] };
  if (source.parseDiagnostics.length > 0) {
    mod.error = `${file}: (does not parse)`;
    modules.set(file, mod);
    return mod;
  }
  const addLocal = (name, signatures) =>
    mod.locals.set(name, [...(mod.locals.get(name) ?? []), ...signatures]);
  const names = overloaded(source.statements);
  for (const statement of source.statements) {
    if (isImplementation(statement, names)) continue;
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const from = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (clause?.name !== undefined) mod.imports.set(clause.name.text, { from, name: 'default' });
      const bindings = clause?.namedBindings;
      if (bindings !== undefined && ts.isNamespaceImport(bindings))
        mod.imports.set(bindings.name.text, { from, name: '*' });
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements)
          mod.imports.set(el.name.text, { from, name: (el.propertyName ?? el.name).text });
      }
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      const from =
        statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      const clause = statement.exportClause;
      if (clause === undefined) {
        if (from !== undefined) mod.stars.push(from);
      } else if (ts.isNamespaceExport(clause)) {
        if (from !== undefined) mod.exports.set(clause.name.text, { kind: 'namespace', from });
      } else {
        for (const el of clause.elements) {
          const name = (el.propertyName ?? el.name).text;
          mod.exports.set(
            el.name.text,
            from === undefined ? { kind: 'local', local: name } : { kind: 'from', from, name },
          );
        }
      }
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      const name = statement.isExportEquals ? 'export=' : 'default';
      if (ts.isIdentifier(statement.expression))
        mod.exports.set(name, { kind: 'local', local: statement.expression.text });
      else mod.exports.set(name, { kind: 'signatures', signatures: [printed(signature(statement), source)] });
      continue;
    }
    for (const [name, node] of declarations(statement)) {
      const shown = declared(node);
      if (shown !== undefined) addLocal(name, [printed(shown, source)]);
      if (isExported(statement)) {
        const exported = hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? 'default' : name;
        mod.exports.set(exported, { kind: 'local', local: name });
      }
    }
  }
  modules.set(file, mod);
  return mod;
}

/** A file of the snapshot, by its path under the root, if it is one and lies inside the root. */
function snapshotFile(path) {
  if (path.startsWith('..') || posix.isAbsolute(path)) return undefined;
  const full = join(root, path);
  if (!existsSync(full) || !statSync(full).isFile()) return undefined;
  const inside = relative(realpathSync(root), realpathSync(full));
  return inside.startsWith('..') || inside.split(sep).includes('..') ? undefined : path;
}

/** The module a relative specifier of `file` names: `.js` as its `.ts` source; extensionless or a directory. */
function resolved(file, specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return undefined;
  const base = posix.normalize(posix.join(posix.dirname(file), specifier));
  const js = /\.(m|c)?jsx?$/.exec(base);
  const candidates = js
    ? [
        base.replace(/\.js$/, '.ts'),
        base.replace(/\.js$/, '.tsx'),
        base.replace(/\.mjs$/, '.mts'),
        base.replace(/\.cjs$/, '.cts'),
        base.replace(/\.jsx$/, '.tsx'),
      ].filter((candidate) => candidate !== base)
    : /\.(m|c)?tsx?$/.test(base)
      ? [base]
      : [`${base}.ts`, `${base}.tsx`, `${base}.mts`, `${base}.cts`, `${base}/index.ts`, `${base}/index.tsx`];
  for (const candidate of candidates) {
    const found = snapshotFile(candidate);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * What `name`, exported by `file`, is: its signatures, a namespace (a module), or a special entry; undefined when the
 * module exports no such name. `seen` guards against cycles of re-exports.
 */
function exported(file, name, seen) {
  const key = `${file}#${name}`;
  if (seen.has(key)) return undefined;
  const next = new Set(seen).add(key);
  const mod = moduleOf(file);
  if (mod.error !== undefined) return { special: mod.error };
  const entry = mod.exports.get(name);
  if (entry !== undefined) {
    if (entry.kind === 'signatures') return { signatures: entry.signatures };
    if (entry.kind === 'local') return local(file, entry.local, next);
    const target = resolved(file, entry.from);
    if (target === undefined) return { special: `(unresolved ${entry.from})` };
    if (entry.kind === 'namespace') return { namespace: target };
    return exported(target, entry.name, next);
  }
  if (name === 'default') return undefined;
  for (const from of mod.stars) {
    const target = resolved(file, from);
    // A star that resolves to nothing, or to a module that does not parse, is named by namesOf: it holds no name.
    if (target === undefined || moduleOf(target).error !== undefined) continue;
    const found = exported(target, name, next);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** What a local name of `file` is: its declaration, or the import that brought it in. */
function local(file, name, seen) {
  const mod = moduleOf(file);
  const signatures = mod.locals.get(name);
  if (signatures !== undefined) return { signatures };
  const imported = mod.imports.get(name);
  if (imported === undefined) return undefined;
  const target = resolved(file, imported.from);
  if (target === undefined) return { special: `(unresolved ${imported.from})` };
  if (imported.name === '*') return { namespace: target };
  return exported(target, imported.name, seen);
}

/** The names `file` exports, `export *` followed (never its default), and the special entries met on the way. */
function namesOf(file, seen = new Set()) {
  const names = new Set();
  const specials = new Set();
  if (seen.has(file)) return { names, specials };
  const next = new Set(seen).add(file);
  const mod = moduleOf(file);
  if (mod.error !== undefined) return { names, specials: new Set([mod.error]) };
  for (const name of mod.exports.keys()) names.add(name);
  for (const from of mod.stars) {
    const target = resolved(file, from);
    if (target === undefined) {
      specials.add(`(unresolved ${from})`);
      continue;
    }
    const inner = namesOf(target, next);
    for (const name of inner.names) if (name !== 'default') names.add(name);
    for (const special of inner.specials) specials.add(special);
  }
  return { names, specials };
}

/** The entries of every name `file` exports, each prefixed with `prefix`; a namespace's names nested. */
function entriesFrom(file, prefix, out, chain = new Set()) {
  // A namespace that contains itself, directly or not, is not followed again (task-129's review).
  if (chain.has(file)) return;
  const inside = new Set(chain).add(file);
  const { names, specials } = namesOf(file);
  for (const special of specials) out.add(special);
  for (const name of names) {
    const found = exported(file, name, new Set());
    const shown = `${prefix}${name}`;
    if (found === undefined) out.add(`${shown}: (unresolved)`);
    else if (found.special !== undefined) out.add(found.special);
    else if (found.namespace !== undefined) {
      entriesFrom(found.namespace, `${shown}.`, out, inside);
    } else for (const signature of found.signatures) out.add(`${shown}: ${signature}`);
  }
}

function interfaceV2() {
  if (snapshotFile(ENTRY) === undefined) return ['(no entry point)'];
  const out = new Set();
  entriesFrom(ENTRY, '', out);
  return [...out];
}

const entries =
  spec === '--v2'
    ? interfaceV2().sort(byCodeUnit)
    : [...new Set(JSON.parse(spec).flatMap(entriesOf))].sort(byCodeUnit);
for (const entry of entries) process.stdout.write(`${JSON.stringify(entry)}\n`);
