---
id: dl-031-gpt-6-luna-replaces-gpt-6.1-terra-as-campaign-007-s-model-slice-the-weak-model-on-codex-before-2026-11-13
type: decision-log
title: "gpt-6-luna replaces gpt-6.1-terra as campaign-007's model slice, the weak model on Codex before 2026-11-13"
status: approved
tags: ["v0.3","codex"]
---

## Context

The approver's aim for the benchmark (chat, 2026-10-28): a campaign with every scenario on the **weak models**,
Claude Haiku and OpenAI's Luna, to show whether WingFoil improves weak models (a stand-in for local LLMs), and to show
its benefit to a project's **governance** with the strong models too, the ground on which it is compared with other
tools and frameworks. The approver's stance on the campaigns so far (chat, 2026-10-28): they are **preliminary**,
evidence of improvements at best; speed and correctness come first, and a defect gets a note, not a rerun
(campaign-006's planned rerun is dropped for its bug-036 erratum).

What exists on the weak models (one run each but Luna's S1):

- **Haiku 5.5** (campaign-002's slice, v0.2's manual on WingFoil v0.3.0): S1 baseline 164/165, wingfoil 165/165;
  S3 baseline 35/37, wingfoil 30/37; wingfoil about 2.3–2.5 times the baseline's cost.
- **Luna** (`gpt-6-luna`, campaign-004's slice, the baseline only): S1 158, 158 and 165/165, S2 23/24, S3 30/37, S8
  23/23; about 0.012 USD and one to two minutes a run. No wingfoil arm has run on it.

[dl-028](dl-028-gpt-6-1-terra-as-a-model-slice-of-campaign-007-beside-gpt-5-6-terra-s-bridge.md) gave campaign-007
(the step-A arm on Codex, [dl-027](dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md))
a `gpt-6.1-terra` slice: a strong model, unverified on Codex 0.162.1, which adds little to the aim. Luna is reachable
only through Codex, so only until the credential's end on **2026-11-13** (dl-024); Haiku runs on the maintainer's
Claude subscription, with no deadline. The weekly Codex quota had 88 % left on 2026-10-28, resetting about
2026-11-04.

## Options

- **A. Luna replaces `gpt-6.1-terra`** as campaign-007's slice.
- **B. Luna beside `gpt-6.1-terra`:** both slices; about a day longer, and the strong slice serves the aim little.
- **C. Keep dl-028:** no wingfoil arm on a weak OpenAI model before the credential ends.

## Proposal

**A** (the approver's choice in chat, 2026-10-28: "Luna (gpt-6-luna) al posto di gpt-6.1-terra, procedi").

1. **dl-028's slice is withdrawn** (its items 1, 2 and 4): no `gpt-6.1-terra` session; its price row (task-110) stays.
2. **campaign-007's slice is `gpt-6-luna` at `medium`**, the three arms (baseline, baseline-docs, wingfoil at step
   A), **every scenario × 3** (S1, S2, S3, S8: 36 runs): Luna's S1 varies from 158 to 165/165 with the baseline alone,
   so one run per scenario would read noise; at Luna's cost the quota allows it. The default model stays
   `gpt-5.6-terra` (dl-027's 18 runs).
3. **dl-024's scope (bound 1)**, as dl-025, dl-027 and dl-028 widen it, **gains `gpt-6-luna`** for campaign-007's
   file and its dry-run profile, and **loses `gpt-6.1-terra`**; its other bounds and its end, 2026-11-13, unchanged.
   Codex 0.162.1 runs Luna already (campaign-004), so no check run is needed.
4. **Dry runs:** Luna's baseline-docs and step-A wingfoil arms, S1, S2, S3, S8 (8); the baseline's from
   campaign-004's (`dry-runs/68`, 72–74) when the estimate's key reads them, otherwise 4 more.
5. **The cut order of campaign-007:** Luna's S2, S3, S8 repetitions 2 and 3 first, then dl-027's order of the default
   model's runs (S3, then S1 × 3, then S2, then S8); Luna's first repetitions last, being the aim's.

**The quota:** Luna's 44 runs (36, and 8 dry runs) at about a hundredth of Terra's cost a run; inside this week
with dl-027's. **Spending: 0 € billed** (ChatGPT Plus), API-equivalent recorded in the v0.3 ledger.

## Consequences

- campaign-007 answers two questions: step A against v0.2's manual on Terra (the bridge with campaign-006, whose
  wingfoil arm carries bug-036's erratum: the comparison gets a note, not a rerun), and **step A on a weak model**,
  Luna, against its controls, read within Luna (T14), preliminary.
- The Codex scope (`src/cli/codex-scope.ts`, campaign-007's entry) and `campaigns/codex-terra-step-a.dry-run.yaml`
  change in a task of their own before any Luna session; campaign-007's element and file follow, with its estimate.
- **The next steps toward the aim** (the approver's request in chat, 2026-10-28, to record them):
  1. **After 2026-11-13, Haiku:** a Claude Code campaign of the step-A arms on Haiku 5.5 and Sonnet 5.5, every
     scenario, three repetitions at least; W17's "step A under Claude Code" (plan-005), no deadline.
  2. **Governance first in v0.4's planning:** the gates-and-roles scenario
     ([dl-029](dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md), category E) and v0.4's
     S4–S7, which the strong models need for a benefit to show and the competitors for a fair comparison; and the
     decision on repetitions (v0.2's retrospective, item 3) before any campaign is read as more than preliminary.
  3. **Local models later:** Haiku and Luna stand in for them; a local model needs an agent adapter and an
     eligibility assessment, a question for v0.4 or after.
