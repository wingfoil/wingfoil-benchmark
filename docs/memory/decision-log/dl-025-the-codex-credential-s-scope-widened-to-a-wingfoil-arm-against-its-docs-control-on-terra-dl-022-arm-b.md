---
id: dl-025-the-codex-credential-s-scope-widened-to-a-wingfoil-arm-against-its-docs-control-on-terra-dl-022-arm-b
type: decision-log
title: "The Codex credential's scope widened to a WingFoil arm against its docs control on Terra (dl-022 arm B)"
status: draft
tags: ["codex","security","campaign","wingfoil"]
---

## Context

[dl-022](dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)
planned arm B, a WingFoil arm rendered for Codex, after the wingfoil arm's step A. The approver wants it now
(2026-10-25): whether WingFoil improves Codex's models, above all `gpt-5.6-terra`, whose baseline in
[campaign-004](../campaign/campaign-004-codex-baseline-campaign.md) left room (S1 45/48 hold-out in two of three runs,
S2's checks 0/3, S3 M-F1 3/5). Step A waits for WingFoil 0.3.1, not yet tagged, and the ChatGPT Plus subscription ends
on **2026-11-13**.

[dl-024](dl-024-the-codex-campaign-s-subscription-credential-on-dl-019-s-model.md) bounds the Codex credential to the
baseline arm (`presets/baseline-across-agents.yaml`) and to task-102's sessions; the runner enforces it (REQ-RUN-15
1.35).

## Options

- **A. Widen dl-024's scope to a harness-vs-docs campaign on Terra**, with the wingfoil arm as it is today (WingFoil
  v0.3.0, v0.2's manual: a document register, the workflow engine not exercised), rendered for Codex.
- **B. Wait for step A** on WingFoil 0.3.1: most likely after 2026-11-13, with no subscription.
- **C. No arm B.**

## Proposal

**A**, with dl-024's bounds unchanged but its scope (bound 1), which gains:

1. **task-105's sessions:** one real session per new arm (wingfoil and baseline-docs), S3@1.0 step 1, on
   `gpt-5.6-terra` at `medium`, outside the runner, to check that each arm runs under Codex; consented by task-105's
   pending → backlog approval.
2. **The campaign** `campaigns/codex-terra-harness-vs-docs.yaml`, extending `presets/harness-vs-docs.yaml` with
   `agent: codex`, `gpt-5.6-terra` and the arms baseline, baseline-docs and wingfoil (S1 × 3, S2, S3 and S8 × 1: 18
   runs), its dry-run profile and its dry runs, each consented in `campaign-cycle`.
3. **The same end:** the campaign's last run or 2026-11-13, whichever comes first.

**Parity, stated on the method page and the across-agents page:** the wingfoil arm under Codex reads its manual as
`AGENTS.md`; its MCP server is configured for Codex as the spike finds it can be, or the difference is stated; the
arm is v0.2's, so its result measures WingFoil as that manual uses it, not WingFoil's workflow engine (step A remeasures
it). The comparison is Codex's wingfoil arm against Codex's baseline and docs control, within one agent and one model;
across agents it is read through the across-agents page only (T14).

## Consequences

- REQ-RUN-15's Codex refusals (1.35) widened to this campaign and profile (task-105).
- If the spike shows that an arm cannot run under Codex, the campaign is not run and the finding is filed.
