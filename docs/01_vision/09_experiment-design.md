# Experiment Design (GQM) — WingFoil Benchmark

**Version:** 1.2 (draft for review: v0.2's release-planning)
**Date:** 2026-10-05
**Status:** Approved (1.1); 1.2 in review
**Traces to:** [06_features.md](06_features.md) (F2.4, F2.7, F4.x, F7.4), [07_sequencer.md](07_sequencer.md) (decisions 1–3), [03_is-isnot.md](03_is-isnot.md) 1.1; input: [X_competitor-landscape-2026-09-22.md](X_competitor-landscape-2026-09-22.md)

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
- **Comparison:** against the baseline and baseline-docs arms, with the agent and model fixed.

| Goal | Purpose | Questions | Metrics (§4) | Scenarios | Release |
|---|---|---|---|---|---|
| **G-C Development** | Does the harness improve how well an agent implements a specification? | Q-C1 Does the result conform to the spec? · Q-C2 At what cost? | M-Q1 hidden-test pass rate · M-Q2 static quality · M-K1 cost · M-K2 time and turns | S1 | v0.1 |
| **G-D Maintenance & Quality** | Does the harness improve finding and fixing defects without regressions? | Q-D1 How many real defects are fixed? · Q-D2 Are non-defects rejected? · Q-D3 How many regressions? | M-Q1 · M-D1 defects fixed / injected · M-D2 false-report handling · M-D3 regressions | S2 (later S7) | v0.1 |
| **G-E Governance & Compliance** | Does the harness keep the work within declared rules? | Q-E1 Are directives respected across steps? · Q-E2 Is an illegal state transition prevented? · Q-E3 Can who approved what, and why, be reconstructed from the repository? | M-E1 directive violations · M-E2 illegal transitions prevented · M-E3 approval reconstructibility | S8 | Q-E1 in v0.1; Q-E2 and Q-E3 from v0.2 (§4.4) |
| **G-F Knowledge & Continuity** | Does the harness carry decisions and domain knowledge across fresh sessions? | Q-F1 Are earlier decisions respected, or explicitly revised? · Q-F2 What does the next change cost? | M-F1 decision consistency · M-F2 next-change cost | S3 (later S4) | v0.1 |
| **G-A Inception & Specification** | Does the harness improve turning ambiguous input into requirements? | Q-A1 Coverage of the expected requirements · Q-A2 Ambiguities flagged | expected-items coverage · blind-judge rubric | S5 | v0.3 |
| **G-B Planning & Management** | Does the harness produce plans that another session can execute? | Q-B1 Is the plan executable by a fresh session? | downstream pass rate and cost | S6 | v0.3 |
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
| **wingfoil** | as baseline, plus WingFoil at the campaign's version, initialized and configured, with its MCP server, and the arm's operating manual | the subject |
| **competitor arms** (v0.2: **speckit**, **openspec**) | as baseline, plus the tool at a pinned version, set up from its official documentation, and the arm's operating manual | fair comparison |
| **docs controls** (v0.2: **speckit-docs**, **openspec-docs**) | as baseline, plus the **same information** as their harness arm, rendered as free-form Markdown; the v0.1 `baseline-docs` stays the wingfoil arm's | a control per harness: "more context" versus "this harness" (1.2) |

**Parity rules:**

- **Every docs control is generated mechanically** from its harness arm's configuration, as the agent would meet
  it, with no hand-editing: `baseline-docs` from the wingfoil arm's (DNA, directives, workflow descriptions);
  `speckit-docs` and `openspec-docs` from their arms' (amended in 1.2). Parity of information is then a property
  of each generator, not of good intentions, and what each generator renders, and why, is published.
- **Eligibility** (F7.4, 1.2): a tool gets an arm only when it meets the published criteria. It must run with the
  campaign's agent and model id; its version must be pinnable; it must run headless in a container; and it must be
  a workflow harness, not only a standards or prompt pack. A tool that fails is listed as excluded, with its reason.
- **Setup from official documentation** (T12): each harness is installed and initialized as its documentation says,
  scripted and published. Every deviation from a tool's defaults is published with the setup. One deviation applies
  to every tool: **telemetry is turned off**.
- **The runner starts the agent in every arm** (1.2). A harness whose own engine can start the agent, such as Spec
  Kit's `specify workflow run`, is followed through the commands or skills it gives the agent. The engine-led mode is
  taken up for every engine-led harness at once, once WingFoil also has its workflow engine.
- **Operating manuals** (is/is-not 1.1): one fixed, published file per arm. It maps a step's intent
  to the harness's commands. Its cost counts as setup. Its size in tokens is **reported for every
  arm**, because a longer manual is also more context, and that is a confound.
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
  tokens.
- **M-K4 break-even**, per scenario:

  n* = setup cost of the arm ÷ (mean step cost of the baseline − mean step cost of the arm)

  It is defined only when the arm's quality is not worse than the baseline's on M-Q1. Otherwise it
  is reported as "not applicable". When the arm's step cost is not lower, it is reported as "never".

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
- **M-E2 illegal transitions prevented** (from v0.3: no v0.2 scenario asks for a forbidden transition; amended in
  1.2): the scenario asks for a transition its declared
  process forbids. The metric is whether the final repository shows it happened. It depends only on
  the outcome, not on how the tool stores state.
- **M-E3 approval reconstructibility** (from v0.3, with the scenario that has approval events; amended in 1.2): for each approval event in the scenario, can the
  approver and the reason be found from the repository alone? It is checked by a **scripted,
  format-neutral tool** (experiment-design decision 3): an approval event is reconstructible when
  the approver's identity and a non-empty reason appear in any git-tracked file, or in any commit,
  changed at that step. The time comes from git. The tool looks for content, never for one harness's
  file or commit format.

### 4.5 Determinism (operational)

These metrics apply to the repetitions of the same arm, scenario and pins: 3 repetitions on S1 in
v0.1. From v0.2 they also apply across agents, once a second agent exists.

- **M-R1 outcome agreement:** the share of hidden tests that get the same verdict in every
  repetition.
- **M-R2 interface similarity:** the mean pairwise Jaccard similarity of the public interface
  (exported symbols and signatures, extracted by a scripted parser).
- **M-R3 structure similarity:** the mean pairwise Jaccard similarity of the set of file paths,
  excluding generated and harness files.

The three are reported separately. "Substantially equivalent" is **not** declared in v0.1: the first
campaign produces the reference values, and a threshold is proposed only after that.

### 4.6 Reporting rules

- Every number carries its **n** (repetitions).
- Results with n = 1 are labelled **preliminary** and have no variance.
- With n ≥ 3, results show the range (min–max). A difference between arms is called "beyond
  variance" only when the ranges do not overlap.
- Expected failures (F3.6) are shown as losses, with the missing capability named.
- Categories not covered are listed as such.

---

## 5. Validity threats

| # | Threat | Kind | Mitigation |
|---|---|---|---|
| T1 | **Maintainer bias:** the benchmark is designed by WingFoil's maintainer | construct, conclusion | GQM fixed before any run; losses published equally; tool-neutral metrics (§4.4); scenarios where competitors are strong (S2, S3, S7 for OpenSpec; S6 for Spec Kit); public setups and a contest process (F7.2) |
| T2 | **Category bias:** WingFoil's unique features sit in category E | construct | E is one category among seven, with no overall score; M-E2 and M-E3 measure outcomes, not formats |
| T3 | **More context, not harness** | internal | a docs control per harness arm, each generated mechanically (1.2); operating-manual size reported |
| T4 | **Prompt leakage or asymmetry** | internal | identical prompts, a leak scan, and published operating manuals |
| T5 | **Training contamination:** public seeds and specs may be known to the model | external | the hold-out repository; fictional domains (S4); conformance suites used as oracles, not as seeds |
| T6 | **Model non-determinism** | conclusion | repetitions where affordable; n shown on every number; preliminary labels |
| T7 | **Model or agent drift over time** | conclusion | model id and agent version pinned; the baseline is rerun in every campaign; only deltas are compared across campaigns |
| T8 | **Small n from the budget** | conclusion | preliminary labels; no claim of significance in v0.1 |
| T9 | **Neutral-approver policy favours some tools** (for example, tools that ask more questions) | internal | one versioned policy for every arm; interventions reported per arm |
| T10 | **Harness capability gap:** the WingFoil under development (v0.2 pre-release, `3df305e`) has no workflow engine; workflows are followed by hand | construct | expected failures (F3.6), published as losses; public campaign on the latest release (sequencer decision 3) |
| T11 | **Oracle validity:** hidden tests capture the spec only partly | construct | multiple metrics per goal; rubric judge from v0.3 |
| T12 | **Setup effort unequal across tools** | internal | setup from official documentation only; scripted and published; deviations published, telemetry off for every tool (1.2); a setup can be contested (F7.2) |
| T13 | **Answer lookup:** with internet access, an agent may fetch public material that overlaps the oracle, for example S1's official conformance suite | internal, construct | web requests logged and reported per arm; hold-out tests added to public oracles; fictional domains (S4) where lookup cannot help. Access is the same for every arm, so it is not an arm asymmetry |
| T14 | **Model sensitivity:** a harness's effect may depend on the model | external | model slices (§6): in v0.2 a ladder of models read per step (dl-007, dl-008); cross-model numbers are shown as a separate comparison, never mixed with same-model ones |
| T15 | **Tool drift:** competitors release every few days, so a result describes one version only (1.2) | external | every harness pinned per campaign and frozen as an artifact; the version is named beside every number; only deltas against each campaign's own baseline are compared across campaigns (T7) |

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

**v0.1 as measured** (calibration v0.1, campaign-001; amended in 1.2 from dl-012): a Sonnet 5 run cost about
**1.8 €** on average (S1 up to 4.4 €); Opus 5 cost **6.8×** Sonnet, not its 2.5× list-price ratio; the 18 Sonnet runs
came to 39 € and the published execution to 61.38 € against a 60.32 € estimate. The 30 € target below did not hold
and is kept as the record of v0.1's plan.

**From v0.2** (dl-012):

- **The estimate** reads every completed dry run of a key and shows the range; from a single dry run it applies a
  stated margin of 35 %, the run-to-run spread v0.1 measured.
- **No model is priced from another** by list price: each model of a campaign needs its own dry runs.
- **The ceiling covers the campaign** across all its executions, so a re-run counts against it.
- **A comparison is non-preliminary from n ≥ 3** on both sides; the scenarios repeated are chosen at calibration.
- **v0.2's shape** (dl-007, the approver's triage of 2026-10-05): the v0.1 scenarios in seven arms; Sonnet 5.5 by
  default if its calibration fits, with a bridge slice re-running v0.1's configuration and a Haiku 4.5 rung of the
  model ladder. A first sizing, Sonnet only and v0.1's repetitions: about 42 runs, 75–85 €. Calibration replaces it.

With a 30 € target, the Sonnet 5 runs must average **about 1.2 € or less**, leaving room for the
more expensive Opus 5 slice, dry runs excluded. That is the sizing constraint for the scenarios in
the specification phase. The per-scenario dry runs (F3.3) replace this estimate with measured values
before any campaign starts.

---

## Decisions from the experiment-design review

1. **Model:** Claude Sonnet 5 by default, plus a model-comparison slice with Claude Opus 5 of at least
   one comparable run (§6, T14).
2. **Neutral-approver policy v1:** accepted as written in §3 step 5.
3. **Approval reconstructibility (M-E3):** from v0.2, through a scripted tool that checks identity
   and the presence of a reason (§4.4).
4. **Network:** agents keep internet access, for a faster setup. The risk of looking answers up is
   tracked as T13.
5. **Sequencer W19 row:** left as it is.
6. **Amendment 1.1 (specification phase, 2026-09-22) — T10 corrected.** Earlier text described the pinned build as "WingFoil 0.1.0" lacking the Memory transition
   verbs and MCP writes. That was wrong: the build (`7a65580`) already had them, because WingFoil's
   `package.json` version had not been bumped. The WingFoil under development is now the **v0.2
   pre-release, pinned to commit `3df305e`**. Its only relevant gap is the missing **workflow engine**.
   Source: scenario-specs review (2026-09-22), [../02_specification/scenarios/README.md](../02_specification/scenarios/README.md) K5.
7. **Amendment 1.2 (v0.2 release-planning, 2026-10-05, in review).**
   - §2: the competitor arms named; a docs control per harness arm (the approver's choice at rel-v0-2's triage);
     eligibility, setup and telemetry as parity rules; the runner starts the agent in every arm (Spec Kit through
     its skills; the engine-led mode taken up with WingFoil's engine).
   - §4.4: M-E2 and M-E3 move to v0.3, where a scenario exercises them.
   - §5: T3, T12, T14 updated; **T15 tool drift** added.
   - §6: v0.1's measured costs and dl-012's rules; v0.2's shape from dl-007.

   Sources: rel-v0-2 triage (2026-10-05); dl-007, dl-008, dl-012;
   [X_competitor-landscape-2026-10-05.md](X_competitor-landscape-2026-10-05.md).

