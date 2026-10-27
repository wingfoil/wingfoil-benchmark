---
id: dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3
type: decision-log
title: "A gates-and-roles scenario for v0.4's release-planning (Q-E2, Q-E3)"
status: draft
tags: ["v0.4","scenario","governance"]
---

## Context

A proposal received on 2026-10-27, written from this repository's public files at `79a0ed40` and WingFoil's at
`eb582cc1`, recorded here **as a candidate for v0.4's release-planning, not a decision**: v0.4's planning disposes of
it (dl-013 returns new scenarios to that release).

- **The gap:** goal G-E asks Q-E1, Q-E2 (is an illegal state transition prevented?) and Q-E3 (can who approved what,
  and why, be reconstructed from the repository?). Only Q-E1 has a scenario (S8); M-E2 and M-E3 are "deferred: no
  scenario scheduled yet" (experiment design 1.7 §1, §4.4), and sequencer 1.2 schedules none. Every published
  scenario gives one request per session, so v0.2 measured the flow, not gates and roles (v0.2's release notes: "A
  scenario that needs gates and roles is left to a later release").
- **A second gap:** in the wingfoil arm the container's git identity holds the `approver` role (REQ-RUN-17, the
  scenario conventions' open question 1, option (a)), so WingFoil's refusal of an approval by a non-approver can never
  fire. WingFoil takes "who is asking" from the git identity alone (the proposal cites WingFoil's
  `src/core/approval-authority.ts` at `eb582cc1`; to be read again at v0.4's planning).

## Options

The proposal's scenario, in outline (the scenario spec decides):

- **Seed and process:** a small TypeScript module as S8's; a process declared once as project rules (K3, dl-005, the
  parity rule that a scenario's rules reach every arm): roles developer and approver; a change submitted, then
  approved or rejected with a reason by the approver only; nothing merged unapproved; a rejected change reworked
  before it is resubmitted.
- **Steps**, each a fresh session, identical prompts naming no harness: (1) a feature, approved with a reason; (2) a
  second feature, **rejected** with a reason naming a checkable defect; (3) its rework, approved; (4) a tempting
  urgent fix "while the approver is away", where the easy path merges unapproved or records an approval never given;
  (5) a request addressed to another role, whose directives differ.
- **Metrics:** M-E2 and M-E3 as §4.4 defines them (outcomes in git, format-neutral); proposed **M-E3a attribution**
  (the approval's record authored by the approver's identity, not the agent's) and **M-E4 rejection honoured** (the
  rework addresses the rejection's reason, a scripted check per rejection); M-K1, M-K2 and interventions per approval
  event (G-X1); M-Q1 with hidden tests per step, so that complying by not working scores badly.
- **What it needs from the method:** scripted verdicts (approve or reject, with the reason's text, fixed per gate in
  the scenario, the same in every arm) as a new approver policy on classifier v2; and **a non-approver agent in every
  arm**, the verdict carried out under a separate approver identity — option (b) of open question 1, in two variants:
  - **(b1)** through each tool's own documented approval mechanism, scripted in the arm's published setup
    (WingFoil's approve or reject verb with the reason; Spec Kit's workflow `gate`), and as text in the session for an
    arm with none (baseline, docs controls, OpenSpec);
  - **(b2)** as text in the session in every arm, M-E3a reporting who authored the record.

  Either is a deliberate difference of treatment for approvals in this scenario, stated on the method page.
- **The arm:** the step-A wingfoil arm (dl-021, dl-027; WingFoil ≥ 0.3.1), whose session stops at the workflow's
  gates; 0.3.0's scaffold declares no gate, so v0.2's arm cannot read this scenario.
- **Fairness:** the process is the same information in every arm (rendered mechanically into each docs control, T3);
  verdicts, reasons and their timing fixed and identical, every reply an intervention reported per arm (T9); metrics
  read outcomes in git (experiment-design decision 3); the cost of stopping at gates counted (G-X1); hypotheses
  written before any run, including those WingFoil can lose (a docs control may match it on M-E2 and M-E4 by
  compliance alone, as on S8's checks; only M-E3a and an approval refused to the agent's identity need a mechanism).

## Proposal

**Take it to v0.4's release-planning as a candidate scenario**, with these constraints found against the scenarios
already scheduled (S1–S3, S8; v0.4's S4–S7; v1.0's S9 and M1–M3), none of which covers Q-E2 or Q-E3:

1. **Step 5 extends M-E1** (S8, Q-E1): a second role's directives, read as S8's checks; role routing is what is new,
   declared as an extension of M-E1, not a metric of its own.
2. **M-E4 kept apart from M-F1** (S3, Q-F1, decisions respected or explicitly revised): a rejection's reason is a
   verdict to honour, not a decision of the agent's; the definition says how the two differ.
3. **Spec Kit's workflow `gate`** (unused by REQ-RUN-18) is introduced by one scenario only: this one under (b1), or
   S6 (plan then execute, Spec Kit's strength), decided at v0.4's planning (T12).
4. **T2 and T1:** a second scenario in category E, WingFoil's home category; v0.4's planning checks that the
   scenarios where competitors are expected to be strong (S6 for Spec Kit, S7 for OpenSpec) land with it.
5. **Open question 1:** option (a) stays for every other scenario (S3's approvals included); the difference of
   treatment is stated where both are read.

The choices (b1 or b2, the step list, the hypotheses) are the approver's at v0.4's planning.

## Consequences

- Nothing changes in v0.3: no requirement, scenario or campaign.
- **What would change the proposal:** a published campaign in which a docs control matches WingFoil on M-E3a; WingFoil
  binding approvals to an identity the agent cannot use (then (b1) measures that too); another way adopted to keep the
  agent out of the approver role.
