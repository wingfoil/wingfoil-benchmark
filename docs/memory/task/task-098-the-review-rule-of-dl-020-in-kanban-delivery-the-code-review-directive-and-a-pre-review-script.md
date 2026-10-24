---
id: task-098-the-review-rule-of-dl-020-in-kanban-delivery-the-code-review-directive-and-a-pre-review-script
type: task
title: "The review rule of dl-020 in kanban-delivery, the code-review directive and a pre-review script"
status: in-progress
release: v0.2
wave: retrospective
features: []
acceptance: []
requirements: [REQ-NFR-04]
fixes: []
tags: ["review","process","retrospective"]
---

## Context

[dl-020](../decision-log/dl-020-re-review-only-after-a-blocker-or-should-fix-on-the-fix-s-diff-with-a-severity-on-every-finding.md) (the review rule), from [rel-v0-2](../release/rel-v0-2.md)'s Retrospective, "What to change" 6 and 7: re-review
only after a blocker or a should-fix, on the fix's diff, with a severity on every finding, and prevention before each
round. It amends [dl-011](../decision-log/dl-011-an-independent-review-for-every-task-in-kanban-delivery.md)'s "each fix is reviewed again until clean". This task carries it into the process files. It
starts after dl-020 is approved, and its Design follows the option approved.

**Done** means: `kanban-delivery.yaml`'s review phase and the `code-review` directive state the rule; a pre-review
script runs the mechanical checks; the next task's review records severities.

## Acceptance criteria

<!-- A process change: no Gherkin scenario. -->

1. `.wingfoil/workflows/custom/kanban-delivery.yaml` (version 6) states, in its review phase: the three severities;
   a re-review of the fix's diff after a round with a blocker or a should-fix; a nit-only round closing the review
   with the nits fixed and listed; the post-fix checklist; figures in notes generated, not typed; a task's diff kept
   under about 1 200 lines. **Characterization** (the workflow's schema validates; the existing workflow tests pass).
2. The `code-review` directive (custom, overriding the built-in where it states "every finding is either fixed or
   recorded") says a finding carries a severity, and that a fixed nit is listed, not re-reviewed. **Characterization.**
3. `scripts/pre-review.sh` runs, at the lowest priority: Prettier on every changed file (Markdown included), `tsc`,
   the touched tests, `test:bin` when files under `src/cli/` or `src/site/` changed, the traceability test; it exits
   non-zero on the first red. **Red-first** (a test of the script against a fixture branch).

## Design

- **The workflow:** version 6 of `kanban-delivery.yaml`, its header comment recording dl-020 and this task, as
  versions 3–5 did. Only the review phase's description changes.
- **The directive:** a custom `code-review` directive under `.wingfoil/directives/custom/`, created with `wingfoil
  directive create`, its body written by hand (F-042), bound as the built-in one is.
- **The script:** `scripts/pre-review.sh <base>`, reading the changed files from `git diff --name-only <base>...HEAD`,
  in the style of `scripts/full-suites.sh` (niced, no credential, no agent).
- **The reviewer's prompt:** the severities and, from round 2, "look for what the fixes changed", kept as a template
  in the directive.
- A configuration change: it reaches main only through this task's branch, review and approval.

## Execution notes

- `npx wingfoil memory add --type task --title "The review rule of dl-020 in kanban-delivery, the code-review
  directive and a pre-review script" --tags "review,process,retrospective"`, on main. Declared: the element from the
  template in `draft`, one commit. Observed: `1fe0f02a`, `status: draft`. Matches.
