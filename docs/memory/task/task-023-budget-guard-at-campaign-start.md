---
id: task-023-budget-guard-at-campaign-start
type: task
title: "Budget guard at campaign start"
status: pending
release: v0.1
wave: W5
features: [F1.3]
acceptance: [campaign.feature]
requirements: [REQ-CLI-03]
---

## Context

Third task of wave **W5 — Cost control** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). Its
refusal **is** the wave's "Ends with": "a campaign refuses to start above the ceiling".

Scope, the start half of F1.3 (REQ-CLI-03):

- **Above `warn_eur`:** `campaign run` shows the estimate (task-022) and the threshold, and starts
  only after the maintainer confirms.
- **Above `ceiling_eur`:** it does not start, no agent session starts and no container is created,
  and **no command-line option can make it start** (acceptance decision 2): the only way past the
  ceiling is a campaign file with a higher one, which is a new campaign.
- **An estimate that cannot be made** (a key without a dry run) stops `campaign run` too, with
  task-022's message: a campaign whose cost is unknown does not start.
- **`--allow-spending` stays** (W5 plan-phase decision 5): the guard adds to it and does not replace
  it. The interim refusal of adr-001 default 7 and task-006 is revisited: its message names the
  estimate once there is one.

Left to the design phase: how the confirmation is asked (a prompt on a terminal, and what happens when
there is none, as in the docker suite), so that a campaign above `warn_eur` never starts by default.

**Wave check (W5 plan-phase decision 3, task-021).** Verified offline, with the fake agent: a T-scenario
with recorded fake dry-run costs, a campaign whose estimate exceeds its `ceiling_eur`, `campaign run`
refused with no session and no container; the same campaign under a higher ceiling starts. No
`real-agent-check`.

**Done** means: `campaign.feature` @F1.3 "A campaign above the warning threshold warns but may start"
and "A campaign above the ceiling refuses to start" pass; the wave check is recorded in `rel-v0-1`
when W5's last task is done; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `campaign.feature` @F1.3 "A campaign above the warning threshold warns but may start". **red-first**
- `campaign.feature` @F1.3 @error "A campaign above the ceiling refuses to start" — including that no
  option, `--allow-spending` among them, makes it start. **red-first**
- A campaign that cannot be estimated does not start. **red-first**
- A real-agent campaign without `--allow-spending` is still refused (task-006's test). **characterization**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `7cf45f8`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W5 tasks of release v0.1` (`40c7c46`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-023-budget-guard-at-campaign-start` → `dc5bfae`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
