# Project rules

This file is generated from the wingfoil arm's configuration for this scenario. It holds the
project's description, its rules and the decisions already taken.

## Project

Methodology: Kanban

- Methodologies: Kanban, Specification by Example (BDD), TDD

## Rules

Each rule names the roles it is for. Follow the rules for the role a step of the work is done in, and those for every role.

### Architecture

For: architect, tech-lead.

#### Directive — Architecture

Applies to architects and the tech lead.

- Record every significant architectural decision as an ADR stating its context, the decision and its consequences.
- Every architectural decision references the requirement or requirements it implements.
- Keep modules cohesive and loosely coupled; a change in one module must not force edits in unrelated ones.
- Write a technical specification for every shared file format, schema, constant set or module API before the work that implements it starts.
- Before approving a specification or an ADR, check that it is internally consistent, consistent with the already-approved specifications, aligned with the acceptance criteria, and traceable to its requirements.

> Built-in WingFoil directive template. It cannot be removed. To adapt it, create
> `directives/custom/architecture.md` with `id: architecture`: a custom directive with the same id takes
> precedence over this one, and `wingfoil directives list` reports the override.

### Code Quality

For: developer.

#### Directive — Code Quality

Applies to every role that writes or changes code.

- The linter reports no errors; warnings are triaged before a change is merged.
- Prefer small, single-responsibility functions and modules; keep complexity low.
- No dead code and no commented-out blocks.
- Match the style, naming and idioms of the surrounding code.
- Give public interfaces explicit types and validate external input at system boundaries.
- Keep each commit to one logical change with a descriptive message.

> Built-in WingFoil directive template. It cannot be removed. To adapt it, create
> `directives/custom/code-quality.md` with `id: code-quality`: a custom directive with the same id takes
> precedence over this one, and `wingfoil directives list` reports the override.

### Code Review

For: reviewer, tech-lead.

#### Directive — Code Review

Applies to reviewers and to whoever holds approval authority.

- Check every change for correctness, tests that are present and passing, adherence to the other directives, and the absence of secrets.
- Verify the change satisfies the acceptance criteria of the task it implements.
- Verify claims by running the command that settles them; do not accept a statement about a file or test without checking it.
- Every finding is either fixed in the change or recorded as a tracked element (a bug or a decision-log); never leave a finding only in review notes.
- Approve or reject with a recorded reason; a rejection states what must change before resubmitting.
- Approval authority belongs to a role, not to a person; AI agents never approve their own work.

> Built-in WingFoil directive template. It cannot be removed. To adapt it, create
> `directives/custom/code-review.md` with `id: code-review`: a custom directive with the same id takes
> precedence over this one, and `wingfoil directives list` reports the override.

### Determinism

For: architect, developer.

#### Determinism

No wall-clock, randomness, or unordered iteration in context-building paths; prefer declared config.

<!-- Tailor this rule to your project's needs. Directives are auto-loaded per role (roles.yaml). -->

### Documentation versioning

For: every role.

#### Documentation versioning

Bump a document version once per change merged to the default branch, on its first edit since then; update its date when bumping.

<!-- Tailor this rule to your project's needs. Directives are auto-loaded per role (roles.yaml). -->

### Documentation

For: every role.

#### Directive — Documentation

Applies to every role.

- Document every user-facing command and feature before it ships.
- Update the affected documentation in the same change that alters behaviour.
- Every public or exported API element carries a doc comment.
- Record decisions in project memory (ADRs for architectural decisions, decision-logs for product and process decisions), not scattered through the codebase.
- Keep cross-references between documents intact.
- Document why, not only what.

> Built-in WingFoil directive template. It cannot be removed. To adapt it, create
> `directives/custom/documentation.md` with `id: documentation`: a custom directive with the same id takes
> precedence over this one, and `wingfoil directives list` reports the override.

### Security

For: every role.

#### Directive — Security

Applies to every role.

- Never hardcode credentials, tokens, private keys or other secrets in source code, configuration, documentation or project memory.
- Keep secrets out of version control; supply them at runtime from the environment or a secret manager.
- When an example needs a credential, describe it in words or use an obvious placeholder; never paste a real value.
- Validate and sanitize all external input at trust boundaries.
- Grant the least privilege each component needs.
- Review dependencies for known vulnerabilities before adding or upgrading them.

> Built-in WingFoil directive template. It cannot be removed. To adapt it, create
> `directives/custom/security.md` with `id: security`: a custom directive with the same id takes
> precedence over this one, and `wingfoil directives list` reports the override.

### Secret hygiene

For: every role.

#### Secret hygiene

Never commit credentials or secrets; the repository is the single source of truth and is shared.

<!-- Tailor this rule to your project's needs. Directives are auto-loaded per role (roles.yaml). -->

### Testing

For: developer, qa.

#### Directive — Testing

Applies to developers and QA.

- Test first: write a failing test before the implementation (red, green, refactor).
- Classify each acceptance criterion before testing it: red-first when the behaviour is new, characterization when the behaviour already exists and the test is expected to pass on its first run. Never fabricate a failing test or add dead code to force one.
- Every behaviour has at least one happy-path test and one edge- or error-path test.
- Keep coverage at or above the threshold the project declares; coverage must not regress.
- Tests are deterministic and isolated: no reliance on external services, wall-clock time or randomness.

> Built-in WingFoil directive template. It cannot be removed. To adapt it, create
> `directives/custom/testing.md` with `id: testing`: a custom directive with the same id takes
> precedence over this one, and `wingfoil directives list` reports the override.

### Traceability

For: architect, product-owner, reviewer.

#### Traceability

Maintain the feature -> story -> acceptance -> requirement -> task chain across every change.

<!-- Tailor this rule to your project's needs. Directives are auto-loaded per role (roles.yaml). -->

## Process

### adr-ingest

Capture an ADR on demand

1. **capture** — Write the adr and submit it for approval.
2. **approve** — Approve the adr (approval gate; a reject sends it back to capture).

### bug-ingest

Capture a bug on demand

1. **capture** — Write the bug and submit it for approval.
2. **approve** — Approve the bug (approval gate; a reject sends it back to capture).

### decision-log-ingest

Capture a decision-log on demand

1. **capture** — Write the decision-log and submit it for approval.
2. **approve** — Approve the decision-log (approval gate; a reject sends it back to capture).

### kanban-delivery

Kanban delivery loop

1. **plan** — Select the next slice of work: write each item as a task and submit it.
2. **build** — Implement the work test-first (TDD).
3. **review** — Review against the directives; run unit + acceptance tests; the approver approves each task.
4. **deliver** — Integrate the completed work.

### sw-life-cycle

The end-to-end software life cycle

1. **inception** — Agree the product's vision, scope and first features.
2. **specification** — Turn the scope into stories and acceptance criteria.
3. **delivery**
4. **sunset** — Retire the product: announce the end of support and archive its Memory.
