---
id: task-023-budget-guard-at-campaign-start
type: task
title: "Budget guard at campaign start"
status: done
release: v0.1
wave: W5
features: []
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

**Why `features` is empty (build phase, 2026-09-28).** F1.3 has four acceptance scenarios; this task
delivers the two at the start, task-024 the two during a run. The traceability test asks every scenario
of a started task's features to have a test, so declaring F1.3 here would hold the two stops red until
task-024. As task-016 did for F3.5, the feature is declared by the task that completes it, task-024;
this task's two scenarios have their tests all the same.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `campaign.feature` @F1.3 "A campaign above the warning threshold warns but may start". **red-first**
- `campaign.feature` @F1.3 @error "A campaign above the ceiling refuses to start" — including that no
  option, `--allow-spending` among them, makes it start. **red-first**
- A campaign that cannot be estimated does not start. **red-first**
- A real-agent campaign without `--allow-spending` is still refused (task-006's test). **characterization**

## Design

**Classification confirmed.** Test-first.

### Where the guard is — `campaign run`, before anything is built

The guard belongs to the command, not to `runCampaign`: the runner executes a plan it is given, and the
unit, acceptance and harness tests that call it directly keep running campaigns without dry runs. In
`bench campaign run`, in this order, each refusal an issue on stderr and exit 1:

1. `checkCampaign` (as today);
2. **the estimate** (`estimateCampaign`, task-022). A campaign that cannot be estimated does not start:
   its missing dry runs are listed, then `campaign: not started: its cost cannot be estimated`;
3. **the ceiling**: the estimate in EUR **above** `ceiling_eur` (strictly: REQ-CLI-03 "refuses above")
   → `campaign: not started: the estimate, 130.0000 EUR, is above the ceiling, 100 EUR. No option
   overrides it: lower the campaign's cost, or raise ceiling_eur, which makes a new campaign`. There is
   no option to check: none exists, and `--allow-spending` is tested not to change it;
4. the spending checks (`--allow-spending`, the credential, the WingFoil clone — task-021's
   `checkSpending`, unchanged);
5. **the warning**: the estimate above `warn_eur` → on stderr `campaign: the estimate, 42.0000 EUR, is
   above the warning threshold, 30 EUR`, then the confirmation (below). Last, so that nobody confirms a
   campaign a missing credential would stop a second later.

The estimate's total line is printed before the ceiling check, as task-022 prints it, so a refusal shows
the figure it refused.

### The confirmation — `Io.ask`

`Io` gains an optional `ask(question): Promise<string>`. The bin sets it only when stdin is a terminal,
with `node:readline`; tests pass a function. The question is `Start the campaign? [y/N] `; `y` or `yes`
(case-insensitive, trimmed) starts it, anything else is `campaign: not started: not confirmed`. With no
`ask` — a pipe, a script, CI — a campaign above the threshold is refused:
`campaign: not started: a campaign above its warning threshold is confirmed on a terminal`.

**No flag confirms.** A `--yes` would make the threshold something a script passes by habit, which is
what the confirmation exists to prevent; the threshold is loose (K4) and a campaign under it needs no
confirmation. Recorded as this task's decision; a later need for unattended campaigns above it is an
element of its own.

### The wave check (W5's "Ends with")

Offline, with the fake agent (W5 plan-phase decision 3):

- **acceptance** (`campaign.feature` @F1.3, both scenarios, with doubles): a stored dry run makes the
  estimate 130 EUR against a ceiling of 100 → not started, no build, no container, no step, and the same
  with `--allow-spending`; 42 EUR against 30/100 → the warning, then a run only after `y`;
- **the built command** (`npm run test:bin`): `bench campaign run` on a campaign above its ceiling, in a
  temporary repository, exits 1 with the refusal — the real process, before any Docker call.

### Tests that run a campaign through the command

They now need a dry run for every key: `test/unit/cli/main.test.ts`'s `campaign run` tests and the four
docker tests. A helper, `priceCampaign(file, usd)` in `test/support/dry-run-fixture.ts`, stores a
completed dry run for every key of a campaign (default model and slices), at the given cost.

### Modules

- `cli/shared.ts`: `Io.ask`; `cli/main.ts`: `ask` on a terminal; `cli/run.ts`: the guard in
  `campaign run`.
- `runner/estimate.ts`: `keysOf` exported as `campaignKeys`, which `priceCampaign` and task-025 reuse.

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
- The approver's `memory approve` → `c3ff77d` (`pending → backlog`). Matches.
- Design committed by hand on `task/task-023-budget-guard-at-campaign-start` (`65fa915`), then
  `npx wingfoil memory submit task-023-budget-guard-at-campaign-start` → `840f972`
  (`backlog → in-progress`, one commit, only `status`). Matches. WIP: this task `in-progress`, none
  `in-review`.

### Build (TDD)

1. **Tests first:** the two @F1.3 acceptance tests; eleven unit tests of the guard (no estimate, no
   terminal, four answers that confirm and four that refuse, the thresholds themselves, the order of the
   refusals); the existing `campaign run` tests given a dry run for every key (`priceCampaign`). **24
   red**, 22 for the guard that did not exist and 2 for the traceability test (below).
2. **The guard** (`e8131d0`): green at the first implementation but for two tests that ran a campaign
   through the command and had not been priced — `runner.feature` @F2.1's hold-out check and one
   expectation of an empty stdout, which now holds the estimate. Both updated.
3. **The docker suite's four campaign runs** priced the same way, and **the built command's test** of
   W5's "Ends with" added: green when added, since the guard existed.
4. **The terminal prompt, by hand:** `node dist/cli/main.js campaign run` on a campaign estimated at
   42 EUR, through `script` for a pseudo-terminal, answering `n` → the warning, `Start the campaign?
   [y/N]`, `campaign: not started: not confirmed`, exit 1; with stdin not a terminal → `… is confirmed
   on a terminal`, exit 1. No automated test drives `readline` itself.

### Deviation from the Design

- **`features: []`, not `[F1.3]`** (the Context's new paragraph): the traceability test would otherwise
  hold task-024's two scenarios red from now on. task-016's precedent for F3.5; task-024 declares F1.3.
  The approver accepted the task with `[F1.3]`: this is a change to the approved scope's declaration,
  not to its content, and is put to the approver at review.

### Known limits

- The prompt itself (`node:readline` in `cli/main.ts`) is checked by hand only (Build, 4).
- A campaign's estimate reads the dry runs at start; nothing re-checks the budget while it runs. That is
  task-024's (`budget exhausted`).

### Review readiness

`npm test` 682/682 (statements 99.8%, branches 96.89%, functions 100%, lines 100%), `npm run test:bin`
5/5, `npm run test:docker` 5/5, `npm run lint` clean, `npm run build` clean; no `bench-*` container
left. `campaign.feature` @F1.3's two start scenarios have their acceptance tests. Nothing was spent.

### Review and approval

- `npx wingfoil memory submit task-023-budget-guard-at-campaign-start` → `d33c747`
  (`in-progress → in-review`, one commit, only `status` changed). Matches.
- `npx wingfoil memory approve task-023-budget-guard-at-campaign-start --reason "…"` → `b9b9fff`, run
  by the approver (`in-review → approved`, `Approver:`/`Reason:` trailers, only `status` changed).
  Matches. The reason accepts `features: []`, F1.3 being declared by task-024.
