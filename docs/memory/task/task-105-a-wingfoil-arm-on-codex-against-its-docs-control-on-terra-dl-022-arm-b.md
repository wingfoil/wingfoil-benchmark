---
id: task-105-a-wingfoil-arm-on-codex-against-its-docs-control-on-terra-dl-022-arm-b
type: task
title: "A WingFoil arm on Codex, against its docs control, on Terra (dl-022 arm B)"
status: in-progress
release: v0.3
wave: W15
features: [F7.1]
acceptance: []
requirements: [REQ-RUN-12, REQ-RUN-15, REQ-NFR-01]
fixes: []
tags: ["codex","wingfoil","campaign","v0.3"]
---

## Context

[dl-025](../decision-log/dl-025-the-codex-credential-s-scope-widened-to-a-wingfoil-arm-against-its-docs-control-on-terra-dl-022-arm-b.md)
(pending): dl-022's arm B now, on Terra (`gpt-5.6-terra`), against its docs control and the baseline, before the
ChatGPT Plus subscription ends on 2026-11-13. W15 of [plan-005](../../plans/plan-005-release-v0-3.md), before
task-103, the approver's choice in chat (2026-10-25). It starts after dl-025 is approved.

**The pending → backlog approval of this task is the consent for its real sessions:** two Codex sessions (the
wingfoil arm and baseline-docs), each S3@1.0 step 1 on `gpt-5.6-terra` at `medium`, from the main checkout, under
dl-024 as dl-025 widens it. **Spending: 0 €** (the Plus quota); API-equivalent expected under 1 USD a session. The dry
runs and the campaign are consented separately in `campaign-cycle`.

**Done** means: the wingfoil arm and baseline-docs run under Codex (the manual as `AGENTS.md`, the MCP server
configured for Codex or the difference stated), REQ-RUN-15's refusals widened to dl-025's scope, the campaign file
and its dry-run profile validating.

## Acceptance criteria

1. Under Codex, an arm's manual reaches the agent as `AGENTS.md`, merged with an `AGENTS.md` its tool's setup wrote, as
   a `CLAUDE.md` is under Claude Code (REQ-RUN-12 as amended). **Red-first.**
2. The wingfoil arm's MCP server is rendered into Codex's `config.toml` (`[mcp_servers]`) from the arm's `mcp.json`,
   or, if Codex 0.162.1 cannot run it headless, the arm runs without it and the run records why. **Red-first** for the
   rendering; the spike decides which.
3. REQ-RUN-15's Codex refusals (1.35) accept dl-025's campaign (`presets/harness-vs-docs.yaml`, arms baseline,
   baseline-docs and wingfoil, `gpt-5.6-terra`) and its dry-run profile, and still refuse anything else. **Red-first.**
4. Two real sessions (spike): S3@1.0 step 1 in the wingfoil arm and in baseline-docs on `gpt-5.6-terra`, through
   task-102's probe extended to an arm; each completes, its secret scan clean, a ledger line each. **Spike.**
5. `campaigns/codex-terra-harness-vs-docs.yaml` and its dry-run profile validate. **Characterization.**

## Design

- **The manual:** the runner's `CLAUDE.md` merge (REQ-RUN-12 as amended) takes the agent profile's `manualFile`.
- **MCP:** `src/agents/profile.ts`'s Codex `config.toml` gains the arm's server when the arm declares one; checked
  offline against Codex 0.162.1's `config/src/types.rs` (task-094's copy) before any session.
- **Scope:** `src/cli/codex-scope.ts` names the allowed campaigns and profiles by preset, arms and model.
- **The probe:** `spikes/task-102/probe.sh` gains an arm argument (the arm's setup run in the session's container);
  or a sibling `spikes/task-105/probe.sh`, if simpler.
- **Fairness:** the method page and the across-agents page state that the wingfoil arm is v0.2's manual (the engine not
  exercised) and how its MCP reached Codex.
- The dl-022 cut order is not needed (18 runs on one model); if the quota stops the campaign, it resumes after the
  window.
