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

## Execution notes

- `memory add`, the body, `memory submit` (draft → pending) on main on 2026-10-25; dl-025 approved and this task's
  pending → backlog run by the approver (`e79569ce`, `cf1e3ef8`); `memory submit` (backlog → in-progress) on main.
- **Offline** (on `task/task-105`): Codex 0.162.1's `config/src/mcp_types.rs` read (`spikes/task-105/out/f1/`, main
  checkout, git-ignored): a stdio server is `[mcp_servers.<name>]` with `command`, `args`, `env`, its other keys
  defaulted, `required` false unless set. Requirements 1.37 (`4a8f68b9`); red (`8fbfdf8d`); code (`076a107d`).
- **Criterion 1** was already met: the runner's merge takes the profile's `manualFile` (task-094); now pinned on its
  bytes. WingFoil v0.3.0's `init` writes neither `CLAUDE.md` nor `AGENTS.md` (dry run 57's setup diff).
- **The method page** gains the statement {#other-agents} (how a Codex execution differs, its wingfoil arm v0.2's
  manual): every execution's `method.html` is built from it, so before the next `bench site publish` every
  execution under `site/` (v0.1's and v0.2's included) is rebuilt with `bench site build`, or the publish check
  refuses each stale page; the gh-pages commit then changes every published method page.
- **The spike's sessions:** the probe of task-102 runs no arm's setup, which the wingfoil arm needs (its harness, its
  configuration); the approver is asked whether the spike becomes the two arms' S3 dry runs (10 sessions, which the
  campaign's estimate needs anyway) instead of two step-1 sessions outside the runner.

### Review

Under dl-020; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, sandboxed; the reflog unchanged after it; the offline work): the TOML
  shape checked against Codex 0.162.1 (`type` dropped: harmless, since serde ignores it; `deny_unknown_fields` there
  is schemars', not serde's, as round 2 noted), the Claude path unchanged,
  the scope's table, the campaign's digests those of campaign-002.
  - **should-fix, fixed:** the AGENTS.md merge test checked nothing new (the doubles run no script; now the setup's
    exec writes the tool's guide and the merged bytes are asserted); a bad `mcp.json` failed every run instead of the
    campaign (now refused before anything is built, in `campaign run` and `scenario dry-run`); a server that does not
    start went unnoticed (now `required = true`); the Codex arm's differences were on no page (now the method page's
    {#other-agents}; the across-agents page's notes come from the catalogue at publication).
  - **nits, fixed:** DEL escaped and a lone surrogate refused; env values must be strings; the preset's Claude effort
    kept in the resolved campaign named in the file's comment; the profile test checks every pin of the estimate's key.
    **Stated:** a cosmetic edit of a test after the red commit (`076a107d`, an equivalent expression).
  - Red `3b5839f3`, fix `1430a2cd`.
- **Round 2** (a new independent agent, sandboxed; the reflog unchanged after it; the fixes' diff): the code's fixes
  correct (`required = true` read by Codex 0.162.1, `codex exec` exiting when the server does not start; the escaping;
  the refusal before anything is built in both commands; the merge test now meaningful).
  - **should-fix, fixed:** the notes said the next publish rebuilds every execution, when its check refuses each stale
    page (now stated: rebuild every execution before publishing); `required = true` had no requirement behind it (now in
    REQ-RUN-15 1.37, with how such a step counts: failed, at its bound); the method page's "the same as Claude Code's"
    would go stale with step A (now "in v0.2 (campaign-002)").
  - **nits, fixed:** a server name or env key not valid TOML refused like a value; the dry run's MCP refusal pinned by a
    test (characterization); round 1's note on `type` corrected. **Stated:** the method-statements test's entry was
    added with the code (round 1's fix), not in its red commit; a history-read arm's message names its `.cache/` path;
    `codexMcpIssues` gates on the agent's name.
  - Red `2ccf170c`, fix `f58627c9`.
