---
id: task-112-answers-to-wingfoil-s-four-needs-info-questions-on-wingfoil-0.3.1-f-007-f-009-f-023-f-034
type: task
title: "Answers to WingFoil's four needs-info questions on wingfoil@0.3.1 (F-007, F-009, F-023, F-034)"
status: pending
release: v0.3
wave: W16
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["v0.3","wingfoil","governance"]
---

## Context

The first `wingfoil-sync` (task-109, at the pin bump to `wingfoil@0.3.1`) set four notes of the inbox to
`needs-info`, as WingFoil's `retro-v0.3` decided: F-007, F-009, F-023 and F-034. WingFoil's `COLLABORATION.md` maps
`needs-info` to "the consumer adds what is asked"; its triage record (`rel-v0.3-feedback-triage.md` at `v0.3.1`) asks,
one question per note:

- **F-007:** does `memory history` on 0.3 return the `finalize` operation for a finalize commit?
- **F-009:** do `workflow end` / `workflow finalize` on 0.3 record the approver for a plan (WingFoil's AGENTS says
  `finalize` records one only on an approval phase)?
- **F-023:** which relations between elements this repository still lacks on 0.3, and does the default Kanban `bug`
  machine still end at `approved`?
- **F-034:** does `npm i wingfoil@<version>` give a working bin (the remaining ask being the lockfile)?

The approver accepted this follow-up at task-109's gate (2026-10-27). **No real-agent session. Spending: 0 €.**

**Done** means: each of the four notes carries the answer WingFoil asked for, reproducible with WingFoil alone, ready
for WingFoil's next retrospective.

## Acceptance criteria

1. **F-007:** a scratch repository on `wingfoil@0.3.1` with a workflow step recorded by `workflow finalize`; what
   `memory history` returns for it (operation, from, to), command and output added to the note. **Characterization.**
2. **F-009:** on the same scratch repository, a plan closed by `workflow end` and a step finalized on an approval phase
   and on a phase without one; whether each commit records `Approver:` and a reason, added to the note.
   **Characterization.**
3. **F-023:** the default Kanban `bug` machine of `init --template Kanban` on 0.3.1 read (`memory.yaml`), and the
   relations this repository uses by hand (`fixes` / `fixed_by`, `supersedes`) checked against what 0.3.1 offers;
   the answer added to the note. **Characterization.**
4. **F-034:** in an empty directory, `npm i wingfoil@0.3.1`, then `npx wingfoil --version` and the bin's mode; whether
   the package ships a lockfile (`npm pack --dry-run` or the tarball's file list); added to the note.
   **Characterization.**
5. **The record:** each note keeps its status (`needs-info`; only the sync changes it, the `wingfoil-cli` directive's
   rule 6), its answer in its `## Observed` section, dated and naming the build; the inbox README says the four
   answers are in. **Characterization.**

## Design

- Every reproduction runs in a `mktemp` directory with WingFoil alone (no file of this repository), so that WingFoil
  can rerun it; the commands and their output go in the note, never the benchmark's results.
- A note's existing text is not rewritten: the answer is a new paragraph, `Answer for WingFoil's v0.3 retrospective
  (2026-…, wingfoil@0.3.1):`.
- **Not in this task:** changing a note's status, or adopting any verb in this repository's configuration.

## Execution notes
