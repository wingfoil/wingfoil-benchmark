---
id: task-056-an-independent-review-in-kanban-delivery
type: task
title: "An independent review in kanban-delivery"
status: done
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-NFR-04]
---

## Context

Implements [dl-011](../decision-log/dl-011-an-independent-review-for-every-task-in-kanban-delivery.md), approved at
[rel-v0-2](../release/rel-v0-2.md)'s triage (option B). It is the first task of W12, so that every later task is reviewed under it.

**Scope:** `.wingfoil/workflows/custom/kanban-delivery.yaml` becomes version 3. Its review phase states:

- an independent, read-only agent reviews the task's branch against its Design, the requirements and its
  acceptance scenarios;
- each fix is reviewed again until clean;
- the rounds and the outcome of every finding are recorded in the task's Review notes;
- a task is not offered for approval on a self-review.

A WingFoil configuration change goes through a task, never straight to `main`.

**No real agent, no spending.** **Done** means: the workflow file at version 3, `npx wingfoil workflow list` reading
it, and the change recorded in plan-004's delivery rules.

## Acceptance criteria

- `npx wingfoil workflow list` reads `kanban-delivery` version 3 with the review phase's new text. **Characterization**
  by command.
- `npm test` stays green. **Characterization.**

## Design

dl-011 was approved as option **B** at rel-v0-2's triage (`8488c61`: "option B, independent review written into
kanban-delivery version 3, a task at the head of W12"). Option C, a check that refuses `in-review` without a Review
section, waits until WingFoil can check a section's presence: this task adds no check.

### Classification of the acceptance criteria

Both are **characterization**: no product code changes, so there is no red test to write first.

- `workflow list` is captured before the change (exit 0, empty stderr, 18 785 bytes) and after it; the difference
  must be the version and the review phase's text, and nothing else.
- `npm test` and `npm run lint` before submit; the repository's tests read only `test/fixtures/wingfoil-config/`,
  not `.wingfoil/`, so they are expected unchanged.

### What WingFoil at the pin can express

From `node_modules/wingfoil/dist/workflow/schema.d.ts`: a phase has `description`, `role`, `optional`, `actions`,
`produces`, `checks: { pre, post }`, `approval` and `fallback`. None of them names *who* performs a phase as
distinct from its role, and `checks` has no declared semantics a reader can rely on. The rule is therefore written
in the review phase's **description**, as dl-011 B says, and not as a `checks` entry WingFoil would not run.

### `kanban-delivery.yaml` (version 3)

- **`version: 3`**, and the header comment says what version 3 adds and that it implements dl-011 B.
- **`review`'s description** keeps what must hold (tests, coverage, lint, traceability, declared-vs-observed notes)
  and adds who reviews and how:
  - an independent, read-only agent (a fresh session or subagent, not the one that built the task, with no
    file-editing tools; it may run read-only and test commands) reviews the task's branch against its Design, the
    requirements it names and its acceptance scenarios;
  - every finding is fixed on the branch or recorded as a bug or decision-log (the `code-review` directive's rule);
  - each fix is reviewed again, by an independent agent, until a round finds nothing left to fix and every finding
    is fixed or recorded as an element;
  - the rounds, their reviewer and the outcome of every finding are recorded in a `### Review` subsection of the
    task's Execution notes, one entry per round (the template has no such section, and v0.1's tasks used four
    different headings for it);
  - a task is not submitted `in-progress → in-review` on a self-review.
- The header comment says the same, the Review notes' place included.
- The `fallback` (back to `build`, `in-progress`) is unchanged: a rejection by the approver starts a new round of
  build and independent review.
- No other phase changes. `role: reviewer` stays: the independent agent executes as `reviewer` (dna.yaml).

### plan-004

Its delivery rules already state the rule (dl-011). The bullet gains a pointer to where it is now declared:
`kanban-delivery` version 3's review phase.

### Commit

One `chore(wingfoil)` commit with dl-011's approval as `Approver:`/`Reason:` trailers, as task-020 did for
dl-006 (a WingFoil configuration change that implements an approver's decision, through a task).

## Execution notes

- `npx wingfoil memory add --type task --title "An independent review in kanban-delivery"` → `4d97360`. Declared:
  creates the element from the template and commits it. Observed: `wf(task): add
  task-056-an-independent-review-in-kanban-delivery`, `status: draft`. Matches.
- First `memory submit` refused: "missing required field on submit: requirements". Declared: `submit` validates the
  type's required fields before the transition. Observed: refused, no commit. Matches; the friction is that the task
  serves no product requirement; [REQ-NFR-04] is the nearest, as task-052 did (WingFoil usage notes N17, N21: a
  required field cannot say "none").
- `npx wingfoil memory submit task-056-…` → `d2c47b2`, on main after `8d18233`. Declared: `draft → pending`, one
  commit. Observed: one commit, diff limited to `status`. Matches.
- The approver's `memory approve task-056-…` → `0a86309` (`pending → backlog`, the subject names the transition).
  Matches.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-056-…` → `856408a`, in the linked worktree
  `WingFoil2-Benchmark-task-056` with its own `npm ci`. Declared: `backlog → in-progress`, one commit
  `wf(task): submit <id>`. Observed: exit 0, JSON `{"from": "backlog", "to": "in-progress"}`, one commit, one file,
  diff limited to `status`. Matches.
- `npx wingfoil workflow list`, before the change (at `fd6822e`): exit 0, empty stderr, 18 785 bytes. After
  (`26b7e3d`): exit 0, empty stderr, 19 368 bytes. The diff is exactly two lines: `kanban-delivery`'s `"version"`
  2 → 3, and the `review` phase's `description` with the new text. Declared (schema at the pin): `version` is a
  workflow field and `description` a phase field, both read verbatim. Observed: as declared. Matches.

### Build

1. `26b7e3d` (`chore(wingfoil)`, with dl-011's approval as `Approver:`/`Reason:` trailers): `kanban-delivery` 3 —
   header comment and the review phase's description, as in the Design; plan-004's delivery rule points to it.
2. No code changed. `npm test`: 77 files, 1225/1225 tests, coverage 98.04 % statements, 90.93 % branches; `npm run
   lint` clean. `test:bin` and `test:docker` not run: no CLI, runner, image or scoring change.

### Review

- **Round 1** (independent read-only agent, a fresh Explore subagent with no file-editing tools, on `93bf44e`): no
  blocking finding; it re-ran `workflow list` on both checkouts and confirmed the two-line diff, the trailers and
  plan-004's pointer. Findings and outcomes:
  1. should-fix — "A task is not submitted on a self-review" did not say which submit (the workflow has four).
     **Fixed:** "not submitted for review (in-progress → in-review)".
  2. should-fix — "the task's Review notes" named no section (the template has none; v0.1 used four headings).
     **Fixed:** "a `### Review` subsection of the task's Execution notes, one entry per round", in the workflow and
     the Design.
  3. nit — "read-only … without write tools" could be read as forbidding test commands, which the `code-review`
     directive requires. **Fixed:** "no file-editing tools; it may run read-only and test commands".
  4. nit — "until a round finds nothing to fix" left unclear whether recorded findings end the loop. **Fixed:**
     "until a round finds nothing left to fix and every finding is fixed or recorded as an element".
  5. nit — the Execution notes lacked the `memory add` hash and the main-side submit and approve. **Fixed:** added.
  After the fixes, `workflow list`: exit 0, 19 565 bytes, still a two-line diff from main (version and the review
  description).
- **Round 2** (a new independent read-only Explore subagent, on `f8e2690`): no blocking finding; it verified the five
  round-1 outcomes, every hash and transition in the Execution notes, and `workflow list` on both checkouts (exit 0,
  18 785 vs 19 565 bytes, a two-line diff). Findings and outcomes:
  1. should-fix — the header comment still said "the task's Review notes". **Fixed:** it names the `### Review`
     subsection of the Execution notes.
  2. nit — "not submitted for review (in-progress → in-review) … Then in-progress → in-review" named the transition
     twice. **Fixed:** "Then, never on a self-review, in-progress → in-review; …".
  3. nit — lines edited in round 1 ran past the file's 120-column wrap. **Fixed:** re-wrapped.
  After the fixes, `workflow list`: exit 0, empty stderr, 19 509 bytes, still a two-line diff from main.
- **Round 3** (a new independent read-only Explore subagent, on `25f868f`): **clean** — no blocking and no
  should-fix finding. It verified round 2's three outcomes, the review phase against dl-011 B, the Design, the
  header comment, the fallback and the `code-review` directive, and `workflow list` on both checkouts (exit 0, empty
  stderr, 18 785 vs 19 509 bytes, two-line diff). One optional nit: the Context's Scope still says "the task's
  Review notes". **Not changed:** the Context is the text approved at the pending → backlog gate; the Design states
  the place.
- Final checks on `25f868f`: `npm test` 1225/1225, coverage 98.04 % statements, 90.93 % branches; `npm run lint`
  clean.

### Review and approval

- `npx wingfoil memory submit task-056-…` → `fd83621`. Declared: `in-progress → in-review`, one commit. Observed: exit
  0, JSON `{"from": "in-progress", "to": "in-review"}`, one commit, one file, diff limited to `status`. Matches.
- The approver's `memory approve task-056-… --reason "<motivo>"`, run from this worktree (`in-review → approved`,
  `Approver:`/`Reason:` trailers, only `status` changed). Matches. The recorded reason was the placeholder of the
  command the agent handed over, left as written; the approval itself was confirmed in chat ("approvato, procedi",
  2026-10-05). **Reason rewritten at the approver's request** ("correggi il commit", then "Riscrivi tu i 5 commit",
  2026-10-05): the approval commit was amended to carry a reason and the four local commits above it replayed, with
  identical trees, before anything was pushed (origin/main was at `fd6822e`); task-057's branch was rebased with
  `--onto`. The approval is now `c327fed` (it was `68c4a80`). From now on the handed-over command carries a drafted
  reason, not a placeholder (usage note N50; the `multi-session` directive, task-057).
- The agent's `memory approve`, run at the approver's request after that approval had already landed: refused,
  `illegal transition approved -> backlog for type 'task'`, exit 1, no commit. Declared: `approve` takes the
  state's approval edge. Observed: refused, rightly, but the message names `backlog`, a target `approve` never
  reaches from `approved` (usage note N49).
- Merged into main with `--no-ff` → `d257ca1` (was `286968f` before the rewrite).
- `npx wingfoil memory submit task-056-…` on main → `4db9898` (was `cfb80b6`). Declared: `approved → done`, one commit. Observed:
  exit 0, JSON `{"from": "approved", "to": "done"}`, one file, diff limited to `status`. Matches.
- Worktree removed after `git status --ignored`: only `coverage/` and `node_modules/`, both regenerable.
