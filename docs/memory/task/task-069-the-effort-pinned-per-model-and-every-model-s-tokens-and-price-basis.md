---
id: task-069-the-effort-pinned-per-model-and-every-model-s-tokens-and-price-basis
type: task
title: "The effort pinned per model and every model's tokens and price basis"
status: in-progress
release: v0.2
wave: W13
features: []
acceptance: []
requirements: [REQ-RUN-16, REQ-RUN-08, REQ-RUN-09]
fixes:
  - bug-012-a-step-s-tokens-leave-out-the-models-claude-code-calls-for-its-own-work
  - bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price
---

## Context

Planned at W13's plan phase (the approver in chat, 2026-10-07: "Sì, come proposto"). Three items that read
`modelUsage` and the agent pin, and must land **before v0.2's calibration** so that its dry runs are measured as the
campaign will be ([rel-v0-2](../release/rel-v0-2.md) triage §3 and §5):

- **[dl-015](../decision-log/dl-015-the-effort-the-agent-sends-is-pinned-per-model-by-the-campaign.md), option C:**
  the effort pinned per model in the campaign file (`agent.effort: {<model>: <level>}`, required for a real agent),
  passed as `--effort` on every invocation, recorded with the run, part of the campaign's identity and of the
  estimate's key; the method page and the run detail show it. REQ-RUN-16 amended.
- **[bug-012](../bug/bug-012-a-step-s-tokens-leave-out-the-models-claude-code-calls-for-its-own-work.md):** a step's
  tokens are summed over every model in `modelUsage`, as its cost is; the `step_tokens` cap counts them all
  (REQ-RUN-08, REQ-RUN-09 amended).
- **[bug-016](../bug/bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price.md):** the run
  records `costBasis` per model; a run whose cost the agent could not price is flagged in `run show`, refused by the
  estimate as a missing dry run is, and marked on the site.

The design phase declares bug-012 and bug-016 in `fixes`. **No real agent, no spending:** the levels themselves are
set at calibration with the approver. **Done** means: a campaign pins and records the effort, a step's tokens cover
every model, and an unpriced cost cannot pass unnoticed — each with the fake agent replaying recorded sessions.

## Acceptance criteria

- The effort pinned per model: required for a real agent, passed, recorded, in the identity. **Red-first.**
- A step's tokens summed over `modelUsage`; the cap counts them. **Red-first** (bug-012's evidence as a fixture).
- An unpriced model's cost flagged and refused by the estimate. **Red-first** (bug-016's P2 session as a fixture).
- A v0.1 run without these fields still reads, scores and builds. **Characterization.**

## Design

### 1. The effort, pinned per model (dl-015 C; REQ-RUN-16 amended)

- **The campaign file and the dry-run profile.** `agent.effort: { <model>: <level> }`, where a level is one of
  Claude Code's `low`, `medium`, `high`, `xhigh` or `max`, or **`none`**: the runner passes no flag. `none` is for a
  model that takes no effort, such as Haiku 4.5 (dl-015). The dry-run profile picks `agent` from the campaign schema,
  so it gets the same field. The campaign's identity hashes the whole file, so the effort is part of it with no new
  code. A model named in `effort` that the campaign does not run is inert, and is not refused. *(Changed in build:
  the Design first refused it. That adds nothing dl-015 asks for, and would refuse a shared pin list reused across
  campaigns.)*
- **Required for a real agent, at run time.** `bench campaign run` and `bench scenario dry-run` with
  `claude-code` refuse, before the estimate and before any build, a model with no effort. The message names the
  model and the field. `campaign validate` prints the same as a `requires` line, as the preflight does (task-060).
  - Why not refuse in the schema: v0.1's campaign files and the current `scenarios/dry-run.yaml` stay readable as
    records. Their real-agent runs now refuse until calibration sets the levels with the approver (dl-015).
  - The fake agent needs none, and records the level when one is given.
- **Passed on every invocation.** `commandLine` and `resumeLine` add `--effort <level>` unless the level is `none`.
  - `StepRequest` and `ResumeRequest` carry `effort?`.
  - `resumeLine` gains it with no measurement under `--resume` (its comment asks for one). task-070's consented real
    run (S3 step 1) passes it and is the first measurement; the task records the result.
- **Recorded.** `run.json` gains `effort` (the level, `none` included) beside `model`.
- **The estimate keys on it** as on the model. A dry run is matched only when its recorded `effort` equals the
  campaign's for that model; a dry run that recorded none matches only `none` or an absent pin. Otherwise the dry run
  is missing, with a reason that names the effort.
- **Shown.**
  - The method page's execution table gains an "Effort" row, per model.
  - `bench run show` prints the run's effort beside its model.

### 2. Every model's tokens (bug-012; REQ-RUN-08, REQ-RUN-09 amended)

The fixtures show what the bug's evidence implies. A result event's `modelUsage` is the **session's running
total** across resumes: `resumed.jsonl`'s second result holds the first invocation's 20 858 tokens under one key,
and its own 289 720 under the dated key. The sum of `costUSD` over the keys equals `total_cost_usd`.

- **A step's tokens** are the sum over the step's folded `models`, the max per key across its invocations, as
  usage.json's `models` already is: every key, every kind.
- Without `modelUsage` (a session that reported none), the tokens are still the result events' `usage`, summed as
  today.
- **The `step_tokens` cap** counts the same figure, at each of its two checks.
- **`usage.json`'s token fields** hold it. Scoring and the aggregate read them unchanged, so M-K tokens now cover
  every model.
  - Runs stored before keep their recorded figures: nothing is recomputed.
  - Comparisons across campaigns read tokens, as the triage said (W14).

### 3. A cost the agent could not price (bug-016)

- **Read and recorded.** `modelsOf` reads `costBasis` (absent in older sessions). `ModelUsage` gains
  `costBasis?: string`. `foldModels` keeps a basis that is not `list` over one that is, so a step is flagged when any
  invocation was. `run.json`'s step `models` carry it.
- **"Unpriced" means** any model of any step with a `costBasis` other than `list`. An absent basis (sessions before
  Claude Code recorded it) is not flagged.
- **`bench run show`** prints the basis beside each model whose basis is not `list`, and a line under the run: "the
  agent could not price: <model> (<basis>)".
- **The estimate refuses it** as a missing dry run: the dry run of that key is skipped, with the reason "its cost was
  not priced by the agent (<model>: <basis>)".
- **Scoring and the site.** `score.json`'s run cost figures gain `cost_priced: false` when the run is unpriced. The
  field is absent otherwise, so older scores read as priced. The aggregate lists those runs as `cost.unpriced`, beside
  `cost.bound`. The method page states them as it states bounds: "For N runs the agent could not price the cost: …".

### Specification

requirements 1.27:

- **REQ-RUN-16:** the effort pin, its levels, `none`, required for a real agent, recorded, part of the identity
  and of the estimate's key.
- **REQ-RUN-08:** the token cap counts every model.
- **REQ-RUN-09:** a step's tokens are summed over `modelUsage`; `costBasis` is recorded and an unpriced cost is
  flagged.

Each amendment has its line in the change log. The method page's statements follow (`{#agent-effort}`, and the
cost paragraph).

### Tests

- **unit:**
  - the schema: levels, `none`, a model not in the campaign;
  - the run-time refusal and the `requires` line;
  - both command lines;
  - `run.json`'s `effort`;
  - the estimate's key;
  - the step tokens over `modelUsage`, from `resumed.jsonl` and from a new fixture `unpriced.jsonl`, modelled on
    bug-016's P2 (`costBasis: "unknown"`);
  - the cap;
  - `foldModels` keeping the basis;
  - `run show`;
  - the estimate refusing an unpriced dry run;
  - `cost_priced` and `cost.unpriced`;
  - the method page.
- **characterization:** a v0.1 run (no effort, no basis) still reads, scores and builds.
- `test:bin`; `test:docker`: the fake agent run records `effort` when the profile pins it.

## Execution notes

- `npx wingfoil memory add --type task --title "The effort pinned per model and every model's tokens and price basis"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-069-the-effort-pinned-per-model-and-every-model-s-tokens-and-price-basis`, `status: draft`. Matches.
- `npx wingfoil memory submit task-069-…` (backlog → in-progress), after the Design commit. Declared: moves the task
  to its next state and commits it. Observed: `wf(task): submit task-069-…`, `status: in-progress`. Matches.
- Build:
  - **bug-012:** red first (the step's `usage.json` and the cap), then `stepUsage` sums the step's folded models.
    The fixtures confirmed the Design's reading: `modelUsage` is the session's running total across resumes, and
    `costUSD` summed over the keys equals `total_cost_usd`. `readSession` stays per invocation, on the run's model.
    The runner applies the rule where it folds a step's invocations. So the @F2.4 acceptance test, which replays
    two unrelated recordings as one session, now expects the folded models' tokens.
  - **bug-016:** red first (the basis read and folded; `cost_priced`; `cost.unpriced` and the method page; the
    estimate), then the code. New fixture `test/fixtures/sessions/unpriced.jsonl`: `completed-sonnet.jsonl` with
    the model renamed claude-sonnet-5-5 and `costBasis: "unknown"`, as bug-016's P2 recorded it. It is synthetic,
    and the test says so.
  - **dl-015:**
    - The adapter's `--effort` was red first.
    - The schema, the run-time refusal (campaign run, dry run, `validate`'s `requires` line) and the runner were
      written before their tests, in the same step. Their tests came right after. This is a deviation from
      test-first.
    - `run show` and the method page's row were also written in the same step as their tests.
    - The Design's rule refusing an effort for a model the campaign does not run was dropped during build, and the
      Design says so: it would have refused every test campaign whose slices a test removes.
    - The complete campaign fixture now pins `high` for its two models. `priceCampaign` stores dry runs at the
      pinned effort.
  - **Specification:** requirements 1.27 (REQ-RUN-16, REQ-RUN-08, REQ-RUN-09) and its change log. method.md:
    `{#auxiliary-models}` is corrected (it said the token counts were the run's model's only), and `{#agent-effort}`
    is new.
  - `--effort` under `--resume` is not measured here: no real agent ran. task-070's consented real run passes it and
    records the result.
- Review round 1 fixes:
  1. **Step tokens on one real session.** The @F2.4 "answers a question" test and W2's step 01 replay the spike's
     real pair, `question.jsonl` then `resumed.jsonl`. They now assert 20 858 + 289 720 tokens, its two invocations'
     work. The replays of two unrelated recordings (@F2.4 approval, W2 step 02) keep the rule's figure, with a
     comment saying so.
  2. **Schema tests:** every level and `none` accepted, `ultra` refused naming the model, and a file without effort
     still valid as a record.
  3. **`{#agent-effort}`** says the pin is v0.2's and that v0.1 pinned none.
  4. **Nits:**
     - the unpriced format is unified as `<model> (<basis>)`;
     - `mcp` is renamed `perInvocation`;
     - the `effortRefusal` doc is corrected;
     - the dry run refuses a missing effort before the spending flag, as `campaign run` does;
     - a runner test follows `costBasis` into `run.json`.
- The first full `test:docker` run (before these fixes) failed W2 on step 02's artificial pair. It is the review's
  point 1.
