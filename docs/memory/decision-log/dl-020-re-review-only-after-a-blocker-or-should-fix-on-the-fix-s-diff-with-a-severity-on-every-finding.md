---
id: dl-020-re-review-only-after-a-blocker-or-should-fix-on-the-fix-s-diff-with-a-severity-on-every-finding
type: decision-log
title: "Re-review only after a blocker or should-fix, on the fix's diff, with a severity on every finding"
status: approved
tags: ["review","process","kanban-delivery"]
---

## Context

[dl-011](dl-011-an-independent-review-for-every-task-in-kanban-delivery.md) made an independent review part of `kanban-delivery`: "each fix is reviewed again until clean". In release
v0.2 that rule took 118 review rounds for 42 tasks, 2.8 a task, only four tasks clean at the first round
([rel-v0-2](../release/rel-v0-2.md) Retrospective, "What to change" 6). An analysis of the rounds (2026-10-23) found:

- **Rounds opened for nits.** The rule never says which severity counts, and the `code-review` directive leaves no
  finding only in the notes, so a nit is fixed and its fix is reviewed again: 15 rounds followed a round with nits
  only, and 2 of them found something of substance (a should-fix in task-094, two edge cases in task-095).
  (Corrected 2026-10-24: it read "none of them found a blocker or a should-fix"; found by task-100's review.)
- **Findings created by the previous fix.** 40 % of the findings of rounds 2 and later (77 of 193) were made by the
  previous round's fix: a Design, note or specification not updated after a code change, or a regression in the
  fix's own code.
- **About half the findings are in notes and figures** (148 of 487), not in code: wrong counts, stale wording.
- **Size:** rounds rise with a task's diff (r = 0.56); tasks of 1 200 lines or more averaged 4.8 rounds.
- **Mechanical misses:** `test:bin` not run by the day checks (task-085's reject), Markdown outside the Prettier
  check.

The same analysis over WingFoil (v0.1–v0.3), WingFoil UI and WingFoil Templates found the same dynamics: the first
round is rarely clean, 40–89 % of later findings are fix-induced, and the number of rounds follows each project's
re-review rule, task size and reviewer's rigour. Where re-reviews followed a nit-only round, they rarely found
anything serious (corrected 2026-10-24: it read "none found anything serious"). Where fixes were not re-reviewed at
all, they were often wrong when they were.

## Options

- **A. Keep "until clean".** Every fix re-reviewed, nits included: about 2.8 rounds a task.
- **B. A severity threshold.** Every finding carries a severity: `blocker`, `should-fix` or `nit`. A round with a
  blocker or a should-fix is followed by a re-review **of the fix's diff only**; a round with nits only ends the
  loop: the nits are fixed and listed in the Review notes, with no new round, unless a nit's fix changes code, a
  test or a script, which gets a quick check of that diff.
- **C. B, plus prevention.** B, and before every review round the author runs:
  - a **post-fix checklist**: search the Design, the notes, the requirements and the README for every term the fix
    changed; re-read every line the fix removed; add a red test for each blocker or should-fix, and list the edge
    cases next to it;
  - a **pre-review script**: Prettier on every changed file, Markdown included, `tsc`, the touched tests, `test:bin`
    when CLI or site output changes, the traceability test;
  - **figures in notes generated** from the results, the ledger or a script, never typed by hand;
  - a task's diff kept under about 1 200 lines, splitting a larger one at its Design.
- **D. Fewer re-reviews.** Re-review at the coordinator's discretion, as WingFoil v0.3 did (1.2 rounds a task): about
  80 % of its fixes went to the approver unreviewed, and when they were reviewed 76 % of the findings were the fixes'
  own.

## Proposal

**C.** A task amends `kanban-delivery.yaml`'s review phase and the `code-review` directive, and adds the pre-review
script. The reviewer's prompt states the three severities and, from round 2 on, looks for what the fixes changed.
Estimated: about 2.0–2.2 rounds a task, with no round skipped that would have found a blocker or a should-fix.

## Consequences

- Every finding in a task's Review notes carries its severity; a review without them is incomplete.
- A nit-only round closes the review: the nits are fixed and listed, not reviewed again.
- [dl-011](dl-011-an-independent-review-for-every-task-in-kanban-delivery.md) stays: an independent reviewer for every task. This decision amends only its "until clean".
- The figures of the next release's review are compared with v0.2's 2.8 rounds a task, and reported in its
  retrospective.
