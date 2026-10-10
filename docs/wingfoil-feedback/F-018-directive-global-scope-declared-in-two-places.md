---
id: F-018
title: "A directive's global scope is declared in two places nothing reconciles"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N19.

## Observed

`roles.yaml` has a `global:` list of directive ids, and a directive file may carry `scope: global` in its
frontmatter. With directives listed in `global:` and no `scope:` key, `wingfoil directives list --format json`
reports them `"global": true` with `"warnings": []` (Re-run on 2026-10-10 on `0.2-pre-3df305e` and `0.2.2`:
the scaffold's three global directives, no `scope:` key, `warnings: []`); nothing tells an author whether a `scope:` key would be read,
ignored, or should agree with `roles.yaml`.

## Expected

One place owns a directive's scope, and the other is validated against it or dropped. WingFoil bug-148 and
bug-113 (closed) address this in a later build.
