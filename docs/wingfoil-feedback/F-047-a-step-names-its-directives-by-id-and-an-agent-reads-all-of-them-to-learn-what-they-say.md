---
id: F-047
title: "A step names its directives by id, and an agent reads all of them to learn what they say"
kind: request
status: open
wingfoil_version: 0.3.1
answered_by: []
---

New note (task-122).

## Observed

On WingFoil 0.3.1 (`870bd440`), `workflow next`, `workflow start` and `workflow finalize` name the next step's
directives by id (`directives: doc-versioning, documentation, security, security-secrets, traceability` on the
Kanban scaffold's plan step) but not what they say. To learn it, the agents observed listed every directive in full
(`directives list`, see F-046) or read the directives' and the Memory elements' files with `cat`, often again at the
next step. Measured on the same 144 runs as F-046: on the weaker Claude model, reading those files and listing
the directives was about 31 % of the extra tokens its WingFoil sessions processed over sessions given the same rules
as plain documents (about 10 % on the stronger model).

## Expected

A way to get the step's own directives' text once, compact, for example `workflow next --directives` printing the
bodies of the directives the step names (or `directives show <id>…` taking several ids), so that an agent need not
list or read every directive to act on a step.
