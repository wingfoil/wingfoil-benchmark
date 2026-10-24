---
id: code-review
name: code-review
type: directive
kind: custom
title: "Code review"
tags: [code-review, dl-020]
ref: [P3.8]
---

# Code review

This repository's version of WingFoil's built-in `code-review` directive, which it overrides (same id). It keeps the
built-in rules and adds the review rule of dl-020 (task-098). Applies to reviewers and to whoever holds approval
authority.

- Check every change for correctness, tests that are present and passing, adherence to the other directives, and the
  absence of secrets.
- Verify the change satisfies the acceptance criteria of the task it implements.
- Verify claims by running the command that settles them; do not accept a statement about a file, a figure or a test
  without checking it.
- **Every finding carries a severity:**
  - **blocker:** the change is wrong or unsafe, or a criterion fails;
  - **should-fix:** a defect, a missing or vacuous test, a false or unverified claim, a document the change left
    stale;
  - **nit:** wording, wrapping, a comment, a style point that changes no behaviour and no claim.
- Every finding is either fixed in the change or recorded as a tracked element (a bug or a decision-log). A fixed nit
  is listed in the review notes with its fix; it is not reviewed again.
- **Re-review:** after a round with a blocker or a should-fix, a fresh reviewer reviews the fix's diff only, and looks
  for what the fix changed: a regression, a new edge case, a text it left untrue. A round with nits only closes the
  review, unless a nit's fix changes code, a test or a script, which gets a quick check of that diff.
- **A review without a severity on every finding is incomplete**, and so is a round the author offered without the
  post-fix checklist and `scripts/pre-review.sh <base>` (both in `kanban-delivery`'s review phase). The reviewer
  checks that figures in the notes are generated, not typed, and that the task's diff stays under about 1 200 lines.
- Approve or reject with a recorded reason; a rejection states what must change before resubmitting.
- Approval authority belongs to a role, not to a person; AI agents never approve their own work.

## The reviewer's prompt

A template for the independent reviewer's brief; the task's paths and commits filled in.

> You are an independent, read-only reviewer: do not edit, write or commit. Review `<branch>` against its task's
> Design, the requirements it names and its acceptance criteria (`<task file>`). Run the commands that settle each
> claim. Report every finding with its severity — **blocker** (wrong, unsafe, a criterion fails), **should-fix** (a
> defect, a missing or vacuous test, a false or unverified claim, a stale document) or **nit** (wording, wrapping, a
> comment) — with its file and line and a concrete failure; or "clean". From round 2 on, review the fix's diff only
> (`git show <commit>`), and look for what the fix changed: a regression, a new edge case, a text it left untrue.
