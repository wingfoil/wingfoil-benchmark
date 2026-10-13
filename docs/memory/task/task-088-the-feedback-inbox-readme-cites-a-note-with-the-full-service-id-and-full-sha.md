---
id: task-088-the-feedback-inbox-readme-cites-a-note-with-the-full-service-id-and-full-sha
type: task
title: "The feedback inbox README cites a note with the full service id and full sha"
status: backlog
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

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
