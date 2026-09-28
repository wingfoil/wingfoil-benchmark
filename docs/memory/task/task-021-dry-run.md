---
id: task-021-dry-run
type: task
title: "Dry run"
status: backlog
release: v0.1
wave: W5
features: [F3.3]
acceptance: [scenarios.feature]
requirements: [REQ-CLI-05, REQ-RES-01, REQ-NFR-06]
---

## Context

First task of wave **W5 — Cost control** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), whose
"Ends with" is "a campaign refuses to start above the ceiling". The estimate (F1.2, task-022) is built
from dry-run costs, and the guard (F1.3, task-023) from the estimate, so the dry run comes first.

Scope of F3.3:

- **`bench scenario dry-run <id>@<version> --arm <arm> [--model <id>]` (REQ-CLI-05).** One run of the
  scenario version in one arm, through the same runner as a campaign's runs: same container, same
  setup, same fresh-session steps, same neutral approver, same caps. A dry run is not a cheaper run; it
  is a real one, marked.
- **Stored under `results/dry-runs/` (REQ-RES-01)**, never under a campaign, and never read by
  aggregation. Each dry run records its cost per step and in total, with the scenario version's content
  hash (task-018), the arm, the model, the agent version and the harness commit it ran: this record is
  the **dry-run cost** of that scenario version in that arm, on that model, which task-022 reads.
- **Marked as a dry run** in its `run.json`, so that nothing downstream can mistake it for a campaign
  run (`scenarios.feature` @F3.3: it "never appears in published results").
- **Cost transparency (REQ-NFR-06), the dry-run half:** the command prints what it expects to spend
  before starting (the previous dry-run cost for the same key, or that there is none and the run's cost
  cap is the limit) and the actual cost when it finishes.
- **Spending stays deliberate.** A dry run with a real agent needs `--allow-spending`, as `campaign run`
  does (W5 plan-phase decision 5).

What a dry run of a real scenario costs is **calibration's** (plan-003 step 3), not this task's: S1,
S2, S3 and S8 arrive in W7 and W8. Here dry runs run T-scenarios against the fake agent, whose
replayed sessions report real costs; nothing is spent.

Left to the design phase: where a dry run takes the pins a campaign file would give it (agent
version, harness commit, caps, currency rate) — a fixed dry-run profile in the repository, or a
campaign file named on the command line; and which dry run counts when a key has several.

### W5 plan-phase decisions (proposed to the approver, 2026-09-28)

1. **Four tasks, in this order:** task-021 dry run (F3.3), task-022 cost estimate (F1.2), task-023
   budget guard at campaign start (F1.3, the refusals), task-024 cost and time caps during a run
   (F1.3, the stops, and REQ-RUN-13). The wave's "Ends with" holds after task-023; task-024 completes
   F1.3.
2. **A dry-run cost is keyed by scenario version, arm and model.** The estimate never scales one
   model's cost into another's: a key without a dry run is an error (`campaign.feature` @F1.2 @error).
   Consequence for calibration: the reference campaign's Opus 5 slice on S1 needs its own dry runs.
   This carries W3's finding (the wingfoil arm's first step cost eight times the baseline's) and
   adr-002's per-session cost floor into the estimate: both are in a measured cost, and neither needs
   a model of its own. The intervention cost W2 left to W5 is in it too, as resumes count in a run's
   cost (task-007).
3. **No real-agent half for W5's wave check.** The "Ends with" is a refusal before any session starts,
   which the fake agent shows in full: recorded fake dry-run costs, an estimate above `ceiling_eur`,
   `campaign run` refused with no session and no container. `real-agent-check` is not taken.
4. **The only spending in W5 is task-024's** (at most 0.30 USD on Haiku 4.5, consented at its
   pending → backlog gate), to observe how the pinned agent stops at `--max-budget-usd`, which W2 and
   W3 left unobserved.
5. **`--allow-spending` stays.** The guard adds a warning, a confirmation and a refusal on top of it;
   it does not replace the deliberate consent to spend (plan-003 constraint).

**Done** means: a dry run of a T-scenario in one arm is stored under `results/dry-runs/`, marked, with
its cost per step and in total under its key; the command prints the expected and the actual cost;
tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F3.3 "A dry run measures the real cost of a scenario in one arm" — with the fake
  agent standing in for the real one. **red-first**
- REQ-CLI-05 — the command, its arguments, and its errors (unknown scenario version, unknown arm, a
  version that fails validation). **red-first**
- REQ-RES-01 — dry runs are stored under `results/dry-runs/` and no campaign's results directory holds
  one. **red-first**
- REQ-NFR-06 — the expected cost is printed before the run starts and the actual cost after it ends.
  **red-first**

## Design

**Classification confirmed:** all red-first. The existing campaign path is kept green by its own tests
(unit, acceptance, docker), which the runner's refactoring below must not change.

### Where a dry run takes its pins — `scenarios/dry-run.yaml`

The Context's first open question. A dry run needs what a campaign file would pin — agent and version,
the harness of an arm that requires one, the default model, the approver policy, the caps, the currency
rate — and REQ-CLI-05 names no file. **A fixed profile in the repository, `scenarios/dry-run.yaml`**,
beside `scenarios/leak-scan.yaml` (task-017's precedent for a scenario tool's declarations):

```yaml
harnesses:            # by arm name, the same entry as a campaign's (REQ-FMT-01, REQ-FMT-03)
  wingfoil: { tool: wingfoil, version: 3df305e }
agent: { name: claude-code, version: 2.1.280 }
models: { default: claude-sonnet-5 }
approver_policy: v1
caps: { step_time_s: …, step_tokens: …, run_cost_eur: … }
currency: { usd_to_eur: … }
```

Its schema, `dryRunProfileSchema` in `core/`, is built from the campaign schema's own field schemas, so
a pin means the same in both files; unknown keys are rejected. It has **no `budget`**: a dry run is one
run, bounded by `caps.run_cost_eur`, and the ceiling belongs to a campaign. It has no scenarios, arms or
repetitions: the command line names them.

Why not a campaign file on the command line (`--campaign <file>`): a dry run comes *before* the
campaign it prices — scenario authoring dry-runs a scenario that no campaign names yet — and a campaign's
identity would tie each dry run to one budget and one list of scenarios it has nothing to do with. The
cost it measures is keyed by scenario version, arm and model (W5 plan-phase decision 2); the agent and
harness it ran are recorded with it, and task-022 shows them next to the campaign's pins.

**The benchmark's own `scenarios/dry-run.yaml` is not written here.** Its values — the agent version
(REQ-RUN-16 as amended: 2.1.280), the model, the caps — are calibration's choice (plan-003 step 3),
made when S1–S8 exist. Tests use fixture profiles. Until then the command says the file is missing,
naming it.

### The command — `bench scenario dry-run` (REQ-CLI-05)

`bench scenario dry-run <id>@<version> --arm <arm> [--model <id>] [--allow-spending]`. `--arm` is
required; `--model` defaults to the profile's `models.default` and is checked like a campaign's model
id. Anything else is a usage error (exit 2). Before anything is built, in this order, each failure an
issue on stderr and exit 1:

1. the profile loads and validates;
2. the scenario version loads (REQ-FMT-04), has not changed since stored campaign results ran it
   (REQ-FMT-09), and passes the leak scan **without the hold-out**: a dry run is a run, and a run never
   reads the hold-out, from the option or the variable (REQ-CLI-10);
3. the arm loads from `arms/<arm>/`; for `baseline-docs`, the `wingfoil` arm loads too, as the source
   its environment is generated from (REQ-RUN-11), and is not run;
4. harness coverage (`harnessCoverage`) over the arms loaded — not over the whole profile, whose
   harness entries may serve other arms;
5. `--allow-spending` for any agent but `fake`, the credential (REQ-RUN-15) and `BENCH_WINGFOIL_REPO`
   when a WingFoil harness is needed — the same checks as `campaign run`, factored out of
   `cli/run.ts` and shared (W5 plan-phase decision 5).

Exit 0 when the run completed, 1 otherwise; a failed dry run is still stored, like a failed campaign run.

### The runner — one path for both

`runCampaign` today takes a `CheckedCampaign` and does everything from the image to the last run. It is
split so that a dry run goes through **the same code**, not a copy (the Context: a dry run is a real
run, marked):

- a **`RunPlan`**: the identity (the image tag and the container prefix), the pins (agent, harnesses,
  approver policy, caps, currency), the runs as a list of scenario × arm × model × repetition, the
  arms loaded (runs and generation sources), where results go (`resultsDir`, `execution`), and what the
  record says it was — `{ campaign: <id> }` or `{ dry_run: true }`;
- `runPlan(plan, options)`: build, harnesses, generated environments, then every run — today's body of
  `runCampaign`;
- `runCampaign(checked, options)` builds a campaign's plan, exactly as today; `runDryRun(checked,
  options)` builds a dry run's: one run, repetition 1.

`prepareHarnesses` and `prepareProjectRules` take the plan instead of a `CheckedCampaign`;
`prepareProjectRules` generates only for scenarios that run in `baseline-docs`. The identity of a dry
run's image and containers is `dry-` followed by the first 12 hex characters of the SHA-256 of the
canonical JSON of profile, scenario, version, arm and model — the campaign identity's rule (REQ-FMT-02)
over what the dry run pins, so bug-003's leftover check works for dry runs unchanged.

### Where it is stored (REQ-RES-01) and how it is marked

`results/dry-runs/<n>/`, `n` counted like a campaign's executions (`nextExecution(resultsRoot,
'dry-runs')`), holding `dry-run.yaml` (a copy of the profile it ran with) and
`runs/<id>@<version>/<arm>/<model>/r1/` exactly as REQ-FMT-06 lays out a campaign's run: `run.json`
and `steps/<NN>/{usage.json, transcript.jsonl, diff.patch}`. The workspace goes under
`runs/dry-runs/<n>/…`, git-ignored like a campaign's.

`run.json` is the campaign run's record with **`"dry_run": true` in place of `"campaign"`**: nothing
that reads a run can take it for a campaign's. It already holds everything the dry-run cost's key and
its provenance need — `scenario`, `version`, `scenario_hash`, `arm`, `model`, `agent`, `harness.commit`,
and every step's usage with `costUsd` — so no field is added for the cost: task-022 sums the steps' USD
and converts at the **campaign's** rate, not the profile's.

**Dry runs never freeze a version.** `recordedHashes` (REQ-FMT-09) skips `results/dry-runs/`: a dry run
calibrates difficulty (F3.3), and scenario authoring changes a version after dry-running it; freezing it
would turn every such change into a new version before any campaign ran it. What protects the estimate
instead is the hash in the key: a dry run whose `scenario_hash` differs from the version's current hash
does not count. Aggregation (W7) reads `results/<campaign-id>/` only; a test fixes that `dry-runs`
cannot be a campaign id (12 hex characters, REQ-FMT-02).

### Which dry run counts (the Context's second open question)

For a key — scenario version with its current hash, arm, model — the **latest** (highest `n`) dry run
whose run **completed**. Not the mean: dry runs are single runs made to price a campaign, and the latest
reflects the agent and harness in use now; a failed or truncated run did not do the scenario's work, so
its cost is not the scenario's. Implemented here as `latestDryRun(resultsRoot, key)` in `results/`,
because the dry run itself prints it (below); task-022 reads it.

### Cost transparency (REQ-NFR-06)

Before the image is built:
`dry run T1@1.0 in baseline on fake-model: the latest dry run cost 0.0231 EUR (results/dry-runs/2)`, or
`… no dry run yet; this one may spend up to its cap, 1 EUR`. After it ends:
`dry run T1@1.0 in baseline: completed, 0.0452 USD (0.0416 EUR) — step 01 0.0301 USD, step 02 0.0151 USD
— results/dry-runs/3`. USD first because that is what the agent reports (REQ-RUN-09); EUR at the
profile's rate.

### Modules

- `core/campaign.ts`: the field schemas it already has, exported for the profile; `core/dry-run.ts`:
  `dryRunProfileSchema`.
- `scenario/dry-run.ts`: `loadDryRunProfile(file)`.
- `runner/plan.ts` (`RunPlan`, `runPlan`), `runner/dry-run.ts` (`checkDryRun`, `runDryRun`);
  `runner/run.ts`, `harness.ts`, `project-rules.ts` moved onto the plan; `runner/campaign.ts` builds a
  campaign's plan.
- `results/dry-runs.ts`: the directory name, `latestDryRun`; `results/recorded.ts` skips it.
- `cli/scenario.ts`: `dry-run` parsed and dispatched; `cli/run.ts`: the spending, credential and
  WingFoil-clone checks shared by both commands; the usage text gains the line.

### Tests

- **Acceptance** (`scenarios.feature` @F3.3, runner doubles and the fake agent, whose replayed sessions
  report the W2 spike's real costs): `bench scenario dry-run T1@1.0 --arm baseline` executes one run; its
  `run.json` under `results/dry-runs/1/runs/T1@1.0/baseline/<model>/r1/` says `dry_run: true`, has no
  `campaign`, and holds each step's cost; stdout prints the per-step and total cost; no
  `results/<campaign-id>/` exists; after changing a prompt of T1@1.0, `bench scenario validate` still
  accepts it (no freeze), and `latestDryRun` no longer finds a dry run for it.
- **Unit:** the profile (missing, malformed, unknown key, no `budget`, a pin as a campaign pins it); the
  arguments (`--arm` missing or repeated, `--model` invalid, stray arguments → exit 2); each check of the
  order above with its message; `baseline-docs` loading `wingfoil` without running it; the identity;
  `nextExecution` over `dry-runs`; `recordedHashes` skipping it; `latestDryRun` (latest wins, failed runs
  and other hashes, arms and models ignored); both NFR-06 lines; the campaign's `run.json` unchanged.
- **Docker** (`npm run test:docker`): one dry run of T1 in the baseline arm against the real Docker with
  the fake agent: stored under `results/dry-runs/`, no container left behind. Nothing is spent.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `71131d3`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W5 tasks of release v0.1` (`40c7c46`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-021-dry-run` → `92c8235`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
