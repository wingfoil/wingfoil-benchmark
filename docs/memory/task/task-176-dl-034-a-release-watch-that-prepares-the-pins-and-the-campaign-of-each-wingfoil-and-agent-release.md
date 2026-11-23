---
id: task-176-dl-034-a-release-watch-that-prepares-the-pins-and-the-campaign-of-each-wingfoil-and-agent-release
type: task
title: "dl-034: a release watch that prepares the pins and the campaign of each WingFoil and agent release"
status: pending
release: v0.4
wave: W21
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: []      # e.g. [REQ-FMT-01, REQ-FMT-02]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["pins","release-watch","dl-034","v0.4"]
---

## Context

[dl-034](../decision-log/dl-034-a-release-watch-wingfoil-s-and-the-agents-releases-update-the-pins-and-prepare-a-campaign-per-release.md), approved (option 3); placed in v0.4's W21 by the approver (2026-11-23), next to G:
a scheduled check, at most daily, of `wingfoil` (npm and the clone's tags), `@anthropic-ai/claude-code` and
`@openai/codex`, which opens a branch (never main) moving the managing CLI and preparing the measured pins and the
campaign the release calls for. Its open points (a partial campaign's scenarios; an agent's minor release; where the
watch runs) are put to the approver first.

**Done** means: a new release of a watched tool yields a branch with what dl-034 lists, and nothing is spent.

## Acceptance criteria

1. The approver's answers to dl-034's open points, recorded before the Design.
2. Red first: given a registry fixture with a newer release, the watch prepares the branch with the managing CLI's
   move, the measured pins for the next release, the drafted campaign (full for a major, partial for a minor) and its
   dry runs' upper bounds; with no newer release it writes nothing.
3. The watch never writes to main and never starts a real-agent session.
4. The requirements gain the watch; the `wingfoil-cli` directive's rule 8 names it.
5. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
