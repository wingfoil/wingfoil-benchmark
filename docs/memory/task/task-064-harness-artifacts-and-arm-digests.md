---
id: task-064-harness-artifacts-and-arm-digests
type: task
title: "Harness artifacts and arm digests"
status: backlog
release: v0.2
wave: W12
features: [F7.1, F7.2]
acceptance: [competitors.feature]
requirements: [REQ-FMT-01, REQ-FMT-06, REQ-FMT-12, REQ-FMT-13, REQ-RUN-01, REQ-RUN-14, REQ-CLI-11]
---

## Context

The groundwork every competitor arm needs ([rel-v0-2](../release/rel-v0-2.md), W12), before the Spec Kit arm:

- **harness artifacts** (REQ-FMT-12): every pinned harness built or fetched once into `.cache/harnesses/`, its
  digest recorded in `run.json` (`harness.artifact_sha256`), attached to the release by `transcripts pack`
  (REQ-CLI-11), licences included; REQ-RUN-14 scoped to WingFoil;
- **arm digests** (REQ-FMT-13) and `arm_digests` in the campaign file (REQ-FMT-01), recorded in `run.json`;
- **the run image** gains Python ≥ 3.11 and `uv` (REQ-RUN-01).

**No real agent, no spending.** **Done** means: the error scenarios of `competitors.feature` on artifacts and arm
digests green; v0.1's campaign files still validate.

## Acceptance criteria

- `competitors.feature`: an artifact that does not match its digest is refused; a campaign file whose pinned arm
  digest no longer matches is refused. **Red-first.**
- A v0.1 campaign file without `arm_digests` validates as before. **Characterization.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Harness artifacts and arm digests"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-064-harness-artifacts-and-arm-digests`, `status: draft`.
