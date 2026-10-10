---
id: F-016
title: "A required field cannot be empty or say \"not applicable\""
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N17, N21.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`), with `tags` added to the `bug` type's `required` list in `memory.yaml`: a bug whose frontmatter
holds `tags: []` is refused by `memory submit` with `error: missing required field on submit: tags`, exit 1
(Re-run on 2026-10-10, on `0.2-pre-3df305e` and `0.2.2`). The key is present and deliberately empty.

The two states mean different things: an absent field is an omission to catch; an empty list is a claim (a spike
delivers no feature). The schema knows only present and absent, so an author either removes the field from
`required` for every element of the type, or fills it with a near-true value that reads as data.

## Expected

A required field accepts an explicit empty or "not applicable" value, recorded as such; or `required` can be
declared per element shape rather than per type.
