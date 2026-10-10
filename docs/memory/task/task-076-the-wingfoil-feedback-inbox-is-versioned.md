---
id: task-076-the-wingfoil-feedback-inbox-is-versioned
type: task
title: "The WingFoil feedback inbox is versioned"
status: approved
release: v0.2
wave: W14
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02]
---

## Context

Step S1 of M3, the WingFoil feedback loop in this repository, asked by the "Meccanismo feedback wingfoil" session on
2026-10-10 and approved by the approver. It applies WingFoil's ratified **dl-163** ("consumer projects' feedback
sources and the feedback loop", `ready`, 2026-10-07) strictly (approver ruling R9). Two consumers already did it:
WingFoil-Templates (`53090c2`, task-009 and task-010) and WingFoil-UI (`1d9348d`, task-022 and task-023).

dl-163 R1: every consumer keeps `docs/wingfoil-feedback/` **versioned** on its `main`. Here the inbox,
`docs/wingfoil-feedback/X_wingfoil-usage-notes.md` (N1–N51), has been **untracked** since 2026-09-22, hidden by
`.git/info/exclude`. So no reader can tell which notes exist or which are new, and a `git clean -x` would delete it.

M3 runs between W13 (verified 2026-10-10) and W14. It is filed under W14 because W13 is closed; W14's plan phase
starts only after M3, on the approver's go. task-077 (one file per note) and task-078 (the `wingfoil-cli` directive)
follow, in that order.

**What WingFoil does with it.** Once the approver pushes `main`, WingFoil registers this repository as a `repository`
service with `feedback_inbox: docs/wingfoil-feedback/` (WingFoil task-269). One service per repository (dl-163), so
the service that already records where D01 is measured covers both. Only this repository's existence and a cite
`<svc-id>/F-<nnn>@<sha>` enter WingFoil, never the notes' content. The benchmark rule is unchanged.

**On `requirements`:** no requirement covers the project's own process. REQ-NFR-02 (everything that influences the
benchmark is in a versioned file) is the nearest; WingFoil usage notes N17 and N21 say why a required field cannot
say "none".

**No real agent, no spending.** **Done** means: the inbox file is committed on `main`, byte for byte as it was, and no
exclude rule hides `docs/wingfoil-feedback/`.

## Acceptance criteria

- `git ls-files docs/wingfoil-feedback/` lists `X_wingfoil-usage-notes.md`, and its SHA-256 on the branch equals the
  untracked file's before the change. **Characterization** (commands, recorded in the Execution notes).
- `git check-ignore -v docs/wingfoil-feedback/X_wingfoil-usage-notes.md` prints nothing (exit 1). **Characterization.**
- `npm run lint` and `npx tsc --noEmit -p .` stay green: `docs/` is outside Prettier (`.prettierignore`) and outside
  every suite. **Characterization.**

## Design

- **`.git/info/exclude`** loses its two lines `docs/wingfoil-feedback/` and `X_wingfoil-usage-notes.md`. That file is
  local to this clone and never committed, so the change is recorded in the Execution notes, with the lines removed.
- **One commit** on `task/task-076-…`, `docs(wingfoil-feedback): version the inbox unchanged (dl-163 R1)`, adds the
  file with no edit. Its content is reworked by task-077, not here, so that this commit is the fixed point the old
  inbox is read from.
- **Worktree.** The branch is created in its own worktree, as every task's is. The untracked file lives only in the
  main checkout, so it is copied into the task's worktree with `cp` and compared by SHA-256. Nothing is deleted from
  the main checkout until the merge brings the tracked file there (`git merge` refuses to overwrite an untracked
  file, so the main checkout's copy is moved aside to the scratchpad first, compared with the merged file, then
  removed).
- **No code, no test change.** The full suites are the gate of approval (kanban-delivery 5); a docs-only diff gives
  them nothing to test, so this task asks the approver whether lint and typecheck may stand in for them. If not,
  they run on demand.
- **Memory.** After the merge, the agent memory note on the untracked inbox is corrected: the inbox is versioned, one
  file per note from task-077.

## Execution notes

- `npx wingfoil memory submit task-076-…` (backlog → in-progress) on 2026-10-10, after the approver approved the three
  M3 tasks. Declared: moves the task to its next state and commits it. Observed: `status: in-progress`. Matches.
- **`.git/info/exclude`** (local, never committed): the line `docs/wingfoil-feedback/` removed. The Design named a
  second line, `X_wingfoil-usage-notes.md`; there was none (the reading that suggested it had listed the directory
  right after the file). The file is shared by every worktree of this clone.
- The untracked file copied from the main checkout into the task's worktree, and committed with no edit
  (`docs(wingfoil-feedback): version the inbox unchanged (dl-163 R1)`):
  - SHA-256 of the untracked file, of the copy, and of `git show HEAD:docs/wingfoil-feedback/X_wingfoil-usage-notes.md`:
    `ed4b2365b682049a922079249ae5614a1edef1f8340dfaeca5a222b16cdd9b3b`, all three;
  - `git ls-files docs/wingfoil-feedback/` lists it;
  - `git check-ignore -v docs/wingfoil-feedback/X_wingfoil-usage-notes.md` prints nothing, exit 1.
- Day checks, niced: `npm ci`, `npm run lint` (eslint and Prettier) exit 0, `npx tsc --noEmit -p .` exit 0.
- **Merge plan:** the main checkout still holds the untracked file, which `git merge` would refuse to overwrite. At
  delivery it is moved to the scratchpad, the merge brings the tracked file, and the two are compared by SHA-256
  before the scratchpad copy is removed.
- **Still owed at delivery:** the agent memory note on the untracked inbox is corrected after the merge (the Design's
  last item).
- **The approver's question** (the Design): whether lint and typecheck may stand in for the full suites, since the
  diff is `docs/` only. Asked at the hand-off to approval; the answer goes in the Review notes.

## Review notes

An independent read-only agent reviewed `git diff main...HEAD` against the Design, dl-163 R1, and a secret scan.

- **Round 1** (d9802fa): **clean**, no blocker, no should-fix.
  - Checked: the three SHA-256 match; nothing ignores the path (`.gitignore`, `.git/info/exclude`, no global
    excludes); the diff holds only the notes file and the task element; every Execution-notes claim reproduces; no
    credential, token or key in the file, and no personal data beyond the git author already in every commit.
  - **Nits**, both fixed in the next commit: the memory-note correction owed after the merge, and the approver's
    question on the full suites, were not recorded in the Execution notes.
- `npx wingfoil memory submit task-076-…` (in-progress → in-review). Declared: moves the task to its next state and
  commits it. Observed: see the next commit, `wf(task): submit …`.
