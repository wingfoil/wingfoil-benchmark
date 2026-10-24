---
id: task-102-codex-models-spike-prices-and-the-codex-baseline-campaign-files
type: task
title: "Codex models spike, prices and the Codex baseline campaign files"
status: in-progress
release: v0.3
wave: W15
features: []
acceptance: []
requirements: [REQ-ARC-04, REQ-RUN-09, REQ-RUN-13, REQ-RUN-15, REQ-NFR-01]
fixes: []
tags: ["codex","spike","v0.3"]
---

## Context

[dl-022](../decision-log/dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)'s
Codex campaign, arm A: the baseline arm on S1, S2, S3 and S8 at 1.0 (the baseline's digest `964b1354526c`), Codex CLI
0.162.1 on Sol, Terra and Luna at one reasoning effort, on the maintainer's ChatGPT Plus subscription, which ends on
**2026-11-13**. W15 of [plan-005](../../plans/plan-005-release-v0-3.md), after task-101 and after
[dl-024](../decision-log/dl-024-the-codex-campaign-s-subscription-credential-on-dl-019-s-model.md) (the credential) is
approved. A spike: no feature, no acceptance scenario.

**The pending → backlog approval of this task is the consent for its real sessions:** one Codex session per model (3),
each on S3's first step, from the main checkout, under dl-024. The dry runs and the campaign are consented separately
in `campaign-cycle`.

**Done** means: the three models' ids, effort levels and quota indicator verified; their list prices in the price
table; dl-024's code bounds in place; `campaigns/codex-baseline.yaml` and its dry-run profile, validating.

## Acceptance criteria

1. Terra's and Luna's model ids under Codex 0.162.1, the reasoning effort accepted by all three, and how the Plus
   quota shows in Codex's output, each read from one real session and recorded in the Execution notes. **Spike.**
2. Their list prices in `src/agents/openai-prices.ts`, with the source and the date read. **Red-first** (the price
   table's tests).
3. dl-024's bounds enforced: a Codex run past 2026-11-13 or from a campaign outside its scope refused; the adapter's
   thread map cleared at the end of each run; `CODEX_HOME`'s sqlite stores cleared before every step. **Red-first.**
4. A failed or killed Codex invocation recorded at its bound, not as zero
   ([bug-032](../bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md), the Codex case), checked
   offline from fixtures. **Red-first.**
5. `campaigns/codex-baseline.yaml` extending `baseline-across-agents` (or, with dl-022's fallback, a whole file) with
   `agent: codex`, the three models and S1–S8 at 1.0, and its dry-run profile; both pass `bench campaign validate`
   and `estimate`. **Characterization.**

## Design

- **The phases**, as task-094's (`spikes/task-094/probe.sh` is the model):
  - **Free, no session:** Codex 0.162.1's model presets and effort levels read from its released source; Terra's and
    Luna's list prices read from OpenAI's pricing page; both recorded with their source and the date read. If a
    model is not offered to Codex 0.162.1, or has no list price, the task stops and asks.
  - **Offline code** (criteria 2–5), reviewed by an independent agent before any real session, one round at a time
    under dl-020.
  - **The three real sessions** (the consent of this task's pending → backlog approval): `spikes/task-102/probe.sh`
    runs S3@1.0 step 1 in the baseline arm, outside the runner, once per model (Sol, Terra, Luna) at the effort F1
    reads, `step_time_s` 1800 s. **Spending: 0 €** (the Plus quota); API-equivalent expected well under 1 USD a
    session, recorded and flagged `price-table`. A failed session is not repeated without new consent. The secret scan
    after each session. One line of `docs/calibration/v0.3-ledger.md` each.
  - The approver logs in by hand first (dl-024, dl-019 bound 3): `CODEX_HOME=$HOME/.codex-bench`, `codex login
    --device-auth`, `cli_auth_credentials_store = "file"`. The session names the path only.
- **dl-024's bounds in code:**
  - `bench campaign run` and `bench scenario dry-run` refuse `agent.name: codex` after **2026-11-13** (the clock
    injected, so that the test is not dated), and a Codex campaign that does not extend
    `presets/baseline-across-agents.yaml` (dl-022's fallback, a whole file, would need the approver's word and an
    amendment of dl-024 first); a Codex dry-run profile must hold the baseline arm only.
  - The agent port gains an optional `endRun()`, called by the runner after each run; the Codex adapter clears its
    thread map there.
  - `CODEX_HOME`'s stores are already emptied before every step but `auth.json` and `config.toml`
    (`src/agents/profile.ts`, task-094): characterization.
- **A failed Codex invocation's cost** ([bug-032](../bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md),
  its Codex case): when the stream holds no `turn.completed`, the adapter says its usage is not reported, and the
  runner counts the step at its bound, as it does a killed one (`cost_reported: false`). bug-032's other cases stay
  with W16.
- **The campaign files:** `campaigns/codex-baseline.yaml` extends `presets/baseline-across-agents.yaml` with `agent:
  codex` (the version and effort F1 pins), `models` (Sol by default, Terra and Luna as slices over every scenario of
  the baseline arm, so that one execution holds the three) and the budget in API-equivalent euro; its dry-run profile
  `campaigns/codex-baseline.dry-run.yaml`, written whole (task-101: profiles do not extend presets).
- **Requirements 1.35:** REQ-NFR-01's exception restated for dl-024's scope; the Codex refusals (REQ-RUN-15);
  `endRun` (REQ-ARC-04); the failed invocation's bound (REQ-RUN-09).

## Execution notes

- `npm run -s wingfoil -- memory add --type task --title "…" --tags "…"` on main, at v0.3's release-planning
  (2026-10-24). Declared: the element from the template in `draft`, one commit. Observed: as declared.
- The body committed by hand (`e7a5e1e2`), then `memory submit` (draft → pending). Declared and observed: one commit,
  `status: pending`.
- The approver's pending → backlog in chat (2026-10-24). `memory submit` (backlog → in-progress, `e8805f6b`) on main, after
  the Design. Declared and observed: one commit each.
- **The free phase (2026-10-24, no session, no credential)**, in the main checkout's ignored `spikes/task-102/out/f1/`:
  - `@openai/codex` `latest` is **0.164.0** (2026-10-23); dl-022 pins 0.162.1, task-094's, which is kept.
  - Codex's `models.json` at `rust-v0.162.1` (task-094's copy) and `rust-v0.164.0` lists the same models on the Plus
    plan, and **no generation-6 Terra**: Sol as `gpt-6.1-sol`, `gpt-6-sol`, `gpt-5.6-sol`; Terra only as
    `gpt-5.6-terra`; Luna as `gpt-6-luna`, `gpt-5.6-luna`; `gpt-6-astra` beside them. The Design's stop: asked.
    **The approver's choice in chat: option A**, the latest of each name, `gpt-6.1-sol`, `gpt-5.6-terra`,
    `gpt-6-luna`, at `medium` (every one offers it; Luna has no `ultra`).
  - Their list prices from OpenAI's pricing page, Standard tier, short context, read from the page's raw data
    (`pricing.html`): Terra 2 / 0.2 cached / 2.5 write / 12 output, Luna 0.1 / 0.01 / 0.125 / 0.5 USD per million
    tokens; Sol unchanged. WebFetch's summary gave the same figures, but Terra's row is only in the page's data, so the
    raw extract is the source (`sources.txt`).
- **Build** (on `task/task-102`): requirements 1.35 (`8b541d7a`); red (`d59f1c1e`); code
  (`0186ed6c`: prices, `costUnknown`, `endRun`, dl-024's scope); the campaign files and their test
  (`3361fec1`); the probe (`spikes/task-102/probe.sh`), rehearsed with a stub for one model, then for three after review round 1, and
  with a planted value, which the scan found.
- **Tests changed with the code, disclosed:** `test/unit/cli/codex-credential.test.ts`'s Codex campaign run now
  extends the preset, since dl-024 refuses one that does not; `test/unit/agents/codex.test.ts`'s characterization of
  a session failed after a `turn.completed` used `failed.jsonl`, which has none: rewritten on an inline stream before
  the code commit; `codex-baseline.test.ts`'s model list deduplicated when the slices were split (review round 1).
- **Criterion 5:** both campaign files pass `bench campaign validate`; `estimate` refuses the campaign until its dry
  runs exist (11 of 12 keys have none; S3 on Sol is task-094's), as it should before the dry runs.

### Review

Under dl-020; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, the offline work `git diff main...HEAD`, before any session):
  - **blocker:** the probe overwrote its EXIT trap per session, leaving earlier sessions' containers running with the
    credential mounted. Fixed: each session's container is removed at its end, and an exit handler removes every
    container started (`8f64396a`); the three-model rehearsal leaves none.
  - **should-fix:** the edited Codex test and `test/docker/codex.test.ts` were dated and the docker one refused by
    dl-024; the scope check had no test where it is wired; Terra's and Luna's slices ran S1 once against Sol's three;
    a quota stop with no `turn.completed` counted as zero; `endRun`'s `finally` path untested. Fixed: the clock moved
    to `Io.now` and injected in both tests, the docker test extends the preset; three CLI tests with an injected
    clock (date, preset, profile), each building nothing; the slices split (S1 × 3, the others × 1); `costUnknown` for
    any outcome with no `turn.completed`, the runner keeping the stop and counting the bound; a test that `endRun` is
    called on a failed run. **Not fixed, stated:** no port double makes `executeRun` itself throw (a failing
    container, git or agent is a failed run; a failing `list` throws before any run), so the `finally` stays
    defensive and untested. Red `9d00bee8`, fix `8f64396a`.
  - **nits, fixed:** a Codex dry run must read `campaigns/codex-baseline.dry-run.yaml`; REQ-NFR-01 1.35 states "the
    campaign's last run or 2026-11-13, whichever comes first" and the main checkout, which the probe now checks; the
    probe's final scan uses every session's values, scans the workspaces' git history, and `secrets()` no longer
    quotes a malformed file; criterion 5's wording above. **Stated for the approver:** a Codex invocation refused at
    once (a model id or a login refused) now counts at its bound, about 5 € API-equivalent a run, capped by
    `fail_fast` at three runs.
