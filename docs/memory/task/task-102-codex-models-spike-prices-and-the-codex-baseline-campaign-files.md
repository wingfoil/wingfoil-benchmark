---
id: task-102-codex-models-spike-prices-and-the-codex-baseline-campaign-files
type: task
title: "Codex models spike, prices and the Codex baseline campaign files"
status: in-progress
release: v0.3
wave: W15
features: []
acceptance: []
requirements: [REQ-RUN-09, REQ-RUN-13, REQ-RUN-15, REQ-NFR-01]
fixes: []
tags: ["codex","spike","v0.3"]
---

## Context

[dl-022](../decision-log/dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)'s
Codex campaign, arm A: the baseline arm on S1, S2, S3 and S8 at 1.0 (the baseline's digest `964b1354526c`), Codex CLI
0.162.1 on Sol, Terra and Luna at one reasoning effort, on the maintainer's ChatGPT Plus subscription, which ends on
**2026-11-13**. W15 of [plan-005](../../plans/plan-005-release-v0-3.md), after task-101 and after
[dl-024](../decision-log/dl-024-the-codex-campaign-s-subscription-credential-on-dl-019-s-model.md) (the credential) is
approved. A spike: no feature, no acceptance scenario.

**The pending → backlog approval of this task is the consent for its real sessions:** one Codex session per model (3),
each on S3's first step, from the main checkout, under dl-024. The dry runs and the campaign are consented separately
in `campaign-cycle`.

**Done** means: the three models' ids, effort levels and quota indicator verified; their list prices in the price
table; dl-024's code bounds in place; `campaigns/codex-baseline.yaml` and its dry-run profile, validating.

## Acceptance criteria

1. Terra's and Luna's model ids under Codex 0.162.1, the reasoning effort accepted by all three, and how the Plus
   quota shows in Codex's output, each read from one real session and recorded in the Execution notes. **Spike.**
2. Their list prices in `src/agents/openai-prices.ts`, with the source and the date read. **Red-first** (the price
   table's tests).
3. dl-024's bounds enforced: a Codex run past 2026-11-13 or from a campaign outside its scope refused; the adapter's
   thread map cleared at the end of each run; `CODEX_HOME`'s sqlite stores cleared before every step. **Red-first.**
4. A failed or killed Codex invocation recorded at its bound, not as zero
   ([bug-032](../bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md), the Codex case), checked
   offline from fixtures. **Red-first.**
5. `campaigns/codex-baseline.yaml` extending `baseline-across-agents` (or, with dl-022's fallback, a whole file) with
   `agent: codex`, the three models and S1–S8 at 1.0, and its dry-run profile; both pass `bench campaign validate`
   and `estimate`. **Characterization.**

## Design

- **The phases**, as task-094's (`spikes/task-094/probe.sh` is the model):
  - **Free, no session:** Codex 0.162.1's model presets and effort levels read from its released source; Terra's and
    Luna's list prices read from OpenAI's pricing page; both recorded with their source and the date read. If a
    model is not offered to Codex 0.162.1, or has no list price, the task stops and asks.
  - **Offline code** (criteria 2–5), reviewed by an independent agent before any real session, one round at a time
    under dl-020.
  - **The three real sessions** (the consent of this task's pending → backlog approval): `spikes/task-102/probe.sh`
    runs S3@1.0 step 1 in the baseline arm, outside the runner, once per model (Sol, Terra, Luna) at the effort F1
    reads, `step_time_s` 1800 s. **Spending: 0 €** (the Plus quota); API-equivalent expected well under 1 USD a
    session, recorded and flagged `price-table`. A failed session is not repeated without new consent. The secret scan
    after each session. One line of `docs/calibration/v0.3-ledger.md` each.
  - The approver logs in by hand first (dl-024, dl-019 bound 3): `CODEX_HOME=$HOME/.codex-bench`, `codex login
    --device-auth`, `cli_auth_credentials_store = "file"`. The session names the path only.
- **dl-024's bounds in code:**
  - `bench campaign run` and `bench scenario dry-run` refuse `agent.name: codex` after **2026-11-13** (the clock
    injected, so that the test is not dated), and a Codex campaign that does not extend
    `presets/baseline-across-agents.yaml` (dl-022's fallback, a whole file, would need the approver's word and an
    amendment of dl-024 first); a Codex dry-run profile must hold the baseline arm only.
  - The agent port gains an optional `endRun()`, called by the runner after each run; the Codex adapter clears its
    thread map there.
  - `CODEX_HOME`'s stores are already emptied before every step but `auth.json` and `config.toml`
    (`src/agents/profile.ts`, task-094): characterization.
- **A failed Codex invocation's cost** ([bug-032](../bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md),
  its Codex case): when the stream holds no `turn.completed`, the adapter says its usage is not reported, and the
  runner counts the step at its bound, as it does a killed one (`cost_reported: false`). bug-032's other cases stay
  with W16.
- **The campaign files:** `campaigns/codex-baseline.yaml` extends `presets/baseline-across-agents.yaml` with `agent:
  codex` (the version and effort F1 pins), `models` (Sol by default, Terra and Luna as slices over every scenario of
  the baseline arm, so that one execution holds the three) and the budget in API-equivalent euro; its dry-run profile
  `campaigns/codex-baseline.dry-run.yaml`, written whole (task-101: profiles do not extend presets).
- **Requirements 1.35:** REQ-NFR-01's exception restated for dl-024's scope; the Codex refusals (REQ-RUN-15);
  `endRun` (REQ-ARC-04); the failed invocation's bound (REQ-RUN-09).

## Execution notes

- `npm run -s wingfoil -- memory add --type task --title "…" --tags "…"` on main, at v0.3's release-planning
  (2026-10-24). Declared: the element from the template in `draft`, one commit. Observed: as declared.
- The body committed by hand (`e7a5e1e2`), then `memory submit` (draft → pending). Declared and observed: one commit,
  `status: pending`.
