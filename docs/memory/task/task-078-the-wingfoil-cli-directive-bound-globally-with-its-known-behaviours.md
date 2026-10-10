---
id: task-078-the-wingfoil-cli-directive-bound-globally-with-its-known-behaviours
type: task
title: "The wingfoil-cli directive, bound globally, with its known behaviours"
status: approved
release: v0.2
wave: W14
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04]
---

## Context

Step S4b of M3 (see task-076's Context): a custom directive **`wingfoil-cli`**, bound **globally**, that says how
this repository runs the WingFoil CLI, how its notes are written and synced (WingFoil dl-163), and which surprises of
the pinned build it works around today. It follows task-077, whose notes its known behaviours cite.

The models are WingFoil-Templates' and WingFoil-UI's `.wingfoil/directives/custom/wingfoil-cli.md`. Their rules 1–7
are word for word the same in every consumer; each repository's own rules start at 8.

**On `requirements`:** as task-077 (REQ-NFR-04: the test holds the directive's links).

**Known open point.** Rule 7 names `wingfoil-sync`, whose procedure is not defined yet; WingFoil is expected to
document it in its `COLLABORATION.md` in v0.3. The rule is kept as Templates has it, and no sync is due before
WingFoil's v0.3 retrospective.

**No real agent, no spending.** **Done** means: the directive exists, created by the CLI, bound in `roles.yaml`
`global:`; every role's `directives list` reports `warnings: []`; the inbox test checks the directive.

## Acceptance criteria

- **Red-first:** `test/unit/docs/wingfoil-feedback.test.ts` gains three checks, failing before the directive exists:
  - rules 1–7 are word for word the models' (the text is held in the test as a constant, copied from
    WingFoil-Templates `53090c2`);
  - every row of `## Known behaviours` has five cells (`# | Behaviour | How to work with it | Note | WingFoil
    element`), and every note it names exists in the inbox;
  - `roles.yaml` lists `wingfoil-cli` under `global:`.
- **Characterization:** `npx wingfoil directives list --role <r> --format json` gives `warnings: []` and lists
  `wingfoil-cli` for every role of `roles.yaml` (developer, reviewer, qa, architect, product-owner, tech-lead,
  facilitator, scenario-author). Recorded in the Execution notes.

## Design

- **Created by the CLI:** `npx wingfoil directive create --name wingfoil-cli`, then its body written by hand
  (no verb writes a body). Frontmatter as the models': `id`, `name`, `type: directive`, `kind: custom`, `title:
  "Using the pinned WingFoil CLI"`, `tags`.
- **Header:** `**Version:** 1.0 · **Date:** <delivery date> · **Checked against:** wingfoil@0.2-pre-3df305e`.
  Global; applies to every role, human or agent, that runs the WingFoil CLI in this repository.
- **Rules 1–7:** copied word for word from WingFoil-Templates.
- **Rules from 8, this repository's own:**
  - 8. The pinned build is an unpublished tarball, `vendor/wingfoil-0.2-pre-3df305e.tgz`, installed as a `file:`
    devDependency; its `--version` prints `0.1.0` (F-005), so the build is named by the tarball. The pin moves only
    through a task that replaces the tarball and `package.json`'s entry, and re-checks this directive (rule 5).
  - 9. The arms' WingFoil builds (the wingfoil arm's, inside the run container) are measured, not used to govern
    this repository. Friction they show is still a note, with that build as `wingfoil_version`; a note never carries
    a run's results, which stay in the benchmark's own records.
- **Known behaviours** (0.2-pre-3df305e), seeded from the workarounds this repository uses today. Each row names its
  note (task-077) and, where WingFoil has one, its element. The seed, settled while writing:
  - `submit` commits uncommitted body edits: commit the body first, with its own message (F-012; bug-076);
  - `memory add` takes no field values: fill the frontmatter in a `docs(…)` commit before `submit` (F-029);
  - `approve`/`reject` require `--reason`, `submit` refuses one (F-038); a hand-over carries a drafted reason, never
    a placeholder (F-037);
  - `memory history` prepends template commits with `operation: null` and a `fatal:` on stderr, exit 0: read
    `git log -- <path>` for an element's trail (F-006; bug-077);
  - "illegal transition" names a misleading target: read the type's machine in `memory.yaml` (F-011);
  - a required list cannot be empty: such fields are left out of the type's `required` (F-016);
  - no verb amends an approved element: a hand edit whose commit body carries `Approver:` and `Reason:` (F-015);
  - no verb parks a task: freeing a WIP slot is a question for the approver (F-020);
  - a gate commits on the branch checked out: every approval command starts with the `cd` to its checkout (F-031);
  - `dna set` writes scalars only: list edits by hand, then `dna show` (F-013);
  - `workflow list` does not resolve phase includes nor check actions, roles and `produces`: the repository's tests
    and the reviewer check them (F-017, bug-145; F-022);
  - `--version` prints `0.1.0` (F-005);
  - no `memory validate`: `submit` is the first check (F-028);
  - `submit` subjects carry no transition: read the state from the frontmatter or `git log -p` (F-008).
- **`roles.yaml`:** `wingfoil-cli` appended to `global:`. Through `npx wingfoil directive assign` if it binds
  globally; otherwise a hand edit, recorded in the Execution notes.
- The `multi-session` directive keeps its own rules; where one overlaps a known behaviour (approval commands name
  their checkout), the row cites the note and the rule stays where it is.

## Execution notes

- `npx wingfoil memory submit task-078-…` (backlog → in-progress) on 2026-10-10, once task-077 went to in-review.
  Declared: moves the task to its next state and commits it. Observed: `status: in-progress`. Matches.
- The branch merges `task/task-077-…` (the notes the directive cites); task-077 is in review and merges first.
- **Red first:** three tests added to `test/unit/docs/wingfoil-feedback.test.ts` (rules 1–7 word for word, held as a
  constant copied from WingFoil-Templates (`830dccb` on `main`) and checked identical to WingFoil-UI `1d9348d`; five cells per
  known-behaviour row and every cited note existing; `wingfoil-cli` in `roles.yaml` `global:`). All three failed
  before the directive existed; 10 of 10 pass after.
- `npx wingfoil directive create --name wingfoil-cli`. Declared: creates the directive from the scaffold and commits
  it. Observed: `wf(directive): create wingfoil-cli`, with `name: wingfoil-cli` and `title: "Wingfoil cli"`. The body
  and the frontmatter's `name`/`title`/`tags` (as the models') were then written by hand in a `docs(directive)` commit,
  since no verb writes a body.
- **Rules 8 and 9** as the Design. **Known behaviours** W-01–W-14 as the Design's seed, each with its note and, where
  one exists, its WingFoil element (task-077's counterparts).
- `npx wingfoil directive assign --directive wingfoil-cli --role global`. Declared (help): assigns directives to a
  role "as the committed dna.yaml declares it". Observed: `error: unknown role 'global' (not defined in dna.yaml)`,
  exit 1, on `0.2-pre-3df305e` and `0.2.2`. So `roles.yaml`'s `global:` list was edited by hand
  (`chore(wingfoil): bind wingfoil-cli globally …`), as the Design allowed. Rule 3 then asks for an entry and a note:
  **F-039** (`New note (task-078).`, gap) and **W-15**.
- `npx wingfoil directives list --role <r> --format json` for developer, reviewer, qa, architect, product-owner,
  tech-lead, facilitator and scenario-author: each lists `wingfoil-cli`, and `warnings` is `[]` for all eight.
- Day checks, niced: `npm run lint` 0, `npx tsc --noEmit -p .` 0, the inbox test 10 of 10.
- **Review round 1 fixes:** rows W-16 (the bug machine's `fixed` state and `fixes`/`fixed_by`, F-023) and W-17 (no
  `waiting` states; a plan closed by `submit`, F-009); W-15 also cites F-018; W-11 also cites task-136; the test
  requires every row to be `W-<nn>` and to name at least one note; the rules' source is WingFoil-Templates' `main` at
  `830dccb` (the same text as `53090c2`, which is on a side branch). `npx wingfoil …` in these notes runs the same
  pinned build as rule 1's `npm run -s wingfoil -- …` (`package.json`'s `wingfoil` script).

## Review notes

An independent read-only agent reviewed the branch against the Design, the two models and dl-163, re-running
behaviours on the pinned build and F-039 on both builds. No suite ran; the reviewer ran the inbox test, niced.

- **Round 1** (71a1fa1): no blocker.
  - **Should-fix:**
    1. rows missing for workarounds this repository uses (F-023's `fixed` state, F-009/no `waiting` states), and F-018
       beside W-15;
    2. the test let a row name no note.
  - **Nits:** W-11 without task-136; the cited Templates commit lives on a side branch; `npx wingfoil` beside rule 1's
    `npm run -s wingfoil`.
  - Verified clean: rules 1–7 identical to both models, frontmatter as the models', rules 8–9 accurate, W-01, W-03,
    W-04, W-12, W-14 and W-15 reproduced, every note and WingFoil element existing, F-039, `roles.yaml` (one line;
    eight roles with `warnings: []`), red-first order, the Execution notes.
  - All fixed in the next commit.
- **Round 2** (b2c65ec): **clean.** W-16 and W-17 checked against `memory.yaml`, the traceability test and
  `git log -- docs/plans`; the tightened test fails on a row with no note. Two wording nits on W-17 (a `waiting` state
  can be declared but no verb leaves it; plan-002 records its go as a completion criterion) fixed in the next commit.
- **Suites:** the diff touches `.wingfoil/`, `docs/` and one unit test file. Lint, typecheck and the inbox test are
  green; the full suites gate approval (kanban-delivery 5), on demand, unless the approver lets the day checks stand
  in, as for task-076.
- `npx wingfoil memory submit task-078-…` (in-progress → in-review). Declared: moves the task to its next state and
  commits it. Observed: see the next commit, `wf(task): submit …`.
