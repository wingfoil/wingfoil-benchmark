---
id: bug-053-scripts-pre-review.sh-stops-at-prettier-with-no-message-when-a-branch-changes-more-files-than-one-npx-argument-can-hold
type: bug
title: "scripts/pre-review.sh stops at Prettier with no message when a branch changes more files than one npx argument can hold"
status: draft
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.4","scripts","pre-review"]
---

## Context

Found on task-154's branch (2026-11-18). The approver chose on 2026-11-18 to file it for v0.4. A calibration commits
its dry-run records, so its branch changes far more files than a code task: task-154's changed 1476.

## Expected

`scripts/pre-review.sh <base>` runs every check on a branch of any size, and a check that cannot run says why.

## Actual

- The script passes every changed file to `npx prettier --check --ignore-unknown` as arguments.
- On task-154's branch those paths came to 135 501 bytes. `npx` hands its command to a shell as one string, and Linux
  limits a single argument to 128 KiB (`MAX_ARG_STRLEN`, 131 072 bytes).
- `npx prettier` exits 249 and prints nothing, so the script reports only `pre-review: prettier is red`.
- The same file list passes with `node_modules/.bin/prettier`, and in batches of 200 through `npx`, so no file is badly
  formatted. The later checks (eslint, tsc, the touched tests, the traceability test) never run.

Task-154 ran those checks by hand, as its execution notes record.

## Fix (proposed, for the approver's choice)

A v0.4 task, with no spending:

- Leave `results/` out of the list given to Prettier, as the Markdown check already does: `.prettierignore` skips it.
- Call Prettier in batches, or through `node_modules/.bin/prettier`, so that a large branch of other files still works.
- A red test first: a branch whose changed paths pass 128 KiB gets through the Prettier check.
