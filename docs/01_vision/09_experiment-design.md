# Experiment Design (GQM) — WingFoil Benchmark

**Version:** 1.10
**Date:** 2026-10-30
**Status:** Approved
**Traces to:** [06_features.md](06_features.md) (F2.4, F2.7, F4.x, F7.4), [07_sequencer.md](07_sequencer.md) (decisions 1–3), [03_is-isnot.md](03_is-isnot.md) 1.1; input: [X_competitor-landscape-2026-09-22.md](X_competitor-landscape-2026-09-22.md), [X_competitor-landscape-2026-10-05.md](X_competitor-landscape-2026-10-05.md) (1.2); [dl-017](../memory/decision-log/dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md) (1.3); [task-094](../memory/task/task-094-a-codex-agent-adapter-and-s3-s-baseline-compared-across-agents-spike.md) (1.4); [task-095](../memory/task/task-095-wingfoil-v0-3-0-admitted-to-the-wingfoil-arm-the-bridge-s-arm-read-by-its-pinned-digest.md) (1.5); [dl-018](../memory/decision-log/dl-018-sonnet-5-5-s-cache-reads-at-half-dl-007-s-price-and-haiku-5-5-beside-the-haiku-4-5-rung.md), [task-096](../memory/task/task-096-calibration-of-v0-2-dry-runs-in-every-arm-and-the-bridge-measured-costs-and-the-revised-budget.md) (1.6); [task-103](../memory/task/task-103-the-v0-3-vision-and-experiment-design-amendments.md) (1.7); [task-116](../memory/task/task-116-s10-gates-and-roles-scenario-dl-029.md) (1.8); [task-117](../memory/task/task-117-approver-policy-v3-scripted-verdicts-per-gate-on-classifier-v2-dl-029.md) (1.9); [task-118](../memory/task/task-118-a-separate-approver-identity-the-agent-never-the-approver-verdicts-executed-by-the-runner-dl-029.md) (1.10)

---

This document makes the benchmark a **measurement instrument**. It fixes:

- **what** is measured, with Goal-Question-Metric;
- **how** runs are executed, so that arms are comparable;
- **how** each metric is computed, with operational definitions and no rhetorical ones;
- **what could make the results wrong**, and how each threat is mitigated;
- **what a campaign costs**.

Scenario details (seeds, prompts, oracles) belong to the specification phase. Every scenario must
answer at least one question below.

---

## 1. Goals, questions, metrics

Goals follow the categories A–G. **Active in v0.1:** C, D, E, F (sequencer).

The same object and the same viewpoint apply to every goal:

- **Object:** a harness (WingFoil, a competitor, or none).
- **Viewpoint:** the result profiles of [04_personas.md](04_personas.md) §2.
- **Comparison:** against the baseline arm, and each harness against its own docs control (1.2), with the agent and
  model fixed.

| Goal | Purpose | Questions | Metrics (§4) | Scenarios | Release |
|---|---|---|---|---|---|
| **G-C Development** | Does the harness improve how well an agent implements a specification? | Q-C1 Does the result conform to the spec? · Q-C2 At what cost? | M-Q1 hidden-test pass rate · M-Q2 static quality · M-K1 cost · M-K2 time and turns | S1 | v0.1 |
| **G-D Maintenance & Quality** | Does the harness improve finding and fixing defects without regressions? | Q-D1 How many real defects are fixed? · Q-D2 Are non-defects rejected? · Q-D3 How many regressions? | M-Q1 · M-D1 defects fixed / injected · M-D2 false-report handling · M-D3 regressions | S2 (later S7) | v0.1 |
| **G-E Governance & Compliance** | Does the harness keep the work within declared rules? | Q-E1 Are directives respected across steps? · Q-E2 Is an illegal state transition prevented? · Q-E3 Can who approved what, and why, be reconstructed from the repository? | M-E1 directive violations · M-E2 illegal transitions prevented · M-E3 approval reconstructibility · M-E3a attribution · M-E4 rejection honoured (1.8) | S8, S10 (1.8) | Q-E1 in v0.1; Q-E2 and Q-E3 deferred (§4.4, 1.2), then S10, first run in v0.3's W17 campaign (1.8) |
| **G-F Knowledge & Continuity** | Does the harness carry decisions and domain knowledge across fresh sessions? | Q-F1 Are earlier decisions respected, or explicitly revised? · Q-F2 What does the next change cost? | M-F1 decision consistency · M-F2 next-change cost | S3 (later S4) | v0.1 |
| **G-A Inception & Specification** | Does the harness improve turning ambiguous input into requirements? | Q-A1 Coverage of the expected requirements · Q-A2 Ambiguities flagged | expected-items coverage · blind-judge rubric | S5 | v0.4 (1.7) |
| **G-B Planning & Management** | Does the harness produce plans that another session can execute? | Q-B1 Is the plan executable by a fresh session? | downstream pass rate and cost | S6 | v0.4 (1.7) |
| **G-G Collaboration** | Does the harness reduce conflicts between parallel agents? | Q-G1 Conflicts and inconsistencies | merge conflicts · duplicated or contradicting work | S9 | v1.0 |

Two goals cut across all categories:

- **G-X1 Cost of the harness.** Q: what does the harness add in setup and per step, and when does it
  pay off? Metrics: M-K3 setup cost and M-K4 break-even.
- **G-X2 Determinism.** Q: do repeated runs produce substantially equivalent results? Metrics:
  M-R1 to M-R3.

---

## 2. Arms

| Arm | Environment | Purpose |
|---|---|---|
| **baseline** | the agent, the seed, and a minimal instruction file (the same one-paragraph project description for every arm) | the plain agent |
| **baseline-docs** | as baseline, plus the **same information** as the wingfoil arm, rendered as free-form Markdown | a control: "more context" versus "a harness" |
| **wingfoil** | as baseline, plus WingFoil at the campaign's version, initialized and configured, with its MCP server, and the arm's operating manual. From v0.3.0 (1.5), WingFoil as its documentation sets it up: the `init` scaffold, whose workflows declare no role, action or product, with no workflow written for the benchmark | the subject |
| **competitor arms** (v0.2: **speckit**, **openspec**) | as baseline, plus the tool at a pinned version, set up from its official documentation, and the arm's operating manual | fair comparison |
| **docs controls** (v0.2: **speckit-docs**, **openspec-docs**) | as baseline, plus the **same information** as their harness arm, rendered as free-form Markdown. `baseline-docs` keeps its name and stays the wingfoil arm's control | a control per harness: "more context" versus "this harness" (1.2) |
| **configured variants** (v0.3, 1.7: **wingfoil-configured**, **speckit-configured**, **openspec-configured**, each with its configured docs control) | as their harness arm, plus a configuration for the project written by a configuring agent that sees only the seed and the README | the harness as its users would configure it, not only on its defaults (F7.5) |

**Parity rules:**

- **Every docs control is generated mechanically** from its harness arm's configuration as the agent would meet it,
  with no hand-editing (amended in 1.2):
  - `baseline-docs` from the wingfoil arm's: DNA, directives, workflow descriptions;
  - `speckit-docs` and `openspec-docs` from their arms'.

  "The same information" is the project information and the rules the tool's configuration holds, never the tool's
  own mechanics. Parity of information is then a property of each generator, not of good intentions, and what each
  one renders, and why, is published. Each harness is compared with the baseline **and** with its own docs control
  (T3).
- **A scenario's project rules reach every arm** (1.2). They are declared once in the scenario and rendered into each
  tool's own place for rules, and into each docs control as Markdown. The scenario itself does not change, so it stays
  comparable across campaigns.
- **Eligibility** (F7.4, 1.2): a tool gets an arm only when it meets five published criteria:
  - it runs with the campaign's agent and model id;
  - its version can be pinned and installed reproducibly;
  - it runs headless in a container;
  - it is a workflow harness, not only a standards or prompt pack;
  - it calls no LLM of its own.

  WingFoil is assessed like every tool (T1). A tool that fails is listed as excluded, with its reason.
- **Setup from official documentation** (T12): each harness is installed and initialized as its documentation says,
  scripted and published. Every deviation from a tool's defaults is published with the setup. One deviation applies
  to every tool: **telemetry is turned off**.
- **The runner starts the agent in every arm** (1.2). A harness whose own engine can start the agent, such as Spec
  Kit's `specify workflow run`, is followed through the commands or skills it gives the agent. The engine-led mode is
  taken up for every engine-led harness at once, when WingFoil also has its workflow engine. A competitor arm has no
  approver member: its only approvals are the neutral approver's replies.
- **Operating manuals** (is/is-not 1.1): one fixed, published file per arm. It maps a step's intent
  to the harness's commands. Its cost counts as setup. Its size in tokens is **reported for every
  arm**, because a longer manual is also more context, and that is a confound. From v0.3 (1.7) the size of every docs
  control's rendered information is published beside it.
- **The wingfoil arm, step A** (1.7, WingFoil ≥ 0.3.1,
  [dl-021](../memory/decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)):
  the session agent drives WingFoil's workflow cycle (status, next, the step's role, stop at the workflow's gates,
  finalize), with no driver written by the benchmark; the setup opens one workflow instance per scenario; the agent's
  context comes from WingFoil's MCP session Resource, pending records included, and its recording follows the step's
  evidence; the arm's agent-specific files are explicit. **The step's work is completed before the session stops at
  a gate.** `baseline-docs` then carries every role's directives, labelled by role. Each step is a new arm version,
  read through a bridge or a recalibration. Steps B
  (WingFoil 0.4, the runner launching through `wingfoil agent execute`) and C (1.0, the engine executing the steps)
  are not commitments.
- **Configured variants** (1.7, F7.5): the configuring agent runs once per scenario version and harness, before any
  campaign, from the seed and the README alone; its configuration is versioned in the scenario (1.1) and published;
  its cost is the arm's one-off setup cost (M-K3). Each configured arm has a configured docs control generated from
  that configuration by the same generator as its harness's, so T3 holds for it too. Whether the unconfigured arms
  stay, or campaigns run partially from presets, is decided after calibration. **The configuring agent, its model
  and its prompt are the same for every harness and published** (T12); the installation follows the setup rule above,
  and the configuration is the published deviation from the tool's defaults.
- **Step prompts are identical** across arms and name no harness. The leak scan (F3.2) checks this.

---

## 3. Run protocol

1. **Pins.** The campaign file fixes:
   - every harness version;
   - the scenario versions;
   - the agent and its version;
   - the model id;
   - repetitions, per-run caps and the neutral-approver policy version;
   - the €/$ rate used for the API-equivalent cost.
2. **Isolation.** A fresh container per run. It holds only the seed and the arm's environment. It
   never holds the oracle, the hold-out, the runner or other runs. **Internet access is allowed**, so
   that agents and tools can install and look things up as they would in real work (experiment-design
   decision 4). The run log records the agent's web requests, so their use can be reported (T13).
3. **Setup phase.** The arm's setup script runs first. Its tokens, time and cost are recorded as
   **setup**, apart from the steps.
4. **Steps.** Each step starts a **new agent session**, headless, with the step prompt. Only the
   repository carries state between steps. After each step the runner commits the working tree with
   a neutral message, so that every step leaves a snapshot to score.
5. **Neutral approver** (F2.4). When a session ends while waiting for input (a question, or an
   approval request), the runner resumes it with a fixed reply from the policy below. Each reply is
   one **intervention**.
   - The policy is the same for every arm and has a version.
   - **Policy v1** (experiment-design decision 2):
     - approval requests get *"Approved. Proceed."*;
     - questions get *"No further input is available. Make the most reasonable choice, record it,
       and proceed."*;
     - after **3 interventions** in a step, the step ends.
   - **Policy v2** (1.7, [dl-026](../memory/decision-log/dl-026-waiting-for-input-classifier-v2.md)): v1's replies
     and cap, with classifier v2: an approval pattern counts only when it is addressed to the reader, the approver
     ("need … approval" with a document as its subject is an account, not a request), requests addressed to the reader
     that v1 missed are read (Codex's "Please reply: Approved. Proceed."), and a question is read anywhere in the last
     two paragraphs. Both versions stay; a campaign pins one, and executions on different versions are not compared
     across agents, nor intervention for intervention.
   - **Policy v3** (1.9, [task-117](../memory/task/task-117-approver-policy-v3-scripted-verdicts-per-gate-on-classifier-v2-dl-029.md),
     dl-029): v2's classifier, replies and cap, and a scenario's **scripted verdicts**: at a step that declares one
     (S10's, the same in every arm), the first approval request gets the verdict's text (approve, reject, or no
     approver to give one) and the later ones its later reply. A scenario with no verdict reads v3 as v2; a campaign
     running one with verdicts pins v3.
   - **Policy v4** (1.9, task-119, bug-038): v3, and, in a scenario with an approver, a message that waits on her, by
     name, is an approval request too, once a step: the verdict reaches an agent that addresses her in the third
     person; **v5** reads the wait by any approval word in a sentence naming her, verdicts already given aside, after
     v4 missed "needs Dana Okafor's approval". S10's campaigns pin v5.
   - **A separate approver** (1.10, task-118): in a scenario that declares one (S10), the agent is a developer and the
     runner carries each scripted verdict out under the approver's identity, through the arm's documented approval
     mechanism when it has one, as text otherwise; a ledger of the verdicts delivered and carried out is kept per
     step. Every other scenario keeps the agent as the declared approver (open question 1, option (a)).
6. **Caps.** Every step has a time cap and a token cap. Every run has a cost cap. Hitting a cap ends
   the step or run, and the result is scored as it stands.
7. **Scoring** happens outside the container, on the per-step snapshots, with the oracle read from
   the scenario or from the hold-out path.

---

## 4. Metric definitions

### 4.1 Quality

- **M-Q1 hidden-test pass rate:** passed ÷ total hidden tests, on the final snapshot and on every
  step snapshot where the scenario defines tests for that step.
- **M-Q2 static quality**, on the files changed by the run:
  - lint findings per 1,000 lines;
  - mean and maximum cyclomatic complexity;
  - duplicated-line percentage;
  - test coverage.

  Each is reported separately. There is no composite score.
- **M-D1:** injected defects fixed (a fix is counted when the defect's own hidden test passes) ÷
  injected defects.
- **M-D2:** false or duplicate reports correctly rejected ÷ false or duplicate reports.
- **M-D3 regressions:** hidden tests that passed on the seed and fail at the end.

### 4.2 Cost

- **M-K1 cost:** input, output and cache tokens, and the API-equivalent cost in €. It is always
  reported, whatever the billing (sequencer decision 1).
- **M-K2:** wall time, turns, and interventions.
- **M-K3 setup cost:** the M-K1 and M-K2 values of the setup phase, including the operating manual's
  tokens. From v0.3 (1.7) it also holds the **one-off costs** of an arm: a configured variant's configuring agent
  (F7.5), counted once per scenario version and harness, not per run.
- **M-K4 break-even**, per scenario:

  n* = setup cost of the arm ÷ (mean step cost of the baseline − mean step cost of the arm)

  It is defined only when the arm's quality is not worse than the baseline's on M-Q1. Otherwise it
  is reported as "not applicable"; from v0.3 (1.7,
  [bug-029](../memory/bug/bug-029-m-k3-is-always-zero-and-m-k4-s-not-applicable-ignores-the-variance.md)), the
  variance is taken into account, and W16's task settles which difference it applies to.
  When the arm's step cost is not lower, it is reported as "never".

### 4.3 Continuity

- **M-F1 decision consistency:** for each earlier decision that the scenario's oracle lists, the
  final state either respects it, or revises it **explicitly** (a recorded, reasoned change). The
  metric is the share of decisions respected or explicitly revised. Silent breakage counts as a
  failure. The checks are scripted per scenario.
- **M-F2 next-change cost:** the M-K1 cost and the M-Q1 pass rate of each step after the first,
  attributed to the code left by the previous steps.

### 4.4 Governance (tool-neutral)

- **M-E1 directive violations:** scripted checks per directive, for example new dependencies, public
  functions without documentation, or wall-clock use in business logic. The metric is violations per
  step.
- **M-E2 illegal transitions prevented** (deferred in 1.2: no scenario exercises it in v0.2, and none is scheduled
  yet; still unscheduled at sequencer 1.2): the scenario asks for a transition its declared
  process forbids. The metric is whether the final repository shows it happened. It depends only on
  the outcome, not on how the tool stores state.
- **M-E3 approval reconstructibility** (deferred in 1.2, as M-E2): for each approval event in the scenario, can the
  approver and the reason be found from the repository alone? It is checked by a **scripted,
  format-neutral tool** (experiment-design decision 3): an approval event is reconstructible when
  the approver's identity and a non-empty reason appear in any git-tracked file, or in any commit,
  changed at that step. The time comes from git. The tool looks for content, never for one harness's
  file or commit format.

- **M-E3a attribution** (1.8, S10): for each approval event delivered in a scenario whose approver is a separate
  identity (open question 1, option (b)), whether the record of the verdict is a commit authored as the approver's
  identity that the runner's verdict ledger lists. In an arm with no approval mechanism the verdict is text only, and
  M-E3a is zero by construction: a property of the treatment, stated on the method page, not a finding.
- **M-E4 rejection honoured** (1.8, S10): for each rejection delivered, whether the rework addresses its reason, read
  by a scripted check or suite per rejection at the rework's step; not applicable when the rejection was never
  delivered. It differs from M-F1: a rejection is someone else's verdict to honour, never a decision of the agent's to
  revise.
- **M-E2 and M-E3 in S10** (1.8): M-E2 counts a release without approval and a forged approval (a commit authored as
  the approver's identity that the ledger does not list); M-E3 reads the verdict's identity, its own word and its
  subject, by content.

### 4.5 Determinism (operational)

These metrics apply to the repetitions of the same arm, scenario and pins: 3 repetitions on S1 in
v0.1. From v0.2 they also apply across agents, once a second agent exists.

- **M-R1 outcome agreement:** the share of hidden tests that get the same verdict in every
  repetition.
- **M-R2 interface similarity:** the mean pairwise Jaccard similarity of the public interface
  (exported symbols and signatures, extracted by a scripted parser).
- **M-R3 structure similarity:** the mean pairwise Jaccard similarity of the set of file paths,
  excluding generated and harness files.

**Across agents (made precise in 1.4).** Two executions, one per agent, are compared group by group: the same
scenario version and the same arm. The agent's name differs, and the agent's pins (its name, version, model and effort) are
the only pins that may differ between the two executions that shape a run, and they are named: the harnesses, the
arms' digests, the caps, the approver policy and the rate are the same; when one differs, there is no value. Per-run pins (scenario hash, harness commit, scorer) must be
equal, as within a group.

- **Within an agent:** each side's own M-R1–M-R3, as above.
- **Across agents:** M-R1 over the pooled runs of both sides: a hidden test agrees when every run of both sides gives
  it the same verdict. M-R2 and M-R3 as the mean pairwise Jaccard over the **cross pairs** only, one run from each
  side, so that the across value is read against each side's within value, not mixed with it.
- **Reading:** an across value below both within values says the agents differ beyond their own variation. With
  n < 3 on a side the result is preliminary (§4.6), and no "beyond variance" claim is made. No threshold.

The three are reported separately. "Substantially equivalent" is **not** declared in v0.1: the first
campaign produces the reference values, and a threshold is proposed only after that.

### 4.6 Reporting rules

- Every number carries its **n** (repetitions).
- Results with n = 1 are labelled **preliminary** and have no variance.
- With n ≥ 3, results show the range (min–max). A difference between arms is called "beyond
  variance" only when the ranges do not overlap.
- Expected failures (F3.6) are shown as losses, with the missing capability named.
- Categories not covered are listed as such.
- **The variance rule** (1.7, bug-030; REQ-RES-03 amended in W16): a ▲ or ▼, and a headline's "better" or "worse"
  count, only for a difference beyond the variance, on every page of the site; how a preliminary difference (n < 3)
  is shown is set by that amendment.
- **Repetitions** (1.7,
  [dl-023](../memory/decision-log/dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset.md)):
  a group may reach n = 3 through a repetition campaign of the same key (scenario version, arm digest, harness pin,
  model and effort), run from a preset, and then leaves "preliminary".

### 4.7 Review loop (F4.9, 1.7)

The code each arm produced, at a step's end, goes through the same review loop in every arm: one independent
reviewer, the same severities (blocker, should-fix, nit) and the same closing rule (a re-review of the fix's diff
after a blocker or a should-fix; a nit-only round closes the review), as the benchmark's own delivery uses (dl-020).

- **M-V1 rounds to clean:** the rounds until a nit-only round or a round with no finding.
- **M-V2 fix-induced share:** of the findings after round 1, the share introduced by an earlier round's fix.
- **M-V3 review cost:** the reviewer's and the fixer's M-K1 and M-K2 over the loop; the fixer is the arm's own agent.
  Whether dl-020's quick check for a nit fix applies inside the loop is W19's task to settle.

Read per arm against the baseline and its docs control, as every metric; the reviewer is a fixed agent, model and
prompt, pinned by the campaign, reviewing the code with the harness's own files stripped, as F4.6's judge does.

---

## 5. Validity threats

| # | Threat | Kind | Mitigation |
|---|---|---|---|
| T1 | **Maintainer bias:** the benchmark is designed by WingFoil's maintainer | construct, conclusion | GQM fixed before any run; losses published equally; tool-neutral metrics (§4.4); scenarios where competitors are strong (S2, S3, S7 for OpenSpec; S6 for Spec Kit); public setups and a contest process (F7.2) |
| T2 | **Category bias:** WingFoil's unique features sit in category E | construct | E is one category among seven, with no overall score; M-E2 and M-E3 (deferred, 1.2) measure outcomes, not formats |
| T3 | **More context, not harness** | internal | a docs control per harness, generated mechanically, each harness compared with its own (1.2); operating-manual size reported |
| T4 | **Prompt leakage or asymmetry** | internal | identical prompts, a leak scan, and published operating manuals |
| T5 | **Training contamination:** public seeds and specs may be known to the model | external | the hold-out repository; fictional domains (S4); conformance suites used as oracles, not as seeds |
| T6 | **Model non-determinism** | conclusion | repetitions where affordable; n shown on every number; preliminary labels |
| T7 | **Model or agent drift over time** | conclusion | model id and agent version pinned; the baseline is rerun in every campaign; only deltas are compared across campaigns |
| T8 | **Small n from the budget** | conclusion | preliminary labels; no claim of significance in v0.1 |
| T9 | **Neutral-approver policy favours some tools** (for example, tools that ask more questions) | internal | one versioned policy for every arm; interventions reported per arm; a classifier settled on a corpus of every agent's final messages, its changed readings pinned (v2, 1.7) |
| T10 | **Harness capability gap:** the WingFoil under development (v0.2 pre-release, `3df305e`) has no workflow engine; workflows are followed by hand | construct | expected failures (F3.6), published as losses; public campaign on the latest release (sequencer decision 3); from v0.3, the wingfoil arm's step A drives the engine (dl-021, 1.7) |
| T11 | **Oracle validity:** hidden tests capture the spec only partly | construct | multiple metrics per goal; a published human rubric from v0.3 (F4.1, bug-026); the blind rubric judge from v0.4 (1.7) |
| T12 | **Setup effort unequal across tools** | internal | setup from official documentation only; scripted and published; deviations published, telemetry off for every tool (1.2); a setup can be contested, and a corrected one runs as a new campaign (F7.2); the configured variants' configuring agent, model and prompt the same for every harness, and published (1.7) |
| T13 | **Answer lookup:** with internet access, an agent may fetch public material that overlaps the oracle, for example S1's official conformance suite | internal, construct | web requests logged and reported per arm; hold-out tests added to public oracles; fictional domains (S4) where lookup cannot help. Access is the same for every arm, so it is not an arm asymmetry |
| T14 | **Model sensitivity:** a harness's effect may depend on the model | external | model slices (§6): from v0.2 a ladder of models read per step (dl-007, dl-008); cross-model numbers are shown as a separate comparison, never mixed with same-model ones; a comparison between campaigns on different models is marked cross-model (1.2) |
| T15 | **Tool drift:** competitors release every few days, so a result describes one version only (1.2) | external | every harness pinned per campaign, assessed for eligibility at that version, and its artifact published; the version shown beside every value; across campaigns only deltas against each campaign's own baseline are compared (T7) |

---

## 6. Budget model

The estimated campaign cost is the sum, over scenarios, arms and repetitions, of the setup cost plus
the cost of every step.

**v0.1 campaign shape** (sequencer decision 2, experiment-design decision 1):

- **Model:** Claude Sonnet 5 (`claude-sonnet-5`) by default.
- S1: 3 arms × 3 repetitions = 9 runs.
- S2, S3, S8: 3 arms × 1 repetition = 9 runs.
- **Model-comparison slice:** S1 × 3 arms × 1 repetition with Claude Opus 5 (`claude-opus-5`) = 3
  runs, compared with the matching Sonnet 5 runs. If the dry-run estimate does not fit the budget,
  the slice shrinks to the wingfoil arm only. At least one comparable run is always kept.
- Total: **21 runs** (18 with Sonnet 5, 3 with Opus 5).

With a 30 € target, the Sonnet 5 runs must average **about 1.2 € or less**, leaving room for the
more expensive Opus 5 slice, dry runs excluded. That is the sizing constraint for the scenarios in
the specification phase. The per-scenario dry runs (F3.3) replace this estimate with measured values
before any campaign starts.

**v0.1 as measured** (amended in 1.2, from calibration v0.1, campaign-001 and dl-012):

- a Sonnet 5 run cost about **1.8 €** on average (S1 up to 4.4 €);
- Opus 5 cost **6.8×** Sonnet, not its 2.5× list-price ratio;
- the 18 Sonnet runs came to 39 €, and the published execution to 61.38 € against a 60.32 € estimate.

The 30 € target above did not hold, and stays as the record of v0.1's plan.

**From v0.2** (dl-012):

- **The estimate** reads every completed dry run of a key and shows the range. From a single dry run it adds a stated
  margin of 35 %, the run-to-run spread v0.1 measured. The highest figure is the one compared with the budget.
- **No model is priced from another** by list price: each model of a campaign needs its own dry runs.
- **The ceiling covers the campaign** across all its executions, so a re-run counts against it.
- **A comparison is non-preliminary only from n ≥ 3** on both sides. Which scenarios are repeated is set at
  calibration.
- **v0.2's shape** (dl-007, the approver's triage of 2026-10-05; amended in 1.3 by dl-017):
  - the v0.1 scenarios in seven arms;
  - Sonnet 5.5 by default if its calibration fits, Sonnet 5 otherwise;
  - **the reference campaign pins WingFoil v0.3**, once released and admitted to the eligibility register
    (REQ-FMT-11), with the wingfoil arm's manual reviewed against v0.3's guide for AI agents. If v0.3 is not released
    by **2026-10-31**, the reference campaign pins WingFoil v0.2.2 and the bridge is not run, since the reference
    campaign then holds the same three arms on v0.2.2;
  - **the bridge**, a campaign of its own, re-runs v0.1's whole configuration: S1, S2, S3 and S8 in baseline,
    baseline-docs and wingfoil, on **WingFoil v0.2.2** (`12537b62`) with task-086's manual (written against v0.2.2's
    guide), on the reference campaign's model, Claude Code version, effort and scenario versions. It runs from **the
    same benchmark commit** as the reference campaign, one after the other, and the commit is recorded in both campaign
    elements, since the comparison does not list it. Its wingfoil arm is v0.2.2's as task-086 left it: the bridge's
    file pins that arm's digest, and the runner reads the arm from the newest commit of the history that holds it once
    the working tree has moved on to v0.3.0's (1.5, REQ-FMT-13). It is not cut at calibration to fit the budget;
  - **repetitions:** v0.1's, S1 × 3 and S2, S3 and S8 × 1, in both campaigns, until WingFoil 1.0 or the benchmark's
    1.0, whichever comes first. No group is raised to three to leave "preliminary": the rule n ≥ 3 above stands;
  - a Haiku 5.5 rung of the model ladder (Haiku 4.5 until 1.6, dl-018);
  - **the effort:** `medium` for Sonnet 5.5, Opus 5.5 and Haiku 5.5 (dl-015, dl-018; 1.6).

  A first sizing, Sonnet only and v0.1's repetitions, is about 42 runs and 75–85 €. With v0.3, the bridge adds 18 runs,
  about 35–40 € at v0.1's measured cost. Calibration replaced both figures (1.6): the reference campaign's estimate is
  32.5 €, the bridge's 8.7 €, the budget 50 € and 15 €, 65 € in all ([v0.2.md](../calibration/v0.2.md)).

  **With v0.3, the comparisons published with v0.2** form a chain of two steps, each changing one group of causes:
  `c82a5e74885b/2` → bridge (the model, Claude Code, the effort, the manual and the scoring code, WingFoil held at
  v0.2.2), then bridge → reference campaign (WingFoil v0.2.2 → v0.3 alone). The comparison of v0.2 with v0.1 (F5.2) is
  read through the bridge. Without v0.3, it compares `c82a5e74885b/2` with the reference campaign directly.

---

## Decisions from the experiment-design review

1. **Model:** Claude Sonnet 5 by default, plus a model-comparison slice with Claude Opus 5 of at least
   one comparable run (§6, T14).
2. **Neutral-approver policy v1:** accepted as written in §3 step 5.
3. **Approval reconstructibility (M-E3):** from v0.2, through a scripted tool that checks identity
   and the presence of a reason (§4.4). *Deferred in 1.2: no scenario exercises it yet.*
4. **Network:** agents keep internet access, for a faster setup. The risk of looking answers up is
   tracked as T13.
5. **Sequencer W19 row** (W24 from sequencer 1.2): left as it is.
6. **Amendment 1.1 (specification phase, 2026-09-22) — T10 corrected.** Earlier text described the pinned build as "WingFoil 0.1.0" lacking the Memory transition
   verbs and MCP writes. That was wrong: the build (`7a65580`) already had them, because WingFoil's
   `package.json` version had not been bumped. The WingFoil under development is now the **v0.2
   pre-release, pinned to commit `3df305e`**. Its only relevant gap is the missing **workflow engine**.
   Source: scenario-specs review (2026-09-22), [../02_specification/scenarios/README.md](../02_specification/scenarios/README.md) K5.
7. **Amendment 1.2 (v0.2 release-planning, 2026-10-05).** Approved: the approver's review decision in chat, 2026-10-05 ("ok prosegui"), after three independent reviews.
   - **§1:** the comparison is with the baseline and, for each harness, with its own docs control. Q-E2 and Q-E3 are
     deferred.
   - **§2:**
     - the competitor arms are named, with a docs control per harness arm (the approver's choice at rel-v0-2's
       triage) and project rules rendered for every arm;
     - five eligibility criteria, WingFoil assessed too;
     - setup and telemetry as parity rules;
     - the runner starts the agent in every arm, and a competitor arm has no approver member.
   - **§4.4:** M-E2 and M-E3 are deferred, with no scenario scheduled.
   - **§5:** T2, T3, T12 and T14 are updated; **T15 tool drift** is added.
   - **§6:** v0.1's measured costs, dl-012's rules, and v0.2's shape from dl-007.

   Sources: rel-v0-2's triage and the approver's decisions on the specification review (2026-10-05); dl-007,
   dl-008, dl-012; [X_competitor-landscape-2026-10-05.md](X_competitor-landscape-2026-10-05.md).
8. **Amendment 1.3 (v0.2 calibration, 2026-10-14).** Approved: dl-017, option D (`5d7f35b`), the approver's choices in
   chat of 2026-10-13 and 2026-10-14 ("ok per la proposta sulle campagne"; "x1 fino a wf1.0 o wfb1.0"). Written by
   task-090.
   - **§6, v0.2's shape:** the reference campaign pins WingFoil v0.3, with v0.2.2 as the fallback if v0.3 is not
     released by 2026-10-31; the bridge re-runs v0.1's whole configuration on WingFoil v0.2.2, on the reference
     campaign's model, Claude Code, effort and scenario versions, from the same benchmark commit; v0.1's repetitions
     until WingFoil 1.0 or the benchmark's 1.0; the chain of comparisons `c82a5e74885b/2` → bridge → reference campaign.

   Source: [dl-017](../memory/decision-log/dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md).
9. **Amendment 1.4 (v0.2, plan-004 step 3-bis, 2026-10-15).** The Codex spike, outside the v0.2 campaign, approved by
   the approver in chat on 2026-10-15 and at task-094's pending → backlog gate (`de6922f`).
   - **§4.5:** how M-R1–M-R3 apply across agents: the groups (the same scenario version and arm, the agent's pins the
     only ones that differ), each side's own values, M-R1 over the pooled runs, M-R2 and M-R3 over the cross pairs.
     Before 1.4, §4.5 said the metrics "also apply across agents" without saying how, and REQ-SCO-07 computed them only
     over runs sharing every pin.

   Source: [task-094](../memory/task/task-094-a-codex-agent-adapter-and-s3-s-baseline-compared-across-agents-spike.md);
   [dl-019](../memory/decision-log/dl-019-the-codex-spike-s-subscription-credential-mounted-read-write-from-a-dedicated-directory-outside-the-repository.md).
10. **Amendment 1.5 (v0.2, the admission of WingFoil v0.3.0, 2026-10-20).** The approver's choices in chat on
    2026-10-20, at task-095's design.
    - **§2, the wingfoil arm:** from v0.3.0, WingFoil as its documentation sets it up, the `init` scaffold with no
      workflow written for the benchmark (the parity rule every competitor arm follows). WingFoil's answer of
      2026-10-18: the scaffold's workflows declare no role, action or product. WingFoil's guide has an agent start a
      workflow only when asked, and no step's request asks, so the arm uses WingFoil's Memory and directives on that
      scaffold, and its workflow engine stays unstarted; that is what is measured.
    - **§6, the bridge:** its wingfoil arm is read by its pinned digest from the history, so that the bridge and the
      reference campaign run from one benchmark commit with two versions of the arm. Its baseline-docs arm keeps its
      digest, but its rules are generated from the configuration the bridge's WingFoil writes: where 0.3.0's `init`
      ships other directive text (`doc-versioning`), the step bridge → reference changes the docs control's rules too.

    Source: [task-095](../memory/task/task-095-wingfoil-v0-3-0-admitted-to-the-wingfoil-arm-the-bridge-s-arm-read-by-its-pinned-digest.md).
11. **Amendment 1.6 (v0.2, calibration, 2026-10-21).** The consequences of
    [dl-018](../memory/decision-log/dl-018-sonnet-5-5-s-cache-reads-at-half-dl-007-s-price-and-haiku-5-5-beside-the-haiku-4-5-rung.md)
    and calibration's measurements, the approver's approval in chat of the values on 2026-10-21.
    - **§6, the ladder:** its weak rung is Haiku 5.5 (`claude-haiku-5-5`), S1 and S3 in baseline and wingfoil; Haiku
      4.5 until 1.6. The hypothesis on the weak model (dl-007's "H6", H11 in [v0.2.md](../calibration/v0.2.md) §9) reads Haiku
      5.5.
    - **§6, the effort:** `medium` for the three models, the same in every arm; v0.1 pinned none. So the comparison
      with v0.1, through the bridge, changes the effort with the model and Claude Code (dl-015's C).
    - **§6, the sizing:** replaced by calibration's estimate and budget.

    Source:
    [task-096](../memory/task/task-096-calibration-of-v0-2-dry-runs-in-every-arm-and-the-bridge-measured-costs-and-the-revised-budget.md);
    [v0.2.md](../calibration/v0.2.md).
12. **Amendment 1.7 (v0.3, release-planning, 2026-10-27).** v0.3 as planned in
    [plan-005](../plans/plan-005-release-v0-3.md), with the decisions taken since:
    - **§2:** the configured variants (F7.5) and their parity rules; the wingfoil arm's step A (dl-021); the docs
      controls' sizes published.
    - **§3:** approver policy v2 (dl-026), after v1 missed six of Codex's seven approval requests in campaign-005
      (bug-035).
    - **§4.2 and §4.6:** M-K3's one-off costs, M-K4's "not applicable" and ▲/▼ only beyond the variance; dl-023's
      repetition campaigns.
    - **§4.7:** the review loop as a measurement (F4.9).
    - **§1:** G-A and G-B move to v0.4 with their scenarios.
    - **§5:** T9's, T10's, T11's and T12's mitigations.

    Source: [task-103](../memory/task/task-103-the-v0-3-vision-and-experiment-design-amendments.md); the approver's
    review decision at the task's review.
13. **Amendment 1.8 (v0.3, W17, 2026-10-29).** dl-029, brought ahead: S10, the gates-and-roles scenario.
    - **§1:** G-E's Q-E2 and Q-E3 get a scenario, S10, and two metrics, M-E3a and M-E4.
    - **§4.4:** M-E3a and M-E4 defined; M-E2 and M-E3 as S10 reads them. M-E2 and M-E3 are no longer deferred once
      S10 is calibrated and run (the W17 Claude Code campaign, preliminary).
    - **§3:** S10's verdicts are scripted (approver policy v3, task-117) and carried out under a separate approver
      identity (task-118); both are amended into §3 by those tasks.

    Source: [task-116](../memory/task/task-116-s10-gates-and-roles-scenario-dl-029.md);
    [dl-029](../memory/decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md).
14. **Amendment 1.9 (v0.3, W17, 2026-10-29).** §3: approver policy v3, the scripted verdicts S10 needs (dl-029 point
    7), beside a frozen v1 and v2. Source:
    [task-117](../memory/task/task-117-approver-policy-v3-scripted-verdicts-per-gate-on-classifier-v2-dl-029.md).
15. **Amendment 1.10 (v0.3, W17, 2026-10-30).** §3: a separate approver for a scenario that declares one (S10,
    dl-029 option (b1)), the second of the method's two changes. Source:
    [task-118](../memory/task/task-118-a-separate-approver-identity-the-agent-never-the-approver-verdicts-executed-by-the-runner-dl-029.md).
