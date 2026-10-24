---
id: F-042
title: "directive create writes no body and takes no title"
kind: gap
status: open
wingfoil_version: 0.2.2
answered_by: []
---

New note (task-100).

## Observed

`wingfoil directive create --name wingfoil-cli` (this repository's task-078) committed `wf(directive): create
wingfoil-cli` with `name: wingfoil-cli` and `title: "Wingfoil cli"`, a title derived from the name, and the
scaffold's empty body. The help names only `--name`; no verb writes a directive's title, tags or body, so they were
written by hand in a separate `docs(directive)` commit.

## Expected

`directive create` takes a `--title` (and `--tags`), and a verb (or `create` itself, from a file) writes the body,
so that a directive is created in one committed step.
