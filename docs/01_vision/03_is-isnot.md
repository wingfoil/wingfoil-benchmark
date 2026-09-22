# Is / Is Not / Does / Does Not — WingFoil Benchmark

**Version:** 1.1
**Date:** 2026-09-22
**Status:** Approved
**Traces to:** [01_product-brief.md](01_product-brief.md), [02_product-vision.md](02_product-vision.md)

---

## IS

- An open, reproducible benchmark suite for **harnesses** used in AI-assisted software development:
  WingFoil first, and competing tools too.
- A catalogue of **scenarios**, each made of:
  - a seed repository;
  - step prompts that are identical across arms;
  - a hidden oracle.
  Scenarios come in two tiers: micro scenarios for every minor release, and macro projects for every
  major release.
- A **runner** that executes scenario × arm × agent × repetition in isolated Docker containers.
- A **scoring pipeline** for quality, cost and determinism.
- A **published results site** (GitHub Pages), organized by category and persona.
- A tool used by the WingFoil maintainer to steer WingFoil's development.

## IS NOT

- A general benchmark of LLMs or coding agents. Models are held constant; harnesses are compared.
- WingFoil's CI or test suite. It never gates a WingFoil build, and it lives in a separate repository.
- A marketing page that shows only wins.
- An exhaustive leaderboard of every AI development tool. Competitors are added selectively, with
  equal setup effort.
- A certification or a guarantee of how a harness will perform on a reader's own project.
- A user study. It measures agents working under a harness, not human productivity.

## DOES

- Gives every arm the **same step prompts**. The only difference between arms is the environment
  the agent runs in.
- Activates each arm's harness through a fixed, published **operating manual** in the arm's
  environment (its `CLAUDE.md` / `AGENTS.md`). The manual maps a step's intent to the harness's
  own commands, and its cost counts as **setup**. This applies to every arm, WingFoil included.
- Runs every step in a **fresh session**, so that continuity has to come from the harness, the
  documents or the code, and not from the conversation.
- Keeps **oracles hidden** from the agent. The hold-out part stays in a private repository.
- Measures:
  - **quality:** hidden tests, spec adherence, code quality, duplication, and maintainability,
    measured as the cost of the next change;
  - **cost:** tokens, money, time, turns and interventions;
  - **determinism:** agreement between repeated runs.
- Answers approval gates and agent questions through a **scripted, neutral approver**, with the same
  answer policy for every arm. Every intervention is counted.
- Reports **setup cost separately** from per-step cost.
- Reports **variance**, not only averages. It labels single-repetition results as **preliminary**.
- **Pins** every variable of a campaign: scenario version, harness version, agent, model id and seed.
- Groups results by **category** (A–G) and **persona**.
- Lets scenario authors add scenarios through a documented format.

## DOES NOT

- Tune prompts, budgets or time limits per arm.
- Let the agent see oracles, other arms, the runner, or this repository.
- Give any arm extra human help. Outside macro projects, no human answers during a run.
- Compare numbers produced with different models or agent versions as if they were equivalent.
- Drive **benchmark-specific features** into WingFoil. A change made only to win a scenario is
  overfitting, and the hold-out set exists to catch it.
- Run inside, or write into, the WingFoil repository.

---

## Review decisions

- **1.1, features review (2026-09-22) — arm activation.** Tools driven by slash commands or skills
  made the "same step prompts" rule ambiguous. Option (a) was chosen: each arm is activated by a
  fixed, published operating manual in its environment, counted as setup cost. Step prompts stay
  identical and harness-neutral. Source: [06_features.md](06_features.md) F2.7, input
  [X_competitor-landscape-2026-09-22.md](X_competitor-landscape-2026-09-22.md).
