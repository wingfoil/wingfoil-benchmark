---
id: F-028
title: "No verb validates an element before submit"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N37.

## Observed

`wingfoil memory validate x` → `error: unknown command 'validate'` (Re-run on 2026-10-10: exit 1 on `0.2-pre-3df305e`,
exit 2 on `0.2.2`). A type's required fields are checked only when `submit` tries the transition, so the first sign
that an element is incomplete is a refused transition, and no command checks a directory of elements (for example
in CI).

## Expected

`memory validate [<id>|--all]` checks elements against their type's schema without moving them.
