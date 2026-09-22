# Product Vision — WingFoil Benchmark

**Version:** 0.1
**Date:** 2026-09-22
**Status:** Draft
**Traces to:** [01_product-brief.md](01_product-brief.md)

---

## Vision Statement

**For** developers, teams and decision makers who are considering WingFoil for AI-assisted software
development, and for the WingFoil maintainer,
**who** today have only claims and anecdotes about what a process harness adds on top of an AI agent,
**the WingFoil Benchmark is** an open, reproducible benchmark suite
**that** shows, for each project phase and each type of user, where WingFoil improves quality, cost
and determinism, and where it does not.
**Unlike** generic coding benchmarks, which measure a model on isolated single-shot tasks,
**our product** measures the *harness around the agent*: over multi-session projects, with the model
held constant, against a baseline that has the same information, and against competing tools
configured with equal effort.

---

## Key Decisions

| Question | Decision |
|---|---|
| One vision or one per purpose? | One vision. The three purposes in the brief (spark curiosity, steer WingFoil, support adoption) all need the same thing: credible, per-phase evidence. They differ only in how the results are presented. |
| What is being measured? | The harness (WingFoil, a competitor, or none), **not** the model. Within a comparison, the agent and model id are fixed. |
| Unit of work | A **multi-session scenario**: a sequence of steps, each in a fresh session. A harness shows its value between sessions, so single-shot tasks alone would measure the wrong thing. |
| Main control | The **baseline-docs** arm: the same information as the WingFoil arm, in free-form Markdown. Without it, "WingFoil helps" cannot be told apart from "more context helps". |
| Where results are reported | Per **category** (A–G) and per **persona**. There is no single overall score that hides where a harness wins or loses. |
| Honesty of results | Losses and ties are published with the same prominence as wins. A benchmark that only shows wins is an advertisement and would undermine the adoption purpose. |
| Reproducibility | Every published number traces back to a pinned campaign: scenario version, harness version, agent, model id and seed. |
| Interventions during runs | A **scripted, neutral approver** answers approval gates and agent questions, with the same fixed answer policy for every arm. Every intervention is counted. A human answers only in macro projects, where interventions are an explicit metric. |
| Name | **WingFoil Benchmark**. WingFoil is the first subject; competitors are compared under the same rules. |
| Cost discipline | Designed around a 20–30 € campaign. Scenarios are kept small, and preliminary results with a single repetition are allowed if they are labelled as such. |

---

## Value by Audience

| Audience | What they get |
|---|---|
| Adopter / evaluator | A readable answer to "for my kind of work, does WingFoil pay off?", with the numbers behind it. |
| WingFoil maintainer | A regression signal across releases, and a map of where WingFoil costs more than it gives. |
| Scenario author | A documented way to add a scenario, with its seed, step prompts and oracle, and have it run by every arm. |
| Competitor comparer | The same scenarios and rules applied to other harnesses, with every tool's setup scripted and published. |

---

## Decisions from the vision review

1. **Publishing losses:** confirmed. Losses and ties get the same prominence as wins.
2. **Approval gates in automated runs:** a scripted, neutral approver, as described in Key Decisions.
3. **Name:** "WingFoil Benchmark" is kept.
