---
id: task-083-bench-campaign-compare-two-executions-compared-through-each-arm-s-delta
type: task
title: "bench campaign compare: two executions compared through each arm's delta"
status: in-progress
release: v0.2
wave: W14
features: [F5.2]
acceptance:
  - "comparison.feature#Two campaigns are compared through each arm's delta against its own baseline"
  - "comparison.feature#A comparison across models is marked"
  - "comparison.feature#A group whose scenario changed is not compared"
  - "comparison.feature#Only aggregated campaign executions can be compared"
requirements: [REQ-SCO-13, REQ-CLI-12]
fixes: []
---

## Context

F5.2, the command and the comparison record.

**Scope:**
- `bench campaign compare <campaign-id>/<n> <campaign-id>/<n>` (REQ-CLI-12): earlier, then newer, as the maintainer
  orders them; writes `results/comparisons/<newer-id>-<n>/<earlier-id>-<m>.json`; refuses a dry run, an unaggregated
  execution, the same execution twice;
- REQ-SCO-13: group by group (scenario version and arm present in both), each side's value, each arm's delta against
  its own execution's baseline, and the change of that delta (T7); differing pins listed; **cross-model** rows
  (T14); a changed scenario hash is not compared; ranges and certainty as REQ-RES-03 (task-082); tokens read as
  task-069 recorded them.

**Done** means: the four scenarios' tests green with the fake agent.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

All four are **red-first**: nothing compares two executions today, and `bench campaign compare` does not exist.
- `comparison.feature#Two campaigns are compared through each arm's delta against its own baseline`
- `comparison.feature#A comparison across models is marked`
- `comparison.feature#A group whose scenario changed is not compared`
- `comparison.feature#Only aggregated campaign executions can be compared`

## Design

**Fixes:** none.

**1. The command** (REQ-CLI-12): `bench campaign compare <campaign-id>/<n> <campaign-id>/<n>`.
- The first execution named is the earlier one, the second the newer, as the maintainer orders them.
- `main` dispatches it before the campaign verbs that take a file.
- It writes `results/comparisons/<newer-id>-<n>/<earlier-id>-<m>.json`. Its stdout gives:
  - the file;
  - how many groups were compared and how many were not;
  - `cross-model` when that applies;
  - each pin that differs.
- It exits 0.
- **Refusals, each naming what was given, exit 1:**
  - a target not of the form `<campaign-id>/<n>`, or `dry-runs/<n>`: "a dry run is never compared";
  - an execution that does not exist;
  - one with no `aggregate.json`: "is not aggregated: score it first";
  - the same execution twice.
- A wrong number of arguments is a usage error, exit 2.

**2. The comparison** (REQ-SCO-13), a pure function in `src/results/campaign-compare.ts` over the two executions'
committed files:
- `aggregate.json`;
- `campaign.yaml`, for the pins;
- each group's runs' `run.json`, for the scenario hash and the harness;
- the scenario's primary category, from `scenarios/` (the category map, REQ-RES-03).

**3. Groups:**
- A group is a scenario version and an arm present in both executions.
- The default model's groups are compared with each other. Each slice is compared with the other side's slice of the
  same model; a slice without one is listed as not compared, saying "no slice of model *m* in *execution*".
- A scenario version whose recorded hash differs is not compared. Its groups read
  `not compared: scenario hash <earlier> in <earlier execution>, <newer> in <newer execution>`.
- A scenario version or an arm present on one side only is listed under `only_in`, so that nothing disappears
  silently.

**4. Each compared row**, for each metric of the scenario's primary category's map (`CATEGORY_MAP`, as the site
reads it). A harness arm and its docs control are both arms here, each against the baseline; the baseline itself has
no delta. For each side:
- the arm's and the baseline's values (`n`, `mean`, `min`, `max`);
- `delta`, the arm's mean less its own execution's baseline's (T7);
- `certainty` of that delta, by REQ-RES-03 as amended (`certaintyOf`, task-082).

Then `change`, the newer delta less the earlier. The range is meaningful from n = 3 and is shown by the site from
there (task-084). A metric a side does not measure reads "not measured".

**5. Cross-model and pins:**
- `cross_model: true` on every default row when the two executions' default models differ (T14); a slice row is
  never cross-model, since it pairs the same model.
- `pins_differ` lists, by name, the pins whose values differ, read from each `campaign.yaml`:
  - `models.default`;
  - `agent.version` (and `agent.name`);
  - `agent.effort.<model>`;
  - `harnesses.<arm>` (tool, version, commit).

**6. The file:**
- top-level fields: `comparison_version: 1`; `earlier` and `newer`, each with campaign, execution, default model and
  the date it ended (from `execution.json`, when present); `order: "maintainer"`, the maintainer's order, as REQ-CLI-12
  asks it be recorded;
- the comparison's contents: `pins_differ`, `rows`, `not_compared`, `only_in`;
- written with sorted keys, groups in scenario order then arm order, so that the same two executions give the same
  bytes (REQ-NFR-05).

**7. Not here:** the comparison page and the landing page's link (task-084); tokens, which no metric of the category
map reads, so task-069's recording is untouched.

**8. Done, checked by hand:** `bench campaign compare c82a5e74885b/1 c82a5e74885b/2`, the two aggregated executions
of v0.1's reference campaign. The Execution notes record the result.

**Tests** (red first):
- acceptance, `test/acceptance/comparison.test.ts` (new): the four scenarios, over executions built with the
  stored-run fixtures and scored.
- unit: target parsing and refusals; the row arithmetic (`delta`, `change`, `certainty` at n = 1 and 3); a slice with
  and without a counterpart; `only_in`; `pins_differ`; same bytes twice.
## Execution notes

## Review notes
