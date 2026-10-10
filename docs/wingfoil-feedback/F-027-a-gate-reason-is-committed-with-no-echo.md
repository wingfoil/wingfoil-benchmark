---
id: F-027
title: "A gate's --reason is committed with no echo and cannot be corrected"
kind: request
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N36.

## Observed

Two commands pasted at once ran as one: the second command's leading `cd` ended up at the end of the first
command's `--reason`, and `memory approve` committed a reason ending in `…cd`. Nothing showed the reason before the
commit, and no verb corrects a recorded reason. Unpushed, it was fixed with `git commit --amend`; pushed, the only
remedies are a history rewrite or a second commit explaining the first.

## Expected

A gate shows the transition and the reason before committing (or reads it from a file), and a recorded
reason can be corrected by a new, linked record. WingFoil task-210 (done) adds `--dry-run` to the mutating verbs,
which covers the preview.
