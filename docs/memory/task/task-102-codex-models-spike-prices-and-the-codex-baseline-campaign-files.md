---
id: task-102-codex-models-spike-prices-and-the-codex-baseline-campaign-files
type: task
title: "Codex models spike, prices and the Codex baseline campaign files"
status: pending
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

- **Order within the quota** (dl-022): if not everything fits by 2026-11-12, S3's dry runs on every model, then Sol's
  whole campaign, then Luna, then Terra.
- The adapter is task-094's; only the bounds, the store clearing and the failure's cost are new.
- **Security:** the delivery session names `$HOME/.codex-bench/` only; it never reads, prints, copies or lists the
  credential (dl-019 bounds 2–7 and 9, restated by dl-024). The secret scan after every stage that ran Codex.
- Results are published only as their own cross-agent comparison, never mixed with the Claude headline (T14).
