# Features — WingFoil Benchmark

**Version:** 1.1
**Date:** 2026-09-22
**Status:** Approved
**Traces to:** [05_journeys.md](05_journeys.md), [03_is-isnot.md](03_is-isnot.md); input: [X_competitor-landscape-2026-09-22.md](X_competitor-landscape-2026-09-22.md)

---

Feature IDs are `F<area>.<n>`. Each feature traces to the journey step that asks for it.

The review columns follow Lean Inception's technical and business review:

- **Value:** business value, High / Medium / Low.
- **Effort:** technical effort, High / Medium / Low.
- **Unc.:** uncertainty (how well the solution is understood), High / Medium / Low.

An uncertainty of **H** marks a feature whose solution is not yet known and needs a spike or a
decision in the experiment design.

---

## F1 — Campaign

| ID | Feature | Journey | Value | Effort | Unc. |
|---|---|---|---|---|---|
| F1.1 | **Campaign file**: one file pins the exact version of **every harness** (WingFoil and each competitor), scenarios with their versions, arms, agent, model id, repetitions and seed. The file identifies the campaign. Competitors release weekly or faster, so an unpinned harness makes a campaign unreproducible. | J2.1, J6.2 | H | L | L |
| F1.2 | **Cost estimate**: predicts the cost of a campaign before it runs, from the dry-run costs of its scenarios. | J2.2 | H | M | M |
| F1.3 | **Budget guard**: warns above 30 €, refuses to start above 100 €, and stops any run that exceeds its own cap. | J2.2, J2.4 | H | L | L |
| F1.4 | **Resumable campaign**: continues after a failed run, and a campaign can be resumed without repeating completed runs. | J2.4 | M | M | L |

## F2 — Runner

| ID | Feature | Journey | Value | Effort | Unc. |
|---|---|---|---|---|---|
| F2.1 | **Isolated run**: each scenario × arm × repetition runs in its own Docker container, which receives only the scenario seed. | J2.3 | H | M | L |
| F2.2 | **Fresh-session steps**: each step starts a new agent session. Only the repository carries state from one step to the next. | vision | H | M | L |
| F2.3 | **Claude Code adapter**: runs Claude Code headless and captures tokens, cost, turns, time and the transcript. | J2.3, J2.7 | H | M | M |
| F2.4 | **Neutral approver**: answers approval gates and agent questions with a fixed policy that is the same for every arm, and counts each intervention. | J2.4 | H | M | **H** |
| F2.5 | **Arm setups**: scripted setup for the baseline, baseline-docs and wingfoil arms, and later for each competitor arm. Setup cost is measured apart from step cost. Every setup choice that deviates from a tool's defaults (for example disabling OpenSpec's telemetry) is part of the published setup. | J6.1 | H | M | M |
| F2.7 | **Arm activation**: each arm ships a fixed, published operating manual in its environment (its `CLAUDE.md` / `AGENTS.md`) that maps a step's intent to the harness's commands (WingFoil's CLI + MCP, a competitor's slash commands). Its cost counts as setup. Step prompts stay identical and harness-neutral. | J3.3, J6.1 | H | M | M |
| F2.6 | **WingFoil under test**: installs the WingFoil version pinned by the campaign inside the container, independently of the WingFoil that manages this repository. | J2.1, J4.4 | H | L | L |

## F3 — Scenarios

| ID | Feature | Journey | Value | Effort | Unc. |
|---|---|---|---|---|---|
| F3.1 | **Scenario format**: seed, step prompts, oracle reference, category tags (primary and secondary), result profiles, GQM question, version. | J3.2–J3.5 | H | L | L |
| F3.2 | **Validator and leak scan**: checks the format, and checks that no oracle content appears in the seed or in the prompts, and that no prompt mentions a harness. | J3.6 | H | M | M |
| F3.3 | **Dry run**: runs a single arm once, to measure real cost and calibrate difficulty. It feeds F1.2. | J3.7 | H | L | L |
| F3.4 | **Scenario versioning**: any change creates a new version; results always record the version they ran. | J3.8 | M | L | L |
| F3.6 | **Capability requirements and expected failures**: a scenario declares which harness capabilities it exercises. When the harness version under test lacks one (for example the WingFoil v0.2 pre-release has no workflow engine), the result is marked **expected failure** and published as a loss, never skipped. | vision (losses published equally) | H | L | M |
| F3.5 | **Hold-out integration**: oracles and private scenarios are read from a configured path, used only for scoring, and never mounted into a container. | J2.5, J3.4 | H | L | L |

## F4 — Scoring

| ID | Feature | Journey | Value | Effort | Unc. |
|---|---|---|---|---|---|
| F4.1 | **Hidden-test oracle**: runs the scenario's hidden tests against the final state (and, where relevant, the state after each step). | J2.5 | H | M | L |
| F4.2 | **Static quality metrics**: lint findings, cyclomatic complexity, duplication and coverage. | J2.5 | M | M | L |
| F4.3 | **Cost metrics**: tokens, money, wall time, turns and interventions, per step and per run. | J2.5 | H | L | L |
| F4.4 | **Setup / step split and break-even**: separates setup cost from step cost and computes the per-scenario break-even. | J5.3 | M | L | M |
| F4.5 | **Determinism metric**: agreement between repeated runs of the same arm, and across agents when more than one is available (for example agreement on hidden tests, and structural similarity of the result). No harness in the input landscape measures this, so it is an original metric, and it needs an operational definition. | J2.6 | H | M | **H** |
| F4.6 | **Blind rubric judge** (not in the first release; arrives with S5): an LLM judge scores spec adherence against a rubric, with harness files stripped so that it cannot tell the arms apart. | J2.5 | M | M | **H** |
| F4.8 | **Tool-neutral governance metrics**: governance is measured by outcomes that any harness can achieve, for example "is an illegal state transition prevented?" or "can who approved what, and why, be reconstructed from the repository?", and never by the presence of one tool's file or commit format. | J5.2, J6.1 | H | M | M |
| F4.7 | **Maintainability as next-change cost**: the cost and success of the later steps of a scenario, attributed to the code produced by the earlier ones. | vision | H | L | M |

## F5 — Results and reporting

| ID | Feature | Journey | Value | Effort | Unc. |
|---|---|---|---|---|---|
| F5.1 | **Results store**: per campaign and per run; every aggregate links to the runs behind it. | J2.7 | H | M | L |
| F5.2 | **Campaign comparison**: deltas against a previous campaign, per category, arm and metric, with variance when there are repetitions. | J2.6 | H | M | L |
| F5.3 | **Run detail**: transcript, diff, test results and token usage of one run, with the WingFoil and baseline runs side by side. | J2.7, J4.2 | M | M | L |
| F5.4 | **Finding note**: exports a finding (campaign, scenario, runs, evidence) in a form that can be copied into a WingFoil bug or decision-log. | J4.3 | M | L | L |
| F5.5 | **Results site, landing page**: honest headline, one chart, one row per category, "preliminary" badge and run count, public or hold-out marker. | J1, J6.2 | H | M | M |
| F5.6 | **Manual publish**: builds the site from stored results and publishes it to GitHub Pages only when explicitly requested. | J2.8 | H | L | L |
| F5.7 | **Profile filter and stable URLs**: filters by result profile; each campaign and view has a permanent link. | J5.1, J5.5 | M | M | L |
| F5.8 | **Method page**: arms, controls, validity threats, pins and budget, written for a non-technical reader. | J5.4 | M | L | L |

## F6 — Scenario content

These features are the benchmark's content. Each one is a scenario to design in the specification
phase. The IDs below are the candidates from the brief.

| ID | Scenario | Primary category | Value | Effort | Unc. |
|---|---|---|---|---|---|
| F6.1 | S1 — Implement a third-party spec with an official conformance suite | C Development | H | M | L |
| F6.2 | S2 — Injected-bug hunt, with a false bug and a duplicate among the reports | D Maintenance & Quality | H | M | L |
| F6.3 | S3 — Multi-session evolution, with a change request that contradicts an earlier decision | F Knowledge & Continuity | H | M | M |
| F6.4 | S4 — Fictional domain with consistent invented rules | F Knowledge & Continuity | H | M | M |
| F6.5 | S5 — Spec authoring from an ambiguous stakeholder interview | A Inception & Specification | M | M | **H** |
| F6.6 | S6 — Plan, then execute the plan in another session | B Planning & Management | M | H | **H** |
| F6.7 | S7 — Legacy refactoring under characterization tests | D Maintenance & Quality | M | M | L |
| F6.8 | S8 — Directive compliance across steps | E Governance & Compliance | M | L | M |
| F6.9 | S9 — Parallel agents on overlapping tasks | G Collaboration | L | H | **H** |
| F6.10 | M1 — Macro: mobile calculator app | C Development | M | H | M |
| F6.11 | M2 — Macro: bookmarks dashboard (web app, backend, database) | C Development | M | H | M |
| F6.12 | M3 — Macro: situation awareness with synthetic, seeded data ingestion | F Knowledge & Continuity | M | H | **H** |

## F7 — Competitors and contributions

| ID | Feature | Journey | Value | Effort | Unc. |
|---|---|---|---|---|---|
| F7.1 | **Competitor arm**: scripted setup of a competing tool from its official documentation, run under the same rules. Candidates from the input landscape: GitHub Spec Kit and OpenSpec, both MIT and both with a Claude Code integration; BMAD Method as a third option. | J6.1 | M | M | M |
| F7.4 | **Harness eligibility criteria**: published criteria a tool must meet to get an arm, for example: runs with the campaign's agent and model id; version can be pinned; runs headless in a container; is a workflow harness rather than only a standards or prompt pack. Exclusions are published with their reason (from the input landscape, probable ones are Kiro, which imposes its own models and IDE, Taskmaster, which calls its own LLMs, and Agent OS, no longer a workflow harness). | J6.1 | M | L | M |
| F7.2 | **Setup contest process**: an issue template for contesting a setup; a corrected setup yields a new campaign and the old one stays published. | J6.3 | L | L | L |
| F7.3 | **External contribution guide**: guide and review step for outside scenario authors (deferred). | J7 | L | L | L |

---

## Review notes

- **High-uncertainty features:**
  - **F2.4 (neutral approver):** how to detect that a headless agent is waiting for an answer, and
    what a fixed policy says.
  - **F4.5 (determinism metric):** what "substantially equivalent" means in numbers.
  - **F4.6 (blind judge):** its cost against the budget, and its bias.

  All three must be settled in the experiment design before the specification phase.
- **Budget pressure:** F4.6 spends tokens on every run it scores. With a 20–30 € budget it competes
  directly with repetitions.
- **Category bias (threat from the input landscape):** WingFoil's unique points sit mostly in
  category E. A benchmark written by WingFoil's maintainer risks measuring exactly what only
  WingFoil does. Counter-measures in this draft: F4.8 (tool-neutral governance metrics), and
  scenarios where competitors are expected to be strong:
  - brownfield changes, OpenSpec's strength: F6.2 S2, F6.3 S3, F6.7 S7;
  - workflow orchestration, Spec Kit's strength: F6.6 S6.

  To be treated as a validity threat in the experiment design.
- **WingFoil capability gap:** the WingFoil under development (v0.2 pre-release) has no workflow
  engine. F3.6 makes this visible instead of hiding it. (Corrected in 1.1.)
- **Coverage of the first release:** F6.1–F6.3 and F6.8 (S1–S3, S8), which have objective oracles
  (F4.1). Their primary categories are C, D, E and F. A, B and G are missing from the first results,
  and, in line with "losses published equally", the site should say so.

## Decisions from the features review

1. **Blind judge (F4.6):** not in the first release. S1–S3 and S8 have objective oracles, so the
   budget goes to repetitions. The judge arrives with S5, which needs it.
2. **First competitors (F7.1):** both Spec Kit and OpenSpec. They are added **after** a first
   WingFoil-only result. Timing is fixed in the sequencer.
3. **Category coverage of the first release:** S8 (directive compliance) is added to S1–S3, so the
   first public result covers C, D, E and F.
4. **Arm activation (F2.7):** option (a), a fixed, published operating manual per arm, counted as
   setup cost. It is recorded as amendment 1.1 of [03_is-isnot.md](03_is-isnot.md) and
   [05_journeys.md](05_journeys.md).
5. **Journey amendments:** accepted. J2 step 1, J3 step 3 and J6 step 1 are amended in journeys 1.1.
6. **Amendment 1.1 (specification phase, 2026-09-22) — F3.6 example and review note corrected.**
   Earlier text described the pinned build as "WingFoil 0.1.0" lacking the Memory transition
   verbs and MCP writes. That was wrong: the build (`7a65580`) already had them, because WingFoil's
   `package.json` version had not been bumped. The WingFoil under development is now the **v0.2
   pre-release, pinned to commit `3df305e`**. Its only relevant gap is the missing **workflow engine**.
   Source: scenario-specs review (2026-09-22), [../02_specification/scenarios/README.md](../02_specification/scenarios/README.md) K5.
