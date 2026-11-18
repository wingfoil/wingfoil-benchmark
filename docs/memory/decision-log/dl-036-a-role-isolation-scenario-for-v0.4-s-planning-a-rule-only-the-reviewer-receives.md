---
id: dl-036-a-role-isolation-scenario-for-v0.4-s-planning-a-rule-only-the-reviewer-receives
type: decision-log
title: "A role-isolation scenario for v0.4's planning: a rule only the reviewer receives"
status: approved
tags: ["v0.4","scenario","governance"]
---

## Context

The approver asked on 2026-11-18 for a scenario in which a rule that only the reviewer receives changes the reviewer's
work and nothing else. It is recorded here **as a candidate for v0.4's release-planning, not a decision**: dl-013
returns new scenarios to that release. It changes nothing in v0.3's remaining work.

**The gap.** G-E asks whether a harness keeps the work within declared rules:

- S8 measures whether an agent keeps the rules it receives (Q-E1). On the 1.1 dry runs twelve of its thirteen arms keep
  every rule check (`docs/calibration/v0.3.md` §6.3, H10), so it separates the arms little.
- S10 measures gates and roles (Q-E2, Q-E3), but its agent is only ever the developer and its verdicts are scripted.
- H5 ("a review phase catches what a read rule does not") has no scenario in which a violation is sure to reach a
  reviewer.
- No scenario asks whether a rule reaches **only** the role it is bound to.

**What the Benchmark holds that bears on it:**

- **WingFoil** binds directives to roles in `.wingfoil/roles.yaml` and hands them over by role (`wingfoil directives
  list --role <role>`, or the MCP Prompt `<role>-session`). The files stay readable in `.wingfoil/directives/`, so the
  separation depends on how the agent reads them.
- **How agents read them today.** In the 78 sessions of the `wingfoil` and `wingfoil-configured` arms on the 1.1 dry
  runs, 50 ran `directives list --role`, 18 read directive files without it, and 10 did neither (a count of the tool
  calls in the transcripts, 2026-11-18). Some ran `cat .wingfoil/directives/custom/*.md`, which reads every role's
  rules.
- **Spec Kit v1.1.0** has bundles with a `role` field, which package extensions and workflows for a profile. They do not
  bind a project's rules to a role.
- **OpenSpec 1.14.0**, as this repository records it, has a `context` and per-artifact `rules:` in
  `openspec/config.yaml`, and custom schemas. Its package was not read for this proposal.
- **The runner** gives a scenario one agent identity (`agentIdentityFor`), and a step has no role or workspace of its
  own.

## Options

- **A. A review step added to S8.** Rejected: S8 asks whether the agent keeps its own rules, and a new version would mix
  that question with another.
- **B. A reviewer added to S10.** Rejected: S10's verdicts are scripted so that every arm meets the same rejection. A
  reviewer's real verdict would remove what it controls.
- **C. A new scenario with frozen changes to review and two reviewers.** Proposed.
- **D. The same scenario, the reviewers reading the developer's own change.** Rejected: a developer that applies the
  rule leaves nothing to reject, so the reviewer's result would depend on the developer's.
- **E. Waiting for S9 (several agents with roles, level L4).** Rejected: S9 is far larger, and this question can be
  answered at level L1.

## Proposal

**C**, to be confirmed at v0.4's release-planning, as a scenario numbered **S11** provisionally.

**The rule.** Every export a change adds carries a TSDoc `@since <version>` tag, whose version is the next minor of
`package.json`'s. It is chosen because an agent has no reason to write it unprompted, it does not touch behaviour (so
hidden tests are unaffected), a script reads it from the AST, and a reviewer must check a value as well as a presence.
The seed holds no `@since` anywhere (K3). Two rules stay in reserve for a later version: new `Result` error codes start
with `ORD_`, and new interfaces start with `I`, a rule a reviewer may dislike and must still apply. A rule on string
enums was set aside: agents may already write them unprompted, so a violation would not be sure to occur.

**The steps,** each a fresh session with an identical prompt in every arm, naming no harness:

| # | Role | Works on | Expected |
|---|---|---|---|
| 1 | Developer | a feature, from the seed | the rule is not applied: it was never bound to this role |
| 2 | Reviewer A, bound to the rule | a frozen change that breaks the rule | reject, citing the rule |
| 3 | Reviewer B, not bound to it | the same frozen change | no finding on the rule |
| 4 | Reviewer A | a frozen change that keeps the rule | approve |
| 5 | Developer | step 1's change, with a scripted rejection stating the rule | the rule applied (M-E4) |

Each review session starts from its own snapshot, so that no reviewer sees another's verdict. The frozen changes belong
to the scenario. They vary the violation (the tag missing, the tag with a wrong version), and a verdict is written to
one neutral file, `review-verdict.json`, in every arm, so that no arm is scored on its tool's format.

**The arms:**

| Arm | How the rule is delivered |
|---|---|
| `baseline` | nowhere: the floor, and the control for how often the rule is broken unprompted |
| `baseline-docs`, and the other docs controls | as in an ordinary project: one rules file, with a section for the reviewer that every role can read |
| `wingfoil` | a directive bound to reviewer A's role in `roles.yaml` |
| `speckit`, `openspec` | bound to the role if a preliminary spike finds a native way; otherwise in their usual single place, stated on the method page |

The spike tries a preset or command used only in review on Spec Kit, and a schema with a review artifact on OpenSpec.
The docs controls stand for common practice, not for the best Markdown that could be written.

**The question and the metrics:**

- **Q-E4:** does a rule reach only the role it is bound to, and does that role apply it?
- **M-E5 exposure:** whether a session not bound to the rule read its text, from the session's transcript, scored when
  the run is scored so that the result is published without the transcript. The rule's file name does not reveal the
  rule.
- **M-E6 leakage:** the share of the exports step 1 adds that keep the rule, read from the AST.
- **M-E7 detection:** the frozen violations reviewer A rejects, citing the rule and the file.
- **M-E8 false alarms:** reviewer B's findings on the rule, and reviewer A's rejections of the clean change.
- **Reused:** M-E4 (rejection honoured), M-Q1 with hidden tests, M-K1 and M-K2.

**The hypotheses, written before the scenario exists** (they extend `docs/calibration/v0.1.md` §11):

| # | Hypothesis | Holds when |
|---|---|---|
| H12 | A rule bound to a role stays with that role | in every `wingfoil` run, the developer and reviewer B are not exposed to the rule, and M-E6 is at `baseline`'s level |
| H13 | The bound reviewer applies the rule | in every `wingfoil` run, M-E7 is complete and M-E8 is zero, at `baseline-docs`' level or above |

**The conflict of interest.** The scenario is built around a capability WingFoil has natively, and the Benchmark's
maintainer also builds WingFoil. That is why the hypotheses come first and can fail. Today's reading habits (Context)
make a failure of H12 plausible, and a failure is published as a finding about WingFoil and how agents use it.

## Consequences

- **At v0.4's planning:** the scenario enters as a candidate. Its specification, the spike
  and the runner's changes are each filed as their own task.
- **The runner and the method need:** a role and a workspace snapshot per step, the neutral verdict file, the transcript
  reading behind M-E5, and Q-E4 with its metrics in the experiment design.
- **Spending:** none until its dry runs, which need the approver's spending consent like any other.
