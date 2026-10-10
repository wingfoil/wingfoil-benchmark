---
id: F-029
title: "memory add takes no field values"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N38.

## Observed

`memory add` accepts `--type`, `--title` and `--tags` only: `memory add --type bug --title x --set tags=a` →
`error: unknown option '--set'`, exit 1 (`0.2-pre-3df305e`). Required fields that the caller already knows when it
creates the element come out empty and are filled by a hand edit and a second commit.

Re-run on 2026-10-10 on `0.2.2`: `--set <name=value>` exists but fills only tokens of the `id_pattern`/path; `--set tags=a` →
`error: invalid flag value: --set cannot set "tags": memory add fills it itself or through its own option`, exit 2.
Other required fields are still filled by hand.

## Expected

`memory add` sets any declared frontmatter field at creation (`--set <key>=<value>`, or the frontmatter read
from a file).
