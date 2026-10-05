---
id: task-060-campaign-validate-preflights-the-run-s-environment
type: task
title: "Campaign validate preflights the run's environment"
status: pending
release: v0.2
wave: W12
features: [F1.1]
acceptance: [campaign.feature]
requirements: [REQ-CLI-01, REQ-FMT-01]
---

## Context

Fixes [bug-014](../bug/bug-014-a-campaign-does-not-preflight-the-environment-its-harness-needs.md), planned in W12
at [rel-v0-2](../release/rel-v0-2.md)'s triage. v0.1's reference campaign first failed to start for a missing `BENCH_WINGFOIL_REPO` that nothing
declared. Every v0.2 arm adds environment needs.

**Scope:** `bench campaign validate` lists what the campaign's runs need: the credential file, each harness's source
(clone or artifact), the hold-out path for scoring. It checks those that are set, and says which are missing.
`campaign run` refuses to start without them, before the estimate. The README's commands section names them.

**No real agent, no spending.** **Done** means: tests, with the fake agent and an injected environment.

## Acceptance criteria

- `campaign validate` names each missing requirement of a campaign with a harness arm. **Red-first.**
- `campaign run` refuses before spending, naming the missing variable. **Red-first.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Campaign validate preflights the run's environment"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-060-campaign-validate-preflights-the-run-s-environment`, `status: draft`.
