---
id: task-098-the-review-rule-of-dl-020-in-kanban-delivery-the-code-review-directive-and-a-pre-review-script
type: task
title: "The review rule of dl-020 in kanban-delivery, the code-review directive and a pre-review script"
status: approved
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
- `memory approve` (pending → backlog, `812b1762`): run by this session at the approver's explicit request in chat
  (2026-10-24), the reason saying so. `memory submit` (backlog → in-progress): `ff486944`. Matches.
- **Build** (on `task/task-098`): red `8c6f9c33`, then `scripts/pre-review.sh` (`e2dfa01c`); `kanban-delivery.yaml`
  version 6 (`c7e522ba`); `npx wingfoil directive create --name code-review` (`dd66319f`: declared, a custom directive
  from the scaffold and one commit; observed, `name: code-review`, `title: "Code review"`, a placeholder body, as F-042
  says) and its body (`94eb2fbe`); `npx wingfoil directives list --role reviewer` reports "using
  directives/custom/code-review.md". `npx wingfoil workflow list` exits 0 and reads version 6.
- **Deviation, the approver's choice in chat (option b):** Markdown is not checked by Prettier, which would rewrite
  the front matter WingFoil writes (`tags: ["a","b"]` → `['a', 'b']`) and every table; the script checks the width of
  the lines the branch added to changed Markdown and its final newline instead. dl-020 amended on main (`e556e3d7`).

### Review

The rule of dl-020, applied to its own implementation.

- **Round 1** (an independent read-only agent, the five build commits): a **blocker**: `.prettierignore` leaves out
  `*.md`, `docs/` and `.wingfoil/`, and Prettier skips ignored paths passed explicitly, so no Markdown was checked
  (resolved by the approver's option b). Should-fix: a missing base or a run outside git exited 0 with "nothing
  changed"; a changed `test/bin/` test was dropped by the default vitest config; the directive lacked the reviewer's
  prompt and the completeness rule. Nits: quoted non-ASCII paths, no eslint, no README section, the directive's
  `ref`. Fixed: red `2380be24`, `dc448077`, `6ea5d571`; the Markdown check red `87da13f3`, `7c6af89d`; only the added
  lines red `4d4b023b`, `4026fe45`; the README rewrapped as the script asked (`fb71267a`).
- **Round 2** (the fixes' diff): should-fix: an added Markdown line starting with `++` was skipped as a diff header,
  shifting the numbers after it; the tests did not prove multi-hunk numbering, nor a long line after a fence or a
  mid-file `---`. Nits: header lines over 120, the width check reading the working tree, a no-op checkout. Fixed: red
  `5c91efcd`, `21592afa`.
- **Round 3** (`21592afa`'s diff): one nit (the final-newline check still read the working tree), fixed in
  `e82c2cc4` and closed with no new round.
- Day checks on `e82c2cc4`: `scripts/pre-review.sh main` green (markdown, prettier, eslint, tsc, the touched tests with
  traceability); `test/unit/scripts` 16/16; lint 0.
- **Full suites** (`scripts/full-suites.sh task/task-098`, the approver's request in chat): on `e82c2cc4`, not dirty,
  LINT 0, TEST 0 (1663 passed, 8 skipped; coverage 97.57 % statements), BUILD 0, BIN 0 (8), DOCKER 0 (22, 2 skipped);
  log `.cache/full-suites/2026-10-24/task_task-098-e82c2cc4-114607.txt`.
