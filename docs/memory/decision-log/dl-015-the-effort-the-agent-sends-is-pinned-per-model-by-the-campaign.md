---
id: dl-015-the-effort-the-agent-sends-is-pinned-per-model-by-the-campaign
type: decision-log
title: "The effort the agent sends is pinned per model by the campaign"
status: pending
---

## Context

Raised by [task-062](../task/task-062-claude-5-5-models-on-the-pinned-agent-spike.md)'s spike on 2026-10-06, for
[dl-007](dl-007-claude-5-5-models-for-the-v0-2-campaign.md) (Claude 5.5 models in v0.2).

- Claude Code accepts `--effort <level>` (low, medium, high, xhigh, max): probe P4 ran Opus 5.5 with `--effort high`.
- Neither 2.1.280 nor 2.1.291 reports the effort it sends, in the stream or in `--debug`'s log. 2.1.291's `init`
  event says `per_turn_effort_active` (true for Sonnet and Opus 5.5, false for Haiku 4.5), and its binary names a
  per-model `defaultEffort`, `capLevels` and `defaultEffortPinnedAboveServed`: the default is per model, and may be
  served rather than fixed in the binary — a possibility the names suggest, not an observation.
- dl-007 notes that Opus 5.5 defaults to `medium` where Opus 5 defaulted to `high`, and that Sonnet 5.5's levels are
  recalibrated: effort moves cost and quality, and today the runner never passes it.

So two executions of one campaign, with the same pins, could run at different efforts, and nothing would show it.

## Options

- **A. Leave the agent's default.** Nothing to build; the effort is unrecorded and may drift.
- **B. Pin it per model in the campaign file.** `agent.effort: { <model>: <level> }`, required for a real agent;
  the runner passes `--effort` on every invocation and records the level with the run; it is part of the campaign's
  identity, like the models.
- **C. B, and the docs and the site show the level** beside each model, in the method page and the run detail.

## Proposal

**C**, implemented before calibration (W13), so that calibration's dry runs already run at the pinned levels. The
levels themselves (for example Sonnet 5.5 `high`, Opus 5.5 `high`, Haiku 4.5 none if it does not take one) are set
at calibration with the approver.

## Consequences

- The campaign schema and its identity change (a new pin); the estimate keys on it as on the model.
- A requirement of the run (REQ-RUN-16 or a new one) is amended; the method page names the levels.
