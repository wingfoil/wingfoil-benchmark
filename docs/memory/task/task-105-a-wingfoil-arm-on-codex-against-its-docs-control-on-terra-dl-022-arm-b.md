---
id: task-105-a-wingfoil-arm-on-codex-against-its-docs-control-on-terra-dl-022-arm-b
type: task
title: "A WingFoil arm on Codex, against its docs control, on Terra (dl-022 arm B)"
status: done
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
dl-024 as dl-025 widens it (widened by the approver to the two arms' S3 dry runs, option A: see the Execution notes).
**Spending: 0 €** (the Plus quota); API-equivalent expected under 1 USD a session. The campaign's other dry runs and
the campaign are consented separately in `campaign-cycle`.

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
4. **The spike** (the approver's option A in chat, 2026-10-25, in place of two step-1 sessions through task-102's probe,
   which cannot run an arm's setup): the S3@1.0 dry runs of baseline-docs and wingfoil on `gpt-5.6-terra`, five steps
   each, through the runner; each completes, its secret scan clean, a ledger line each. **Spike.**
5. `campaigns/codex-terra-harness-vs-docs.yaml` and its dry-run profile validate. **Characterization.**

## Design

- **The manual:** the runner's `CLAUDE.md` merge (REQ-RUN-12 as amended) takes the agent profile's `manualFile`.
- **MCP:** `src/agents/profile.ts`'s Codex `config.toml` gains the arm's server when the arm declares one; checked
  offline against Codex 0.162.1's `config/src/types.rs` (task-094's copy) before any session.
- **Scope:** `src/cli/codex-scope.ts` names the allowed campaigns and profiles by preset, arms and model.
- **The spike:** the runner's own dry runs (`bench scenario dry-run S3@1.0 --arm <arm> --model gpt-5.6-terra
  --profile campaigns/codex-terra-harness-vs-docs.dry-run.yaml`), from the main checkout with the worktree's `dist/`,
  as task-094's sessions ran (the approver's option A; the probe of task-102 runs no arm's setup).
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

- **The consent widened** by the approver in chat (2026-10-25, option A): the spike is the two arms' S3@1.0 dry runs on
  `gpt-5.6-terra` (baseline-docs, wingfoil; five steps each, ten sessions) instead of two step-1 sessions outside the
  runner, which cannot run an arm's setup; the campaign's estimate needs them anyway.
- **The two dry runs** (2026-10-25, from the main checkout, the worktree's `dist/` at `31b7d6c5`, the profile copied
  into the main checkout untracked for the run and removed after; `BENCH_WINGFOIL_REPO` the local WingFoil clone, whose
  `v0.3.0` is `cc31d7a8`, after a first attempt refused for its absence before any session): each completed, no
  intervention, its secret scan clean (the first, refused attempt's log was overwritten by the second; no dry-run
  directory was made for it, `dry-runs/78` following 77); `dry-runs/78` (baseline-docs, 0.7005 USD) and `dry-runs/79`
  (wingfoil, 0.8499 USD), API-equivalent (`price-table`), 0 € spent; two lines of the v0.3 ledger; committed on main
  (`b99474a8`).
- **Criterion 2, read from the wingfoil dry run:** that the MCP server started is an inference, not an observation: the
  runner writes it with `required = true`, Codex 0.162.1 ends a session whose required server does not start (read
  offline, review round 2), and all five sessions completed; no `config.toml`, MCP start event or stderr line is kept
  in the results. No MCP call was made, and none could be: WingFoil v0.3.0's server exposes no tool (`tools/list`
  answers `[]`, the arm's `mcp-tools: false`). The agent used the CLI through the shell instead, as the arm did under
  Claude Code in v0.2 (calibration v0.2 §7.7, point 1): 22 of the 51 shell commands of the five steps invoke it, 33
  invocations (`memory add` 11, `memory submit` 9, `memory search` 5, `directives list` 5, `directives` 3), counted by a
  script over the transcripts' `item.completed` events (review's figure, regenerated).
- **What the three S3 dry runs on Terra show** (n = 1, preliminary; scored from the main checkout):

  | Arm | Final public | Hold-out | Checks | M-F1 | Cost (USD) |
  |---|---|---|---|---|---|
  | baseline (`dry-runs/67`) | 34/37 | 16/17 | 0/1 | 3/5 | 0.4412 |
  | baseline-docs (`dry-runs/78`) | 34/37 | 16/17 | 0/1 | 3/5 | 0.7005 |
  | wingfoil (`dry-runs/79`) | 26/37 | 13/17 | 1/1 | 2/5 | 0.8499 |

  The campaign's estimate still lacks S1, S2 and S8 in baseline-docs and wingfoil on Terra: six more dry runs, to be
  consented in `campaign-cycle`.

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
- **Round 3** (a new independent agent, sandboxed; the fixes' diff): clean, no blocker, no should-fix; the chain
  "a server that does not start → failed, at its bound" checked through the adapter and the runner. **Nit, stated:** a
  lone surrogate in an env key or value names the string, not its server (the file is named by `codexMcpIssues`).
  **The review of the offline work is closed**; the spike's sessions get their own round before in-review.
- **The spike's round** (a new independent agent, sandboxed; the reflog unchanged after it): every figure of the table
  and the ledger matches the dry runs' files, and `dry-runs/67` is comparable with 78 and 79 (the same estimate key).
  - **should-fix, fixed:** the CLI count was hand-made and wrong (54; now 22 commands, 33 invocations, regenerated by a
    script); the MCP server's start was stated as a fact (now an inference, with its grounds); criterion 4 and the
    Design still described two step-1 sessions through the probe (now the approver's option A).
  - **nits, fixed:** the no-call's reason (WingFoil v0.3.0's server exposes no tool); the first, refused attempt's
    missing log stated; the Context's consent sentence points to the widening. **Stated:** the scratchpad scan
    script's comment and its treatment of a grep or git error inside its loop (outside the repository).
- **The re-review** (a new independent agent, the fix only): clean; one nit, the Context's sentence, fixed. **The
  review is closed.**
- **Rounds:** offline 3, the spike 2.

- **Full suites** (`scripts/full-suites.sh task/task-105`, the approver's request in chat): on `c0556018`, not dirty,
  LINT 0, TEST 0 (1748 passed, 8 skipped; coverage 97.51 % statements), BUILD 0, BIN 0 (8), DOCKER 0 (22, 2 skipped);
  log `.cache/full-suites/2026-10-26/task_task-105-c0556018-085106.txt`.

## Approval notes

- **in-review → approved** (`3830527c`): run by this session at the approver's explicit request in chat (2026-10-26),
  the status read first, the reason saying so. **Merge:** `--no-ff` on main (`097a0139`).
- **Worktree removed:** its ignored files were `.cache/arms/` (an arm read from history, rebuilt on demand),
  `coverage/` and `dist/`, listed before the removal: no evidence (the dry runs' records are on main, `b99474a8`).
  Branch `task/task-105` deleted.
- **Next, the approver's:** the campaign's six other dry runs (S1, S2, S8 in baseline-docs and wingfoil on Terra), then
  the campaign; and, before the next `bench site publish`, every execution under `site/` rebuilt (the method page).
