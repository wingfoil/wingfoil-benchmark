---
id: bug-014-a-campaign-does-not-preflight-the-environment-its-harness-needs
type: bug
title: "A campaign does not preflight the environment its harness needs"
status: draft
---

## Context

Found at the v0.1 reference campaign's first start (campaign-001, 2026-10-03 23:31). Validation (task-052) had run a
campaign with no harness, so it never needed the variable.

## Expected

`campaign validate`, or `campaign run` before anything is built, names every environment variable and local path the
campaign needs, and refuses at once when one is missing.

## Actual

`campaign run` stopped with `BENCH_WINGFOIL_REPO: is not set`. It stopped after the estimate, before any spending, so
nothing was lost. But the variable is declared nowhere a maintainer reads before running (not in the campaign file,
not in `validate`'s output). It was found by reading calibration's notes. The same holds for `BENCH_AGENT_TOKEN_FILE`
and the hold-out's path at scoring.

## Evidence

campaign-001 Execution ("First start, 23:31: refused before any spending"); task-050 (the command it used).

## Suggested handling

`campaign validate` lists the run's requirements by kind (credential file, harness clone, hold-out), and checks those
that are set. The README's commands section names them.

## Resolution

<!-- Filled when fixed: the task, the commit, and how it was verified. -->
