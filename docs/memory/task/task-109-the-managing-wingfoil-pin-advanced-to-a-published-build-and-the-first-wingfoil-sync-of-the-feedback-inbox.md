---
id: task-109-the-managing-wingfoil-pin-advanced-to-a-published-build-and-the-first-wingfoil-sync-of-the-feedback-inbox
type: task
title: "The managing WingFoil pin advanced to a published build, and the first wingfoil-sync of the feedback inbox"
status: in-progress
release: v0.3
wave: W15
features: []
acceptance: []
requirements: [REQ-NFR-02]
fixes: []
tags: ["v0.3","wingfoil","governance"]
---

## Context

The WingFoil build that **manages this repository** (its Memory, workflows and directives; not the builds the arms run
inside their containers, `wingfoil-cli` rule 9) is still the unpublished development tarball
`vendor/wingfoil-0.2-pre-3df305e.tgz`, a `file:` devDependency that prints `0.1.0` for `--version` (F-005).
[plan-005](../../plans/plan-005-release-v0-3.md) puts **the first `wingfoil-sync` of the feedback inbox together with
advancing that pin**, in one task, in W15 after the Codex campaign started (the approver's decision of 2026-10-24).
The inbox (`docs/wingfoil-feedback/`, 42 notes F-001 to F-042, WingFoil dl-163) has never been synced
("**Last sync:** none").

WingFoil now documents both halves (its bug-408, fixed on `release/0.3` for 0.3.1): `COLLABORATION.md` §"Contributor
setup" (a published build pinned as `npm:wingfoil@<version>`, moved forward only, one commit per switch) and §"The
sync points" / §"The sync procedure" (read the newest retrospective's `## Consumer feedback` table and its triage
record, find every element citing `svc-020…/F-<nnn>`, update each note's `status` and `answered_by` by the published
mapping, commit). On 2026-10-27 npm publishes `0.2.1`, `0.2.2` and `0.3.0` (`latest`); 0.3.1 is not yet published.

**No real-agent session. Spending: 0 €.**

**Done** means: the managing build is a published WingFoil version, every Memory, workflow and directive operation
this repository uses checked on it; every note of the inbox synced against WingFoil's published answers, the sync
recorded; the `wingfoil-cli` directive re-checked against the new pin.

## Acceptance criteria

1. **The pin:** `package.json`'s devDependency becomes the newest published version at the task's start
   (`npm:wingfoil@0.3.0` today; `0.3.1` if it is published by then), the vendored tarball removed, `npm ci` and
   `npm run -s wingfoil -- --version` printing that version. **Characterization.**
2. **This repository on it:** `memory search`, `add`, `submit`, `approve`, `reject`, `deprecate` (on throwaway
   elements in a scratch clone, never on main's Memory), `workflow list` and the custom workflows
   (`campaign-cycle`, kanban-delivery v6) and directives read; each difference from 0.2-pre recorded declared against
   observed; anything that breaks fixed, or the pin held back and the reason recorded. **Spike.**
3. **`bench finding`'s templates** (`src/results/finding.ts`: WingFoil's `bug` and `decision-log` templates "of the
   development pin `3df305e`, byte for byte") re-checked against the new pin, and updated with their test if they
   differ. **Red-first** if they differ, **characterization** otherwise.
4. **The sync**, by `COLLABORATION.md`'s procedure: WingFoil fetched with its tags; the `## Consumer feedback` table of
   `retro-v0.3.md` and its triage record read at a named commit; every element citing `svc-020…/F-` listed; each of
   F-001 to F-042 given its `status` and `answered_by` by the published mapping only, never by judgement (rule 6);
   the notes WingFoil did not read left `open`. **Characterization** (documents).
5. **F-011's evidence:** the spurious `illegal transition …` that `memory approve` printed after a correct transition
   during v0.3 (task-100, campaign-004's gates) added to F-011, or the note answered if the new pin no longer prints
   it. **Characterization.**
6. **The record:** `docs/wingfoil-feedback/README.md`'s "**Last sync:**" and ledger; the `wingfoil-cli` directive's
   rules 5 and 8 rewritten for a published pin, its version and *Checked against* bumped. **Characterization.**

## Design

- **The pin's target:** the newest published version when the task starts; 0.3.1 if published, since it carries
  bug-408's documentation and bug-400's scaffold. If 0.3.1 is published during the task, a second, one-commit bump
  follows, with a second sync (WingFoil's rule: one commit per switch, a sync at every pin bump).
- **The scratch clone** for criterion 2: `git clone` of this repository into a `mktemp` directory, so that no test
  element ever lands on main; the worktree's own Memory is touched only by the task's real elements.
- **The sync is mechanical:** a script reads the retrospective's table and the `git grep` of citations, and prints the
  status each note gets by the mapping; the note files are edited from that output, never by hand-reading.
- **Not in this task:** the arms' WingFoil builds (v0.3.0 for the arms, step A's 0.3.1 in task-107), and any new
  note's content beyond what criterion 2 finds.

## Execution notes

- Drafted and submitted on main (2026-10-27); pending → backlog by the approver. **The approver's decision in chat
  (2026-10-27): the task starts only once WingFoil `v0.3.1` is tagged**, so that the pin goes straight to 0.3.1 (with
  bug-408's `COLLABORATION.md` and bug-400's scaffold) and one bump and one sync suffice.
- **Started** 2026-10-27 (backlog → in-progress, `d867e91b`), in the worktree `task/task-109`; npm's `latest` was
  `0.3.1` (`v0.3.1` = `870bd440` on WingFoil's `release/0.3`), so one bump and one sync.

### Criterion 1 — the pin

- `package.json`: `"wingfoil": "npm:wingfoil@0.3.1"`; `vendor/` removed (the tarball and its README, and its
  entries in `.prettierignore` and `eslint.config.js`); `README.md`'s Tooling says how the pin moves. The lockfile
  changes only WingFoil's own dependencies. `npm ci`, then `npm run -s wingfoil -- --version` →
  `0.3.1 (870bd4406f3b9bba5ecde7a5f8198b80c2a98583)` (`833dc07e`). The script named `wingfoil` stays, so
  `npm run -s wingfoil -- …` is unchanged.

### Criterion 2 — this repository on 0.3.1 (spike)

Two `git clone`s of the branch in a `mktemp` directory of the session's scratchpad, no remote, the same script on
each: `0.3.1` (this worktree's `node_modules`) and `0.2-pre-3df305e` (main's `node_modules`), on throwaway tasks, a
bug and a decision-log: `memory search`, `add`, `submit`, `approve`, `reject`, `park`, `deprecate`, `history`;
`workflow list`, `workflow show campaign-cycle` and `kanban-delivery`; `directives list` for developer, reviewer and
approver. Declared is WingFoil's `CHANGELOG.md` at `v0.3.1` (0.3.0's "Changed" and "Upgrading from 0.2.x").

- **Broke, fixed here (`0684b771`):** `memory submit` of a task refused `requirements: [REQ-NFR-02]` as missing
  (0.2-pre: moved it). Declared only as an addition (`[]` accepted on a field in `template.frontmatter.lists`, bug-147).
  `memory.yaml` now lists `task.requirements` and `release.waves`, `features`.
- **Broke, fixed here (`0684b771`):** `workflow list`, and `workflow show` for every workflow, exit 1 with
  `E_PHASE_PRODUCES_NOT_A_PATH` on `release-cycle`'s retrospective `produces: "release element: ## Retrospective
  section"` (0.2-pre: exit 0). Not declared. `release-cycle` 6: `docs/memory/release/{id}.md`. After the fix
  `workflow list` gives `diagnostics: []`. The two omissions are note **F-045**.
- **As declared:** `--version` names the build; `workflow list` is `{baseline, workflows, diagnostics}`, the sub
  workflows in `workflow show`; illegal transitions name `(none)` with a reason line; `submit` carries uncommitted
  edits with a `Carries content:` body; `approve` refuses an element with uncommitted edits (0.2-pre committed them);
  `memory history` has no template commits and no `fatal:` (the one `operation: null` is the element's own hand
  commit); includes, roles and memory types in actions are checked (`E_WORKFLOW_FILE_NOT_FOUND`,
  `E_PHASE_ROLE_UNKNOWN`, `E_WORKFLOW_ELEMENT_TYPE_UNKNOWN` on a deliberately broken copy); `dna add/update/remove`;
  `submit --dry-run`; an unknown option exits 2 (0.2-pre: 1).
- **Unchanged:** `memory add` takes no field values (`--release` refused); `submit` takes no `--reason`;
  `directive assign --role global` refused; `submit` subjects carry no bracket.
- **New verbs not adopted:** `memory amend` refuses (no type declares `amendable`), `memory park` refuses (the task
  machine has no `returns:` edge). Adopting either is a configuration decision, left out of this task (W-07, W-08).
- Every other operation gave the same states and commits as on 0.2-pre: the pin is not held back.

### Criterion 3 — `bench finding`'s templates

WingFoil's `.wingfoil/memory/templates/bug.md` and `decision-log.md` differ from `v0.2.2`'s at `v0.3.0` and are
byte-identical at `v0.3.1`: an optional `reported_by` field, a comment on `memory add`, and in the bug a
`### Retrospective` subsection closing Triage & Execution Notes. REQ-RES-05 names the templates of the release the
reference campaign runs, which since task-095 is `v0.3.0`: red test `7c176fc9`, then `e5881a76` (the bug block's
Retrospective subsection, `v0.3.0 (cc31d7a8)` named), requirements **1.40**.

### Criterion 4 — the sync

`scripts/wingfoil-sync.mjs` (`298a40f3`, with its test) after `git fetch --tags origin` in WingFoil's checkout,
`node scripts/wingfoil-sync.mjs ../WingFoil2 v0.3.1 --write` (`df51bc9c`): records read at `v0.3.1`
(`retro-v0.3.md`, identical at `origin/main`; `rel-v0.3-feedback-triage.md`, this inbox read at `2ff5116f`, F-001 to
F-039), `patch-v0.3.1`'s scope changes (no note), citations at `origin/main` `334a2887` (bug-400, bug-409, bug-410,
dl-192, dl-197, dl-200, dl-201: each one the table names). Only this service's rows are read. A `captured`
note is `resolved` when each element is, at `v0.3.1`, in its type's shipped state (a bug `closed`, a task `done`, a
decision-log `ready`, an ADR `accepted`, a tech-spec `approved`; no other type) and its `release:` is a tag no later
than the pin; a note captured at an earlier sync is re-checked so.
Outcome: 24 `resolved`,
7 `captured`, 4 `needs-info` (F-007, F-009, F-023, F-034), 4 `open` (restated, no element: F-030, F-031, F-035,
F-037), F-040 to F-044 `open` (not read). Only `status` and `answered_by` changed (35 notes).
**Left for the approver:** COLLABORATION.md says a consumer answers a `needs-info` in the note; the four answers
change note content, which this task does not.

### Criterion 5 — F-011

Not reproduced on either build in a scratch clone, through `node` or `npm run -s wingfoil` (0.2-pre: `approve`
in-review → approved, exit 0, one commit, nothing on stderr). A **second** `approve` on the approved task printed, on
0.2-pre, exactly the text task-100, task-102 and campaign-004 recorded (`illegal transition approved -> backlog for
type 'task'`, exit 1), so those messages were most likely a second run of the gate command, F-011's own case. On
0.3.1 the same second run prints `illegal transition approved -> (none) for type 'task'` and why. The sync answers
F-011 (`superseded` → `resolved`); its content is not changed. Unexplained: the exit 2 task-100 recorded.

### Criterion 6 — the record

The inbox README's **Last sync** and ledger (`df51bc9c`); the `wingfoil-cli` directive 1.1, checked against
`wingfoil@0.3.1` (`870bd440`): rule 8 rewritten for a published pin; W-04, W-05, W-06, W-10, W-11, W-12 removed as
fixed; W-01, W-07, W-08, W-13 updated; W-18, W-19 added (F-045). **Rule 5 not rewritten:** rules 1–7 are word for
word the same in every consumer (`wingfoil-feedback.test.ts`), and rule 5 already holds for a published pin; the
pin-specific text is rule 8's.

- Checks: `npm run -s lint`, `tsc`, `scripts/pre-review.sh main` green; `test/unit/docs`, `test/unit/scripts`,
  `test/unit/results` and the traceability test green (198 tests). No real-agent session: 0 €.

### Review

- **Round 1** (independent read-only agent, `cd "$(mktemp -d)"`, on `21a5754a`): no blocker; it recomputed the sync
  from the published records and found every note's status, `answered_by` and ledger row right, and no note changed
  beyond the two fields. Five should-fix:
  1. `lists` makes `[]` filled, so `task.requirements` and `release.waves`/`features` could be empty, and the
     `memory.yaml` comment was stale. Fixed: the comment; `test/unit/docs/required-lists.test.ts` keeps a task's
     `requirements`, and a release's `waves` and `features` past `draft`, non-empty; F-045 says 0.3 cannot express a
     required non-empty list.
  2. `release-cycle`'s retrospective now names the release element, which exists from planning, so its evidence is
     always present (0.2's prose never matched a file). **Left for the approver:** what closes the phase (a document
     of its own, an approval, or nothing); W-19 says so.
  3. The sync left a `captured` note without a row of the newest retrospective unchanged, so it would never become
     `resolved`. Fixed: such a note is re-checked against its own `answered_by`; tested.
  4. A stamped `release:` is a target, not proof of shipping. Fixed: the element must also be in its type's shipped
     state at the ref; tested. This sync's outcome is unchanged.
  5. The four `needs-info` notes have no scheduled answer. **Left for the approver** (as in criterion 4).
  Nits fixed: W-02 names `--set`; the README's and these notes' wording on the citations; `01_product-brief.md` and
  a test comment no longer call the tarball the pin; a JSDoc name; tests for an unknown decision and a two-element row;
  F-045 cites the user guide's upgrade section too. Nit accepted for the approver: rule 5 not rewritten (criterion 6).
  Not changed: the README's Origin paragraph, which is history.
- **Round 2** (re-review of `4ba408cc` only): fixes 1, 3 and 4 correct; the real data give the same outcome for all 45
  notes. One should-fix: "the last state of the sequence" is wrong for an ADR and a tech-spec (their sequences end at
  `superseded`) and a change-proposal (`scheduled`). Fixed: an explicit map of each type's shipped state, any other
  type never shipped; tested with a change-proposal, an element not found, and a note captured earlier whose element
  has not shipped. Nits fixed: W-02's wording (`--set` sets `id_pattern` and `path` tokens); the second sync's test
  checks every note's two fields as well as the ledger.
- **Round 3** (re-review of `8bdde20a` only): the map matches WingFoil's sequences, the tests fail on the old rule,
  the real data unchanged (24, 7, 4, 10). Nits only, which closes the review (dl-020); applied: W-02 names `title`,
  `tags` and the initial `status`; a test comment; the script says that an ADR or tech-spec superseded since keeps
  its note `captured`.
