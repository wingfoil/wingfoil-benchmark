# Project constitution

The project's rules. Every change follows them.

## Core Principles

### No new runtime dependency

Do not add a package to `dependencies` in `package.json`: the project's runtime dependencies are the
ones it already has. Development tools may go in `devDependencies`.

### TSDoc on every exported function

Every exported function has a TSDoc comment, `/** … */`, right before it: what it does, and what its
parameters are.

### No wall clock or randomness in the domain

Code under `src/domain/` does not read the clock or make random values: no `Date.now()`, no
`new Date()` without arguments, no `Math.random()`, no random identifiers.

### Errors are returned as a Result in the domain

Code under `src/domain/` never throws: an operation that can fail returns a `Result`, with an error
that says what went wrong.
