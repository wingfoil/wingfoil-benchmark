---
id: task-088-the-feedback-inbox-readme-cites-a-note-with-the-full-service-id-and-full-sha
type: task
title: "The feedback inbox README cites a note with the full service id and full sha"
status: in-review
release: v0.2
wave: W14
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02]
fixes: [bug-019-the-feedback-inbox-readme-cites-a-note-with-the-short-source-key-and-an-unspecified-sha]
---

## Context

Fixes [bug-019](../bug/bug-019-the-feedback-inbox-readme-cites-a-note-with-the-short-source-key-and-an-unspecified-sha.md).
Asked on 2026-10-11 by the "Coordinamento WFCoord stato processi" session and confirmed by the approver the same day
("sì, a fine W14 come proposto"). Filed under W14, after W14's verification (`894ee03`), as task-087 was. It is not one
of W14's eight planned tasks.

WingFoil's `COLLABORATION.md` `## Credit` (its task-271, `9ee64234e12f49178acc03ed7e7c4383fc25d73c`) cites a note of a
registered inbox as `<service id>/F-<nnn>@<sha>`: the service's full id and the full sha of the consumer commit read.
The inbox README still says `<source key>/F-<nnn>@<sha>`.

**On `requirements`:** as task-076 and task-087 (REQ-NFR-02, the nearest; no requirement covers the project's own
process).

**No real agent, no spending.** **Done** means: the README states the full citation form, merged on main; the
coordination session told the element id, the merge sha and the push state. The push is the approver's.

## Acceptance criteria

- The README cites a note as `<service id>/F-<nnn>@<sha>`, with the full service id and the full sha, and gives the
  example `svc-020-github-repository-wingfoil-benchmark-the-benchmark-consumer-project-and-its-feedback-inbox/F-001@<full sha>`.
  **Red-first**: the inbox test (`test/unit/docs/wingfoil-feedback.test.ts`) gains an assertion that the README
  carries that example and no longer the `<source key>/F-<nnn>@<sha>` form; it fails on main.
- `svc-020` stays the README's short key: `**Source key:** svc-020`, with the full id beside it, is unchanged.
  **Characterization**: the existing `**Source key:**` assertion stays green.
- `**Last sync:** none` is unchanged: this is not a sync (directive `wingfoil-cli`, rule 7). **Characterization.**

## Design

- `docs/wingfoil-feedback/README.md`: the Source key paragraph's last sentence becomes "WingFoil cites a note of this
  inbox as `<service id>/F-<nnn>@<sha>`, with the service's full id and the full sha of the commit it read (WingFoil
  `COLLABORATION.md`, `## Credit`), for example
  `svc-020-github-repository-wingfoil-benchmark-the-benchmark-consumer-project-and-its-feedback-inbox/F-001@<full sha>`."
- `test/unit/docs/wingfoil-feedback.test.ts`: one assertion in the ledger test, beside the `**Source key:**` one,
  committed red before the README changes.
- Branch and worktree as every task; day checks: lint, typecheck, the inbox test; an independent review. The full
  suites only if the approver asks: the diff is `docs/` and one unit test.
- After the merge: the approver pushes; the coordination session is told the element id, the merge sha and the push
  state.

## Execution notes

- `npx wingfoil memory add --type bug` and `--type task` on 2026-10-13. Declared: create a draft element with the type's
  scaffold and commit it. Observed: `bug-019-…` and `task-088-…` as drafts, required fields empty (W-02); filled in
  `docs(…)` commits before `submit` (W-01).
- `npx wingfoil memory submit` for both (draft → pending). Declared: moves the element to its next state and commits
  it. Observed: `status: pending` for each, `wf(…): submit …` commits. Matches.
- The approver approved bug-019 (pending → approved, `effb906`) and task-088 (pending → backlog, `12cf803`).
- `npx wingfoil memory submit task-088-…` (backlog → in-progress) on main. Declared as above. Observed:
  `status: in-progress` (`1273ea8`). Matches.
- Worktree `../WingFoil2-Benchmark-wt/task-088-…` on `task/task-088-…`, its own `npm ci` (exit 0).
- WingFoil's `## Credit` read on its `origin/main` (`32d8871b`, 2026-10-13); the sentence came with task-271,
  `9ee64234e12f49178acc03ed7e7c4383fc25d73c`.
- Red (`d6b36b2`): the inbox test 1 failed, 9 passed: the README lacks the full example.
- Green (`5aa2030`): the Source key paragraph's last sentence as the Design says (3 insertions, 1 deletion);
  `**Source key:** svc-020` and `**Last sync:** none` unchanged. The `wingfoil-cli` directive's rule 6 already
  reads `<service id>/F-<nnn>@<sha>` and is untouched; no other file cites the old form.
- Day checks, niced: the inbox test 10 of 10, `npm run lint` 0, `npx tsc --noEmit -p .` 0.
- The Design says "one assertion"; the test adds two `expect` calls in the ledger test, the example present and the old
  form absent (review round 1, nit 1). The Design is left as approved; this note records the difference.

## Review notes

An independent read-only agent reviewed `git diff main...HEAD` against the Design, bug-019, WingFoil's `## Credit` on
its `origin/main` (`32d8871b`, sentence from `9ee64234`), svc-020's record and the `wingfoil-cli` directive.

- **Round 1** (d4a8c23): **clean**, two nits.
  - Checked: the sentence matches WingFoil's text; the example's id is svc-020's record spelled exactly; Source key and
    Last sync unchanged; rule 6 already says the form, rule 7 holds (no sync); red on main's README, 10 of 10 on HEAD,
    the red commit first; the notes' shas and counts; no live file keeps the old form; prettier clean.
  - **Nit 1, recorded:** "one assertion" in the Design against two `expect` calls; recorded in the Execution notes.
  - **Nit 2, left:** the characterization assertions match the labels `**Source key:**` and `**Last sync:**`, not
    their values. The criteria ask only that they stay green; `Last sync` changes on purpose at the next sync (rule 7).
- **Suites:** the diff is `docs/` and one unit test; lint, typecheck and the inbox test stand in, as for task-087. The
  full suites run if the approver asks.
- `npx wingfoil memory submit task-088-…` (in-progress → in-review). Declared: moves the task to its next state and
  commits it. Observed: see the next commit, `wf(task): submit …`.
