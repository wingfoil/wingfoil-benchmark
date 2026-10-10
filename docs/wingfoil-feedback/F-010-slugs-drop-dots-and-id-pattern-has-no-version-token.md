---
id: F-010
title: "Slugs drop dots, and id_pattern has no {version} token"
kind: request
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N11.

## Observed

With a type whose `id_pattern` is `"x-{slug}"`, `memory add --title "v1.2"` creates `x-v1-2`: the slug maps
every run of characters outside `[a-z0-9]` to `-`. `add` fills only `{n}` and `{slug}`, so a pattern such as
`minor-{version}` cannot be produced by the CLI.

## Expected

A version-shaped title keeps its dots in the id, or `id_pattern` accepts a declared field token such as
`{version}`. WingFoil dl-107 (ready) records the same question.
