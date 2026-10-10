---
id: F-014
title: "Scaffolded templates say submit fills the placeholders; it does not"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N15.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`), `.wingfoil/memory/templates/bug.md` (and the `adr`, `decision-log`, `tech-spec`, `release-line`
templates) say: "`wingfoil memory add` copies this scaffold verbatim; `memory submit` replaces these placeholder
comments with real content and fills the required frontmatter fields." `memory submit` changes `status` only (a
1-line diff), and a required field left empty is refused, not filled. Re-run on 2026-10-10: the same text in the `0.2.2`
scaffold.

## Expected

The templates say what `submit` does. WingFoil bug-146 (closed) records this defect.
