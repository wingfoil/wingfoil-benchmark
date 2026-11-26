---
id: task-167-the-review-practice-review-agents-in-temporary-directories-the-reflog-after-each-round-figures-by-script-a-final-review-on-the-last-diff-the-full-suites-before-in-review
type: task
title: "The review practice: review agents in temporary directories, the reflog after each round, figures by script, a final review on the last diff, the full suites before in-review"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
needs: [bug-056-the-campaign-gate-refuses-every-campaign-of-test-bin-and-test-docker-whose-fixtures-name-no-campaign-element]
tags: ["process","review","v0.4"]
---

## Context

[rel-v0-3](../release/rel-v0-3.md)'s Retrospective, "What to change" 2–4, and the approver's decisions of 2026-11-22: a
reviewer helper reset main once; reviewers read main's history against their brief; figures typed in notes were the
most frequent finding; final changes reached in-review without being read again; the full suites went red after a
green targeted run. Written practice in the adopted methodology (after task-127).

**Done** means: the practice is written where the delivery workflow and the review directive are read, and a check
enforces the part a script can enforce.

## Acceptance criteria

1. The `code-review` directive and the delivery workflow's review step (as adopted by task-127) say: a review or
   helper agent works only in a temporary directory of its own; the reflog of the main checkout is checked after every
   round; figures in notes come from a script whose command is quoted; after the last fix a short final review reads
   the final diff; the full suites run before every move to in-review.
2. Red first: a script (or a `pre-review.sh` stage) reports when the main checkout's reflog moved since the round
   started.
3. The brief given to review agents is a file in the repository, used by every round.
4. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
