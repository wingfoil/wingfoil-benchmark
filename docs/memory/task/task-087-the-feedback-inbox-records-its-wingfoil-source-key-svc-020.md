---
id: task-087-the-feedback-inbox-records-its-wingfoil-source-key-svc-020
type: task
title: "The feedback inbox records its WingFoil source key, svc-020"
status: in-progress
release: v0.2
wave: W14
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02]
fixes: []
---

## Context

Asked on 2026-10-10 by the "Coordinamento WFCoord stato processi" session, on the approver's ruling of the same day
(the WingFoil feedback loop, dl-163), before W14's delivery starts. It is not one of W14's eight planned tasks and
does not start them; it is filed under W14 because M3's tasks (task-076..078) were.

WingFoil registered this repository as a `repository` service with `feedback_inbox: docs/wingfoil-feedback/`:
**svc-020** (`svc-020-github-repository-wingfoil-benchmark-the-benchmark-consumer-project-and-its-feedback-inbox`),
`active` since WingFoil `30b268a3` (`wf(service): approve svc-020-… [pending → active]`, on WingFoil's pushed
`origin/main`; read 2026-10-10). The inbox README still says the source key is "to be set" (task-077).

**On `requirements`:** as task-076 (REQ-NFR-02, the nearest; no requirement covers the project's own process).

**No real agent, no spending.** **Done** means: the README names `svc-020` as its source key, merged on main and pushed
(the push by the approver's instruction).

## Acceptance criteria

- `docs/wingfoil-feedback/README.md` says `**Source key:** svc-020`, with the service's full id and the WingFoil commit
  that made it active. **Characterization**: the inbox test (`test/unit/docs/wingfoil-feedback.test.ts`) stays green;
  it checks that the line exists, not its value.
- `**Last sync:** none` is unchanged: registering a source is not a sync (directive `wingfoil-cli`, rule 7).

## Design

One line of the README changes, from "to be set — the `svc-NNN` id WingFoil assigns when it registers this
repository as a feedback source (WingFoil task-269)" to "`svc-020` — the id WingFoil assigned when it registered
this repository as a feedback source (`svc-020-…`, `active` since WingFoil `30b268a3`)". The citation sentence
(`<source key>/F-<nnn>@<sha>`) stays. Branch and worktree as every task; day checks: lint, typecheck, the inbox test;
an independent review; no full suites (the diff is `docs/` only, as task-076).

## Execution notes

- `npx wingfoil memory submit task-087-…` (backlog → in-progress) on 2026-10-10, after the approver's approval
  (`689f996`). Declared: moves the task to its next state and commits it. Observed: `status: in-progress`. Matches.
- svc-020 read on WingFoil's `origin/main` (`git fetch`, then `git show origin/main:docs/04_memory/services/svc-020-…`):
  `kind: "repository"`, `feedback_inbox: "docs/wingfoil-feedback/"`, `url: "https://github.com/wingfoil/wingfoil-benchmark"`,
  `status: active`; the head commit `30b268a3` is its approval, pending → active.
- The README's Source key line changed as the Design says (3 insertions, 2 deletions); `**Last sync:** none` unchanged.
- Day checks, niced: `npm ci` 0, `npm run lint` 0, `npx tsc --noEmit -p .` 0, the inbox test 10 of 10.

## Review notes

An independent read-only agent reviewed `git diff main...HEAD` against the Design, WingFoil's svc-020 record on its
`origin/main` and dl-163.

- **Round 1** (c5bf8b2): **clean.** The full id, `status: active` and `30b268a3` match WingFoil's record; the README
  keeps dl-163's citation form; `**Last sync:** none` is unchanged; the inbox test 10 of 10.
  - **Nit, left:** the README names the short `svc-020` as the source key, with the full id beside it. Whether a
    WingFoil `reported_by:` cites the short or the full id is still open on WingFoil's side (its task-271, backlog);
    the coordination session asked for `svc-020`. If WingFoil settles on the full id, a later task follows it.
- **Suites:** the diff is `docs/` only; lint, typecheck and the inbox test stand in, as for task-076.
- `npx wingfoil memory submit task-087-…` (in-progress → in-review). Declared: moves the task to its next state and
  commits it. Observed: see the next commit, `wf(task): submit …`.
