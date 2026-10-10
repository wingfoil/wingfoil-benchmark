---
id: F-024
title: "init --help and the missing-template error do not list the templates"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N30.

## Observed

Without a terminal, `wingfoil init` → `error: missing required argument: --template`, exit 2; `init --help`
says `--template <name>  methodology template to initialize with (non-interactive)`. Neither names the values
(`Scrum`, `Kanban`), which a script cannot discover. Re-run on 2026-10-10 on `0.2.2`: the error says `(one of: Scrum, Kanban)`
and the help lists them, with an example. The note no longer reproduces there.

## Expected

The help and the error name the templates; `0.2.2` does. WingFoil bug-140 (closed) records this defect.
