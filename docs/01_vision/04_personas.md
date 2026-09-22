# Personas — WingFoil Benchmark

**Version:** 0.1
**Date:** 2026-09-22
**Status:** Draft
**Traces to:** [01_product-brief.md](01_product-brief.md) §2–§3, [02_product-vision.md](02_product-vision.md) "Value by Audience"

---

This document describes two different sets of people, and they must not be confused:

- **Benchmark personas** (§1): the people who *use this benchmark*, by reading its results, running
  it, or extending it. They drive this repository's features.
- **Result profiles** (§2): the kinds of WingFoil user that results are *grouped by*, so that a
  reader can find "people like me". They are a reporting dimension, not users of this repository.

---

## 1. Benchmark personas

### Persona 1 — Riley, the Curious Reader

- **Who:** a developer who uses AI agents daily and lands on the results from a social post or from
  the WingFoil README.
- **Time budget:** two minutes.
- **Goal:** understand at a glance whether WingFoil does something their current setup does not.
- **Pain today:** every tool claims to make AI agents better, and none of them shows evidence.
- **Needs from the benchmark:**
  - a headline result per category that is visible immediately;
  - a single chart that compares arms;
  - a clear "preliminary" label when a result has only one repetition.
- **Success:** Riley shares the page or opens WingFoil's README.
- **Serves purpose:** 1 (spark curiosity).

### Persona 2 — Dana, the Adoption Decider

- **Who:** a tech lead or engineering manager who decides whether a team adopts WingFoil.
- **Time budget:** an hour, possibly spread over several visits.
- **Goal:** know which project phases WingFoil helps with, for their kind of team, and at what
  setup and running cost.
- **Pain today:** evaluating a process tool means a pilot of several weeks, and the outcome is hard
  to compare.
- **Needs from the benchmark:**
  - results by category and by result profile (§2);
  - setup cost shown apart from per-step cost;
  - the losses as well as the wins;
  - the method, so the numbers can be trusted.
- **Success:** Dana can write a one-paragraph recommendation for or against adoption, backed by
  linked numbers.
- **Serves purpose:** 3 (support adoption).

### Persona 3 — The WingFoil Maintainer

- **Who:** WingFoil's maintainer, who is also the approver of this repository.
- **Goal:** steer WingFoil's development with evidence, and catch regressions between releases.
- **Pain today:** improvements are judged by impression, and a change that makes agents slower or
  more expensive goes unnoticed.
- **Needs from the benchmark:**
  - a campaign that runs against a chosen WingFoil version within the 20–30 € budget;
  - a comparison with the previous campaign;
  - per-scenario detail down to the individual run and its transcript;
  - findings that can be turned into WingFoil bugs and decision-logs.
- **Success:** at least one WingFoil change per release cycle is driven by a benchmark finding.
- **Serves purpose:** 2 (steer WingFoil).

### Persona 4 — Quinn, the Scenario Author

- **Who:** a contributor, either the maintainer or someone external, with experience in a
  specific domain or kind of task.
- **Goal:** add a scenario that exercises a category not yet covered well, and see it run by every
  arm.
- **Pain today:** there is no format for a scenario, and no way to check that it is fair and has
  no leaks.
- **Needs from the benchmark:**
  - a documented scenario format (seed, step prompts, oracle, category tags);
  - a validator that checks the format and scans for oracle leaks;
  - a cheap single-arm dry run;
  - a clear rule on what goes to the public repository and what goes to the hold-out.
- **Success:** a new scenario is accepted without the maintainer having to rewrite it.
- **Serves purpose:** 2 and 3, indirectly, by widening coverage.

### Persona 5 — Avery, the Competitor Comparer

- **Who:** a researcher, a blogger, or the maintainer of a competing tool (Spec Kit, BMAD, …).
- **Goal:** compare harnesses on equal terms, or check that their own tool was treated fairly.
- **Pain today:** tool comparisons are anecdotal and usually written by one of the vendors.
- **Needs from the benchmark:**
  - published, scripted setup for every tool;
  - identical prompts and budgets;
  - the ability to rerun a campaign;
  - a way to contest a setup, for example through an issue.
- **Success:** Avery can reproduce a published number, or can point to the exact setup step they
  disagree with.
- **Serves purpose:** 3, and the credibility of all the others.

---

## 2. Result profiles (reporting dimension)

Results are grouped by the kind of WingFoil user they matter to. The proposal is to reuse the user
types in WingFoil's public vision (`docs/01_vision/04_personas.md` in the WingFoil repository), by
**profile** rather than by name, so that this benchmark stays independent of how WingFoil names
them.

| Profile | Categories that matter most |
|---|---|
| Solo developer | C Development, D Maintenance & Quality, F Knowledge & Continuity |
| Code reviewer | D Maintenance & Quality, E Governance & Compliance |
| Team developer | C Development, F Knowledge & Continuity, G Collaboration |
| Tech lead | B Planning & Management, E Governance & Compliance, G Collaboration |
| Non-technical manager | A Inception & Specification, B Planning & Management |
| Architect | A Inception & Specification, E Governance & Compliance, F Knowledge & Continuity |

---

## Open Questions

1. **Result profiles:** reuse WingFoil's six user types as above, or define profiles specific to the
   benchmark?
2. **Primary persona for the first release:** the brief puts purpose 1 first, which makes Riley the
   primary persona. Riley needs a small number of striking, well-labelled results. Dana needs
   breadth and method. Is Riley the primary persona for the first release, with Dana served from
   the release after it?
3. **External scenario authors:** should Quinn be supported from the start (format, validator,
   contribution guide), or is the maintainer the only scenario author until the first public result?
