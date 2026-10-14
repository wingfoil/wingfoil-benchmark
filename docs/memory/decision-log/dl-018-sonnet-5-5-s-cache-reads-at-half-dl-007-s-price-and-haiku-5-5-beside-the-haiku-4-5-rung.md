---
id: dl-018-sonnet-5-5-s-cache-reads-at-half-dl-007-s-price-and-haiku-5-5-beside-the-haiku-4-5-rung
type: decision-log
title: "Sonnet 5.5's cache reads at half dl-007's price, and Haiku 5.5 beside the Haiku 4.5 rung"
status: pending
---

## Context

Found by [task-093](../task/task-093-the-agent-pin-for-v0-2-checked-on-the-three-models-spike.md)'s free reads, on
2026-10-14, before calibration. Two facts have changed since
[dl-007](dl-007-claude-5-5-models-for-the-v0-2-campaign.md) was approved (`e09918a`, 2026-10-05):

1. **Sonnet 5.5's cache reads cost 0.10 USD per million tokens, not 0.20.** Anthropic's pricing page
   (`platform.claude.com/docs/en/about-claude/pricing.md`, read 2026-10-14) prices a cache hit on Sonnet 5.5 at 5 % of
   its input price, 0.10 USD per million tokens (Opus 5.5: 0.20). Claude Code's
   CHANGELOG, 2.1.296: `/cost`, `--max-budget-usd` and the SDK's cost figures price Sonnet 5.5 cache reads at $0.10
   (was $0.20). task-093's P2 (Claude Code 2.1.300) reported 0.0969887 USD, which the tokens give at 0.10 and not at
   0.20. dl-007's price table, the starting point of v0.2's budget, says 0.20.
   - A run's cost is mostly cache reads (dl-007), so the v0.2 campaign on Sonnet 5.5 costs less than the first
     sizing assumed. Calibration measures it in any case; the table is what the estimate's reasoning cites.
   - An agent older than 2.1.296 prices Sonnet 5.5's cache reads at twice the list price while reporting
     `costBasis: "list"`: bug-016's check cannot see a stale price table. The agent pin is the only guard
     (task-093 recommends 2.1.300).
2. **Claude Haiku 5.5** (`claude-haiku-5-5`) is released (Claude Code 2.1.293): 1 M context, 0.10 / 0.50 USD per
   million input / output tokens (0.50 / 2.50 over 100 K tokens of prompt), cache reads 0.01. In Claude Code 2.1.300
   the `haiku` alias names it, and it is the default Haiku on the Anthropic API. dl-007 E added **Haiku 4.5** as the
   ladder's weak model (200 K context, 1.00 / 5.00 USD), which is still served and priced at list (task-093's P1).
   - Claude Code calls a Haiku for its own work: in v0.1, Haiku 4.5 beside Sonnet (dl-007). From 2.1.300 those calls
     may go to Haiku 5.5; task-093's short sessions made none, so calibration's dry runs are the first to show it.
     The runner already records every model the agent uses (task-054, bug-012).

## Options

- **A. Amend dl-007's price table only.** Sonnet 5.5's cache reads at 0.10; the Haiku 4.5 rung as approved. A hand
  edit of dl-007 with `Approver:` and `Reason:` (W-07).
- **B. A, and the weak-model rung moves to Haiku 5.5.** It is the current Haiku and far cheaper, but with 1 M context
  it is a different kind of weak model from the one dl-007 chose, and nothing of it has been measured here.
- **C. A, and both Haiku rungs.** Four more runs and their dry runs, a few euro at Haiku's prices; the ladder gains a
  step.

## Proposal

**A.** The ladder's purpose (T14, dl-007) is a weak model against the default; Haiku 4.5 is that, still served and
correctly priced on the recommended pin. Haiku 5.5 is a question for v0.3's ladder, when it can be measured. The price
table is corrected before calibration, so that the revised budget starts from list prices.

## Consequences

- dl-007's price table and its Sonnet 5.5 paragraph are amended (A, B, C).
- With B or C, `campaigns/v0-2-reference.yaml`'s Haiku slice and its effort pin change, and calibration adds Haiku
  5.5's dry runs (a consent of their own).
- Calibration watches which Haiku Claude Code calls for its own work, in every dry run's `modelUsage`.
