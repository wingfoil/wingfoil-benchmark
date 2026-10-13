---
id: task-086-the-wingfoil-arm-manual-reviewed-against-wingfoil-s-agents-guide
type: task
title: "The wingfoil arm manual reviewed against WingFoil's agents guide"
status: in-review
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
**6. After review round 1: the approver's choice C (2026-10-13, in chat: "C, come proposto").**
- What round 1 found: the guide's "read before you write" sent the agent to `wingfoil dna show` and `wingfoil paths`.
  Their `team` and `paths` are what the docs-control generator leaves out of `PROJECT_RULES.md` (REQ-RUN-11, T3),
  because the manual never sent the agent to them.
- What C does: the manual keeps v0.1's reads, the role's rules and the approved decisions, which the docs controls
  carry as well. This is stated as a departure from the guide. Parity holds by construction, and the generator is
  untouched.
- The departures become three:
  1. what to read and how much to record;
  2. configuration: the scenario's, never the agent's to change, where the guide lets an agent edit configuration
     through its verbs;
  3. approvals: the fixed reply carried out, never `memory reject`; the git identity holds the approver role for that
     purpose only.
- The MCP pointer names the role's Prompt `developer-session` and the decisions' resource. v0.1's `wingfoil://dna`
  goes, for the same reason.

## Execution notes

**WingFoil commands, declared vs observed:** `npx wingfoil memory submit task-086-…` was run on main (`3ab44cb`), after
the Design's own commit (`3bb0d4e`, W-01). Declared: backlog → in-progress. Observed: `{"from": "backlog", "to":
"in-progress"}`, exit 0, and one `wf(task): submit …` commit (W-14). The guide was read with
`git -C ../WingFoil2 show v0.2.2:docs/agents.md` (tag `v0.2.2` at `12537b627ce0`), which writes nothing there.

**Build** on `task/task-086` (worktree `../WingFoil2-Benchmark-wt/task-086`, its own `npm ci`):
- red first:
  - `96ef2ba` adds two tests to `test/unit/arms/manuals.test.ts`: the guide and its release named, its rules present,
    both departures stated. Both failed.
  - After that commit, the tests were changed to compare the section's words one space apart. The manual is wrapped
    Markdown, so a phrase can break across lines.
- `9113663` holds the manual, the method page's sentence in `#wingfoil-manual-process`, and that statement's added source.
- Checks, niced, as the memory now asks of a change to what users read:
  - `tsc` and `npm run lint` clean;
  - `test/unit` and `test/acceptance` green: 1539 passed, 8 skipped;
  - `npm run build` and `test:bin`: 8/8.

**Size and digest:**
- The manual grows from 1850 to 3148 bytes, so from 463 to 787 tokens by the fixed approximation `ceil(bytes ÷ 4)`.
  After review round 1 it is 3623 bytes, 906 tokens; after round 2, 3782 bytes, 946 tokens
  (REQ-RUN-12). Every wingfoil run records it.
- The arm's digest changes (REQ-FMT-13). No file in `campaigns/` pins one.
- v0.1's published execution recorded the old manual's SHA-256. The method page reads that manual from the
  repository's history (task-073), so it keeps showing the manual that ran.

**Decisions taken in the build, inside the Design:**
- The section keeps v0.1's process and approval wording word for word where they are the departures. It adds the
  guide's rules the old manual lacked: `dna show`, `paths`, invented paths or types, and refusals. (`dna show` and `paths` were removed after review round 1, by the approver's choice C.)
- The guide's §6 error table, §7 workflows and §8 set-up are not copied: the arm runs no workflow, and it is set up by
  its script.

## Review notes

### Review

**Round 1**: a fresh, independent, read-only agent (a `Plan` subagent), on `add12a9`. It read the manual against
`v0.2.2:docs/agents.md`. Verdict: not clean (four should-fix). One was a parity choice, put to the approver, who chose
C (Design item 6). Red tests `c337d6b`, fixes `832ab1b`:
1. should-fix: the manual forbade editing `.wingfoil/`, which the guide allows, without saying so, and dropped the
   guide's "commit configuration edits" rule → **fixed**: a declared departure. The configuration is the scenario's.
2. should-fix: the MCP sentence was inaccurate. `paths` has no MCP equivalent, and the directives are a Prompt →
   **fixed**: the Prompt `developer-session` and the decisions' resource.
3. should-fix: the method page under-described the change → **fixed**: the three departures, the guide's rules the
   v0.1 manual lacked, the longer manual, and what that means for a v0.1↔v0.2 comparison.
4. should-fix (parity, T3): `dna show` and `paths` sent the agent to what the docs controls do not carry → **the
   approver's choice C**: the manual keeps v0.1's reads, stated as a departure. The docs-control generator is
   unchanged, and its rationale holds again.
5. nit: exit code 2 → **fixed**: fix the command and run it again.
6. nit: `memory reject`, and the approver role of the git identity → **fixed** in the approvals departure.
7. nit: the order test could pass on the command's own `--reason` → **fixed**: it matches the reply's sentence
   followed by the command.

**Round 2** — a fresh independent read-only agent, on `e472c4b`: choice C as the Design says (parity with the
docs-control declaration holds again), the three departures faithful to the guide, the MCP pointer and the exit codes
per §5–§6, v0.1's approval wording kept. Verdict: not clean (one should-fix), all **fixed** in `2441243`:
1. should-fix: the method page called "no hand-written state change" new, which v0.1's manual already said → the rules
   really new: no hand-written `wf(...)` commit, no invented types or roles, a refusal reported.
2. nit: the decision-log resource holds every non-deprecated one → the manual says only the `approved` ones are
   decisions, and where each one's text is.
3. nit: the configuration departure understated the guide → "through its verbs or by committed edits".
4. nit: no test pinned `.wingfoil/` or the approved read → both pinned (they pin the current text).
5. nit: the Execution notes still listed `dna show` and `paths` → marked removed by choice C.

**Round 3**: a fresh, independent, read-only agent, on `a4f20e5`. It checked the MCP pointer against §5, the
configuration departure against §4 rule 6, §6 and §9, and every claim on the method page against v0.1's manual. It
also checked the size figure. Verdict: clean, with one cosmetic nit, **no change**. One line of the manual is longer
than the rest, but it renders the same, and rewrapping it would change the manual's bytes, size and digest for nothing.

### Full suites

`scripts/full-suites.sh task/task-086` on 2026-10-13, at the approver's request ("Avvia la suite"), on `1d89150` (the
in-review submit), worktree clean: `LINT 0 TEST 0 BUILD 0 BIN 0 DOCKER 0`. `npm test` 1541 passed, 8 skipped, statement
coverage 97.73 %; `test:bin` 8/8; `test:docker` 20 passed, 2 skipped. Log (main checkout):
`.cache/full-suites/2026-10-13/task_task-086-1d89150-154501.txt`. The commit after it adds only these notes.

**WingFoil command, declared vs observed:** `npx wingfoil memory submit task-086-…` on the branch: declared
in-progress → in-review; observed `{"from": "in-progress", "to": "in-review"}`, exit 0, one `wf(task): submit …`
commit (`1d89150`). No task was `in-review` before it.

