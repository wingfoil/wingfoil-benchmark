---
id: F-006
title: "memory history follows the template copy into unrelated commits"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N7.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`): `wingfoil memory add --type task --title "First task"`, then
`wingfoil memory history task-001-first-task`. The first entry is the `init` commit, with `"operation": null`, and
stderr carries `fatal: path 'docs/memory/task/task-001-first-task.md' exists on disk, but not in '<init sha>'`;
exit 0. The element was created by the `add` commit; the template it was copied from was added by `init`. Every
commit that later edits the template adds another phantom entry. `git log -- <path>` gives the right trail.

Re-run on 2026-10-10 on `0.2-pre-3df305e`: as above. On `0.2.2`: one entry, the `add`; no `fatal:` line. The note no longer
reproduces there.

## Expected

An element's history lists only commits that touched the element. WingFoil bug-077 (closed) records this
defect.
