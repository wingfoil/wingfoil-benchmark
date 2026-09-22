# Scenario specifications — common conventions (v0.1)

**Version:** 0.1
**Date:** 2026-09-22
**Status:** Draft
**Traces to:** [09_experiment-design.md](../../01_vision/09_experiment-design.md), [06_features.md](../../01_vision/06_features.md) F3.1, F3.6, F6.1–F6.3, F6.8; plan [plan-002](../../plans/plan-002-benchmark-specification.md)

---

These conventions apply to every v0.1 scenario (S1, S2, S3, S8). Each scenario spec states only
what differs from them.

## 1. Decisions from the scenario-specs kickoff (2026-09-22)

| # | Topic | Decision |
|---|---|---|
| K1 | Stack of the seeds | **TypeScript / Node.js 22** for all v0.1 scenarios, so that oracles share the runner's tooling. A Python scenario arrives in v0.3. |
| K2 | Visibility | All four scenarios are **public**, so that they can be rerun without the hold-out. Each one also has **hold-out additions** (extra tests, variants), kept in the private repository (T13). Fully hold-out scenarios start in v0.3. |
| K3 | Project rules | A scenario's rules (directives, decisions to follow) live **only in the arm's environment**: none in baseline, Markdown in baseline-docs, WingFoil directives and Memory in wingfoil. The seed carries no `CONTRIBUTING.md` with rules. |
| K4 | Cost sizing | The per-run target of the experiment design (§6, about 1.2 € on Sonnet 5) is **indicative, with a loose gate**, until dry runs (F3.3) provide real data. The budget is then revised. Step counts below are sized with that target in mind. |
| K5 | WingFoil under test | Scenarios and the runner are developed against the **WingFoil 0.2 pre-release** in the WingFoil repository, pinned to a commit when the arm is built (today `3df305e`). Compared with the v0.1 release it adds `memory submit/approve/reject/deprecate/history`, `directive create/assign/remove`, mutating MCP Tools and MCP Prompts that load role directives. It still has **no workflow engine**. Note: WingFoil's `package.json` still says `0.1.0`, so the version string does not identify the build. The commit does. The first public campaign still runs on the latest *released* WingFoil (sequencer decision 3). |

## 2. What a scenario spec contains

1. **Card:** ID, categories, GQM questions, metrics, result profiles, repetitions and models,
   visibility, number of steps.
2. **Rationale:** why this scenario answers its questions.
3. **Seed:** what the starting repository contains, and what it must not contain.
4. **Required entry points:** the minimal interface the hidden tests call. Everything else is left
   free, so that M-R2 and M-R3 measure real choices.
5. **Steps:** for each step, the intent and what its prompt must say. The final prompt text is
   written in delivery (F6.x) and passes the leak scan (F3.2).
6. **Oracle design:** what the public oracle checks, and what *kind* of hold-out additions exist.
   The content of the hold-out additions is **never** written in this repository.
7. **Capability requirements (F3.6):** harness capabilities the scenario exercises, and whether the
   WingFoil version under development (0.2 pre-release, K5) lacks any.
8. **Scenario-specific threats**, beyond T1–T14.
9. **Open questions.**

## 3. Rules shared by all step prompts

- They are identical in every arm. They name no harness, no tool, no methodology, and do not tell
  the agent how to keep notes or records.
- Each prompt is self-contained for its task, but it does **not** restate information given in
  earlier steps, unless the scenario explicitly measures something else. Continuity is what F
  measures.
- They state the required entry points (§2 item 4) when a step introduces or changes them.
- They are written in English, in the voice of a product owner or a user, not of a test author.

## 4. Oracles, shared rules

- Hidden tests run **outside** the run container, on the per-step snapshots (experiment design §3.7).
- Every oracle is versioned together with its scenario (F3.4).
- Third-party test material is pinned to a commit, and its license is recorded.
- Scripted checks (decision consistency, directive violations, approval reconstructibility) look for
  **content**, never for a specific harness's file or commit format (F4.8).

## 5. Open questions

1. **Approval authority in the wingfoil arm.** WingFoil 0.2 checks approval authority: only an
   identity with the `approver` role may run `memory approve` or `memory reject`. In a run, the
   neutral approver answers "Approved. Proceed." (experiment design §3). Two ways to connect the two:
   - **(a)** the container's git identity is a declared benchmark approver, so the agent executes
     the approval after the neutral approver's reply;
   - **(b)** the runner itself executes the approval command, as the neutral approver's identity,
     whenever the agent asks for it. This counts as an intervention.

   (b) keeps "agents never approve", which is a WingFoil principle, but it needs runner support.
   **Deferred to the requirements phase** (scenario-specs review). It affects M-E3 and the wingfoil
   arm's operating manual.
