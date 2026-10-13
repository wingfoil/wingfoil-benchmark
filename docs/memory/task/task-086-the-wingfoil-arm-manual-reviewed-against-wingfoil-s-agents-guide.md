---
id: task-086-the-wingfoil-arm-manual-reviewed-against-wingfoil-s-agents-guide
type: task
title: "The wingfoil arm manual reviewed against WingFoil's agents guide"
status: backlog
release: v0.2
wave: W14
features: []
acceptance: []
requirements: [REQ-RUN-12, REQ-FMT-13]
fixes: []
---

## Context

A smaller item left by v0.1's Retrospective and named in rel-v0-2's Scope: "v0.2's wingfoil arm manual is
reviewed against WingFoil's `docs/agents.md` at the pinned tag (N43)". `arms/wingfoil/manual.md` has not changed
since 2026-09-25 (`c03020c`). The gap on WingFoil's side is inbox note F-033 (no level of process, no place for an
automated approver).

**Scope:** read `docs/agents.md` at WingFoil `v0.2.2` (the build the wingfoil arm measures); revise the manual so that
it starts from that guide, and state where and why it departs (the arm's automated approver, REQ-RUN-17; the level of
process the arm chooses). The manual is copied as `CLAUDE.md` (REQ-RUN-12), so the arm digest (REQ-FMT-13) changes:
this lands before calibration, so that every v0.2 dry run measures the revised manual, and the method page says
which manual ran.

**On `features`:** a knowledge and arm task, no feature (as task-004); `acceptance` stays empty. **Done** means: the
manual revised, its departures listed in the method page, the arm's tests green.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- The manual's revision and its departures, checked by the arm's tests (`test/unit/arms/manuals.test.ts`, amended
  **red first**: the guide named, its rules present, both departures stated) and by the independent reviewer against
  WingFoil's `docs/agents.md` at `v0.2.2` (`12537b62`).

## Design

**Fixes:** none. Feature: none (a knowledge and arm task, as task-004).

**1. The source.** WingFoil's `docs/agents.md` at tag `v0.2.2` (commit `12537b627ce0`), the build the wingfoil arm
measures, read from the local clone with `git show v0.2.2:docs/agents.md`. Nothing is written to that repository.

**2. What changes in `arms/wingfoil/manual.md`.** Only its "## This arm" section changes. The common core, the
baseline manual byte for byte, stays as it is (F2.7's parity rule, tested). The section is rewritten to start from the
guide and says so: "This section follows WingFoil's guide for AI agents, release 0.2.2". It keeps the guide's order:
- the mental model in brief: a document's state is its `status:`; moves only through the verbs; one operation, one
  commit; roles, not people;
- the guide's rules (§4):
  - load your role's directives (`wingfoil directives list --role developer`);
  - read before you write (`wingfoil dna show`, `wingfoil paths`, the approved decisions);
  - change state only through the verbs, never by editing `status:`, a `wf(...)` commit or `.wingfoil/`;
  - commit configuration edits before relying on them;
  - do not bypass a refusal: an exit 1 is a rule speaking, and the agent reports it;
- reading through the MCP resources, or the CLI;
- writing with `memory add` and `memory submit`;
- the CLI called as `wingfoil`, never `npx wingfoil` (adr-003 decision 3, tested).

**3. The departures**, each stated in the manual as a departure from the guide, and why (they are F-033's gap):
- **the level of process.** The guide sets no level. This arm records each request as a task and each design decision
  as a decision-log, submitted, as v0.1's manual did. The process is unchanged, so that v0.2 measures the same use of
  WingFoil as v0.1.
- **the automated approver** (REQ-RUN-17). The guide says an agent never approves. In this arm the decision is the
  neutral approver's fixed policy, and the agent carries it out: the agent never approves on its own initiative; it
  asks and stops; after "Approved. Proceed." it runs `wingfoil memory approve <id> --reason "Approved. Proceed."` for
  the document it asked about. The arm's configuration gives the container the approver role for that purpose. The
  wording of this departure keeps v0.1's behaviour exactly.

**4. The method page** (`site-content/method.md`, `#wingfoil-manual-process`): one sentence names the guide and its
release, and says the manual departs from it in these two places. The statement's registered sources in
`test/unit/site/method-statements.test.ts` add "task-086 Design". The page's "This execution" section already names
the manual each execution ran by its SHA-256 (REQ-RUN-12, task-046), so that v0.1's and v0.2's are told apart.

**5. Consequences:**
- the arm digest of `wingfoil` changes (REQ-FMT-13). No campaign file in `campaigns/` pins it today (v0.1's files
  have no `arm_digests`), so nothing is refused. v0.2's calibration pins the new digest.
- The manual grows, measured per run (REQ-RUN-12): its size in tokens before and after is recorded in the Execution
  notes.
- baseline-docs and the other controls borrow the baseline-docs manual, not this one: they are untouched.
- F-033 stays `open`: only a WingFoil sync changes a note's status (the `wingfoil-cli` directive, rule 6).

**Tests** (red first): `manuals.test.ts` asserts that the wingfoil manual:
- names the guide and its release;
- states the guide's rules: read before you write, only the verbs, do not bypass a refusal;
- states both departures, with the approval command only after the reply.

The existing tests stay: the core, `npx`, no MCP Tool, the approval command. The method-statements test checks the
new sentence's anchor sources.
## Execution notes

## Review notes
