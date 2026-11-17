---
id: dl-034-a-release-watch-wingfoil-s-and-the-agents-releases-update-the-pins-and-prepare-a-campaign-per-release
type: decision-log
title: "A release watch: WingFoil's and the agents' releases update the pins and prepare a campaign per release"
status: pending
tags: ["v0.4","pins","wingfoil","agents"]
---

## Context

Requested by the approver on 2026-11-16, while filing
[bug-050](../bug/bug-050-the-memory-cli-and-the-campaign-pins-lag-wingfoil-v0.3.2.md): a configuration that watches
WingFoil's releases, updates the pins and prepares a **full campaign for a major release and a partial one for a
minor**, as the approver's `templates` project updates the versions of its packs; extended the same day to the agents'
releases (Claude Code, Codex). Filed as a decision log by the approver's choice (2026-11-17), once
[task-152](../task/task-152-align-the-benchmark-to-wingfoil-v0.3.2-the-memory-cli-the-wingfoil-arm-and-the-next-campaigns-pins.md)
was done.

What a release moves today, by hand, as task-152 found:

- **The managing CLI** (`package.json`'s `npm:wingfoil@<version>`, the `wingfoil-cli` directive's rules 5, 7 and 8:
  `npm ci`, the directive re-checked, `scripts/wingfoil-sync.mjs`). No spending, no measured pin.
- **The measured harness** (the `wingfoil` arm's `harnesses` pin): its admission in `eligibility/register.yaml`
  (five criteria, with dry-run evidence), the arm's manual and comments (a new digest, REQ-FMT-13), the
  `wingfoil-configured` configurations re-run by the configuring agent (REQ-RUN-20, about 5 EUR of cap each), the
  dry-run profiles and the next campaign files, and the release's plan and vision text that name the version.
- **The measured agents** (`agent.version`, the review loop's reviewer): the agent image, the runner's parsing
  checked against a recorded session, REQ-RUN-20's pins, the profiles and the next campaign files. Since REQ-CLI-02
  as amended in 1.59, a dry run of another agent release no longer prices a campaign, so each agent move also needs
  its own dry runs.
- **The approver's decision of 2026-11-16 (task-152, option 1):** measured pins are frozen within a benchmark
  release (v0.3: WingFoil v0.3.1, Claude Code 2.1.300, Codex 0.162.1), so that a release's campaigns compare; they
  move at a release's start. The managing CLI is not measured and may move at any time.

## Options

1. **By hand, per release, through a bug and a task** (today, bug-050 and task-152): nothing automatic; a release is
   noticed when someone looks.
2. **A watch that only reports:** a scheduled check of the npm registry (and WingFoil's tags) files a bug when a
   pinned tool has a newer release; the work stays as in option 1.
3. **A watch that prepares the update:** on a new release, the check opens a branch (never main) that moves the
   pins it may move, runs every check that spends nothing, and drafts the campaign the release calls for, with its
   dry runs' upper bounds; the approver's gates and spending consent are unchanged.

## Proposal

**Option 3**, built in v0.4, its mechanism modelled on the `templates` project's pack-version updates (read first by
the task that builds it):

1. **What is watched:** `wingfoil` (npm and the clone's tags), `@anthropic-ai/claude-code`, `@openai/codex`; a
   scheduled check, at most daily, that writes nothing to main.
2. **The managing CLI moves at once:** a new WingFoil release yields a branch with the devDependency, the lockfile,
   `npm ci`, `--version`, the `--dry-run` checks, the directive's re-check list and the sync's output, as task-152's
   criterion 1 did; through a bug and a task as every configuration change (no spending).
3. **The measured pins are prepared, not moved:** the same branch (or a second one) carries the measured pins'
   update for the **next** benchmark release: the profiles and campaign files with the new pins, the admission
   entry's draft, the arm's manual diff to review, the configurations to re-run, the agent image. It lands at the
   next release's start, or earlier only on the approver's decision.
4. **The campaign it drafts**, by the kind of release, as the approver asked:
   - **Major** (WingFoil's `X.Y` changes, an agent's major): a **full** campaign, extending the reference preset
     (dl-022): every arm on S1, S2, S3 and S8.
   - **Minor** (a patch release, `X.Y.Z`): a **partial** campaign, the arms the tool touches (for WingFoil: `wingfoil`,
     `wingfoil-configured` and their docs controls, with `baseline` as reference; for an agent: `baseline` and one
     harness arm), on the scenarios the approver picks.
   - Each comes with its dry runs' upper bounds; **no session runs without the approver's spending consent**.
5. **Records:** every watch result that yields a branch names the release, its changelog read, and what it did not
   move and why.

## Consequences

- v0.4's first application: WingFoil 0.3.2 or later for the measured arm, Claude Code from 2.1.300 to the latest,
  Codex only if it runs again (its subscription ended 2026-11-13).
- The requirements gain the watch (a new REQ) and the release cycle's planning phase reads its prepared branch; the
  `wingfoil-cli` directive's rule 8 names it.
- **Open for the approver:** the scenarios of a partial campaign; whether an agent's minor release yields a campaign
  at all or only dry runs; where the watch runs (a scheduled local job or the repository's CI).
- **What would change the proposal:** releases too frequent to measure each (then only majors get campaigns and
  minors are batched at a release's start); a tool whose releases change the measured behaviour without a version
  bump.
