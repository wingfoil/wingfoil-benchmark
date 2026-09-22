# User Journeys — WingFoil Benchmark

**Version:** 0.1
**Date:** 2026-09-22
**Status:** Draft
**Traces to:** [04_personas.md](04_personas.md), [03_is-isnot.md](03_is-isnot.md)

---

Each journey lists the steps a persona goes through, what they touch, and the pain or opportunity at
that step. The opportunities feed the feature brainstorm (`06_features.md`).

| ID | Journey | Persona | Priority |
|---|---|---|---|
| J1 | Glance at the results | Riley | first release (primary persona) |
| J2 | Run a campaign | Maintainer | first release (nothing exists without it) |
| J3 | Author a scenario | Maintainer, acting as scenario author | first release |
| J4 | Turn findings into WingFoil work | Maintainer | first release |
| J5 | Evaluate adoption | Dana | release after the first |
| J6 | Audit and compare tools | Avery | when the first competitor arm is added |
| J7 | Contribute an external scenario | Quinn | deferred |

---

## J1 — Glance at the results (Riley)

**Trigger:** a social post or the WingFoil README links to the results page.

| # | Step | Touchpoint | Pain / opportunity |
|---|---|---|---|
| 1 | Opens the link | GitHub Pages landing page | Has to understand what is compared within a few seconds: *harness, not model*. |
| 2 | Reads the headline | one sentence and one chart | The headline must be honest. It shows where WingFoil wins **and** where it does not. |
| 3 | Scans the categories | a row per category (A–G), with the delta per arm | A "preliminary" badge when there is a single repetition, and the number of runs shown. |
| 4 | Opens a category that concerns them | category card: scenario, arms, key metrics | Enough detail to be credible; the full method stays one click away. |
| 5 | Leaves or goes further | links to WingFoil's README, to the method, to the raw data | The call to action is to try WingFoil, not to buy anything. |

**Ends well when:** Riley can say in one sentence where WingFoil makes a difference, and shares the
page or opens the README.

---

## J2 — Run a campaign (Maintainer)

**Trigger:** a new WingFoil minor or major release, or a change worth measuring.

| # | Step | Touchpoint | Pain / opportunity |
|---|---|---|---|
| 1 | Defines the campaign | campaign file: WingFoil version, scenarios, arms, agent and model, repetitions | Every variable is pinned in one file, and that file identifies the campaign. |
| 2 | Gets a cost estimate | `estimate` command | The cost is known **before** spending. A campaign over the 30 € target warns; one over the 100 € ceiling refuses to start. |
| 3 | Launches it | runner, Docker | Each run is isolated. The agent sees only the scenario seed. |
| 4 | Watches progress | console, run log | The runner continues after one run fails. Runs over budget are stopped. Stuck agents are answered by the neutral approver, and each intervention is counted. |
| 5 | Scores it | scoring pipeline, hold-out oracles read from a configured path | Oracles never enter the container. Scores are stored with the campaign id. |
| 6 | Compares | report against the previous campaign | Deltas per category, per arm and per metric, and variance when there is more than one repetition. |
| 7 | Inspects runs | per-run detail: transcript, diff, test results, token usage | Every aggregate number can be traced to the runs behind it. |
| 8 | Publishes | results site build, then GitHub Pages | Preliminary results are labelled. Publishing is a deliberate step, never automatic. |

**Ends well when:** the campaign stays within budget, every number traces back to runs, and the
published page matches the stored results.

---

## J3 — Author a scenario (Maintainer as scenario author)

**Trigger:** a category is not covered, or not covered well enough.

| # | Step | Touchpoint | Pain / opportunity |
|---|---|---|---|
| 1 | Picks the goal | experiment design (GQM): which question the scenario answers | A scenario exists to answer a GQM question, not because it is interesting. |
| 2 | Writes the seed | seed repository | Small enough to fit the budget, and realistic enough to be credible. |
| 3 | Writes the step prompts | one prompt per step | The same prompts serve every arm. Nothing in them mentions a harness. |
| 4 | Writes the oracle | hidden tests, rubric, expected-items list; public or hold-out | A clear rule for what goes public and what goes to the hold-out. |
| 5 | Tags it | categories (primary and secondary), result profiles | The tags drive the reporting on the site. |
| 6 | Validates it | validator: format check and leak scan | The leak scan checks that no oracle content appears in the seed or the prompts. |
| 7 | Dry-runs it | a single arm, a single repetition | Measures the real cost and calibrates the difficulty: not trivial, not impossible. |
| 8 | Registers it | scenario catalogue, versioned | Changing a scenario creates a new version, so older results stay comparable. |

**Ends well when:** the scenario runs in every arm, answers its GQM question, and costs what was
expected.

---

## J4 — Turn findings into WingFoil work (Maintainer)

**Trigger:** a campaign shows a loss, a regression or an unexpected cost for WingFoil.

| # | Step | Touchpoint | Pain / opportunity |
|---|---|---|---|
| 1 | Spots the finding | comparison report | Findings are ranked by size and by confidence. |
| 2 | Drills down | run transcripts of the WingFoil arm and the baseline arm | The comparison shows where the WingFoil arm spent extra turns, or where it went wrong. |
| 3 | Writes it up | a finding note: campaign, scenario, runs, evidence | The note can be copied as-is into a WingFoil bug or decision-log. The benchmark never writes into the WingFoil repository. |
| 4 | Verifies the fix | the next campaign on the fixed WingFoil version | The same scenarios and the same pins, with only the WingFoil version changed. |

**Ends well when:** a WingFoil change can be linked to a finding, and to the campaign that confirmed
the fix.

---

## J5 — Evaluate adoption (Dana)

**Trigger:** Dana's team is considering WingFoil.

| # | Step | Touchpoint | Pain / opportunity |
|---|---|---|---|
| 1 | Chooses their profile | result profiles (e.g. tech lead, team developer) | The page filters to the categories that matter for that profile. |
| 2 | Reads wins and losses | category detail | Losses are as visible as wins. |
| 3 | Weighs the costs | setup cost and per-step cost, shown separately | The break-even point: after how many steps WingFoil's setup pays off. |
| 4 | Checks the method | method page: arms, controls, validity threats, pins | Enough rigor to be trusted without reading the code. |
| 5 | Decides | shareable link to a filtered view | A stable URL for each campaign and view. |

**Ends well when:** Dana writes a recommendation backed by linked numbers.

---

## J6 — Audit and compare tools (Avery)

**Trigger:** a competitor arm is published, or Avery wants to add one.

| # | Step | Touchpoint | Pain / opportunity |
|---|---|---|---|
| 1 | Reads the setup of each tool | scripted setup per arm, published | Equal effort: each tool is configured from its own official documentation. |
| 2 | Reruns a campaign | runner and campaign file | Reproducible without the hold-out. The public subset gives comparable numbers. |
| 3 | Contests a setup | GitHub issue that points to the setup step | A corrected setup produces a new campaign. The old campaign stays published. |

**Ends well when:** Avery reproduces a number, or gets a contested setup corrected.

---

## J7 — Contribute an external scenario (Quinn) — deferred

External contributions are deferred (personas review, decision 3). The journey will reuse J3, adding
a contribution guide and a review step by the maintainer.

---

## Open Questions

1. **Publishing (J2 step 8):** publishing is proposed as a deliberate, manual step. Is that right,
   or should a campaign that finishes cleanly publish automatically?
2. **Reproducing without the hold-out (J6 step 2):** Avery can rerun only the public scenarios. Is
   it acceptable that published results mix public and hold-out scenarios, with the site showing
   which is which?
3. **Break-even (J5 step 3):** is "after how many steps WingFoil's setup cost pays off" a figure you
   want to publish? It is appealing for Dana, but it depends heavily on the scenario.
