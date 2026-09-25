---
id: task-018-scenario-versioning
type: task
title: "Scenario versioning"
status: pending
release: v0.1
wave: W4
features: [F3.4]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-09, REQ-FMT-06]
---

## Context

Third task of wave **W4 — Scenario hygiene** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It builds on task-017 (the validator).

Scope of F3.4:

- **A scenario version's content hash (REQ-FMT-09).** Computed over everything a run of that version
  depends on — `scenario.yaml`, the seed, the prompts, the public oracle, and its `arms/<arm>/`
  configuration (dl-005) — deterministically, whatever the machine and the order files are read in.
  Whether hold-out additions are part of it is this task's design decision (they are not in the
  public repository, and a public rerun must still be able to check the hash).
- **Results record it**: `run.json` names the hash of the version it ran.
- **Versions are immutable.** `bench scenario validate` rejects a version whose content no longer
  matches a hash recorded in stored results, and `campaign run` refuses to run it, so that the change
  has to become a new version first (`scenarios.feature` @F3.4). Stored results keep pointing to the
  version they ran.

**Done** means: `scenarios.feature` @F3.4 "Changing a scenario creates a new version" passes; tests,
coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `scenarios.feature` @F3.4 "Changing a scenario creates a new version" — a changed prompt of a version
  with stored results must become a new version before it runs, and the stored results keep pointing
  to the old one. **red-first**
- REQ-FMT-09 — the hash is the same for the same content on any machine and in any read order, and
  differs when any file it covers changes. **red-first**
- REQ-FMT-06 — `run.json` records the hash. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `65c7df3`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W4 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-018-scenario-versioning` → `50b892d`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
