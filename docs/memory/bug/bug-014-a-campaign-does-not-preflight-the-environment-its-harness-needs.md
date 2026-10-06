---
id: bug-014-a-campaign-does-not-preflight-the-environment-its-harness-needs
type: bug
title: "A campaign does not preflight the environment its harness needs"
status: fixed
fixed_by: task-060-campaign-validate-preflights-the-run-s-environment
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

Fixed by [task-060](../task/task-060-campaign-validate-preflights-the-run-s-environment.md) (merged in `5119be2`):
`campaign validate` lists what the runs need from the machine (`BENCH_AGENT_TOKEN_FILE` or `BENCH_FAKE_SCRIPT`, the
clone of each pinned harness, `BENCH_HOLDOUT_PATH` when a scenario declares a hold-out), each set, missing or
invalid; `campaign run` refuses every missing one at once, before the estimate. Verified by unit tests with an
injected environment, the bin suite (W5's ceiling case given the fake script) and the Docker suite.
