---
id: task-101-campaign-presets-and-extends-and-campaigns-run-on-their-own
type: task
title: "Campaign presets and extends, and campaigns run on their own"
status: pending
release: v0.3
wave: W15
features: [F1.1]
acceptance: [campaign.feature]
requirements: [REQ-FMT-01, REQ-FMT-02, REQ-CLI-01]
fixes: []
tags: ["campaign","presets","v0.3"]
---

## Context

[dl-022](../decision-log/dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)
(approved 2026-10-24): any campaign runs through `campaign-cycle` whenever the approver wants, and a campaign file may
extend one preset. It is the first task of [plan-005](../../plans/plan-005-release-v0-3.md)'s W15, before the Codex
campaign (task-102), whose subscription ends on 2026-11-13. If it is not approved by **2026-11-05**, the Codex
campaign runs from a whole hand-written file (dl-022's fallback) and this task continues without the deadline.

**Done** means: `campaigns/presets/` holds the four presets of dl-022, a campaign file with `extends:` resolves,
validates, estimates and runs, its id is the digest of the resolved campaign, and the existing campaign ids are
unchanged.

## Acceptance criteria

1. A preset is a partial campaign file under `campaigns/presets/<name>.yaml` with a required one-line `description:`;
   a preset with `extends:` (a chain) or without `description:` is refused. **Red-first** (`campaign.feature`).
2. `extends: presets/<name>.yaml` in a campaign file merges the preset under the file: maps merged by key, lists
   replaced whole, the file's keys winning. **Red-first.**
3. The campaign's id is the first 12 hex of the SHA-256 of the resolved campaign's canonical JSON; a file without
   `extends:` resolves to itself, so `81ebb2691f9c` and `bf3a1ac7dff5` keep their ids. **Red-first** for the resolved
   id, **characterization** for the existing ids.
4. The resolved file is written into each execution's results next to `run.json`. **Red-first.**
5. `bench campaign presets` lists the presets with their descriptions; `bench campaign validate <file>` prints the
   resolved campaign. **Red-first.**
6. `estimate` and `run` read the resolved campaign and are otherwise unchanged. **Characterization.**
7. The four presets of dl-022 (`reference`, `baseline-across-agents`, `harness-vs-docs`, `smoke`) and the
   `repetitions` preset of [dl-023](../decision-log/dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset.md)
   if it is approved first; each validates when extended by a minimal file. **Red-first.**
8. `campaign-cycle.yaml`'s header and `release-cycle` › `campaign` say that a campaign runs on its own and that a
   release requests its own campaigns (a configuration change). **Characterization** (the workflow tests pass).

## Design

- **The specification first, in this task:** requirements 1.34 (REQ-FMT-01, REQ-FMT-02 amended: presets,
  `extends:`, the id over the resolved file, the resolved file in the results; REQ-CLI: `campaign presets`,
  `validate`'s printed resolution), `campaign.feature` amended, traceability amended. Committed before the red tests.
- **The loader** (`src/campaign/load.ts`): read the file, resolve `extends:` relative to `campaigns/`, merge, then
  validate and hash the resolved object; `campaignId` takes the resolved object.
- **No generator** (dl-022's option C rejected) and no flags in place of a file (option D rejected).
- The existing campaign files are not touched.

## Execution notes

- `npm run -s wingfoil -- memory add --type task --title "…" --tags "…"` on main, at v0.3's release-planning
  (2026-10-24). Declared: the element from the template in `draft`, one commit. Observed: as declared.
- The body committed by hand (`e7a5e1e2`), then `memory submit` (draft → pending). Declared and observed: one commit,
  `status: pending`.
