---
id: rel-v0-2
type: release
title: "v0.2"
status: released
version: v0.2
waves: [W12, W13, W14]
features: [F7.4, F7.1, F7.2, F5.2, F5.7, F1.4]
---

## Goal

**Competitors.** Spec Kit and OpenSpec arms run under the same rules as WingFoil, after published eligibility
criteria admit them. A second public campaign is compared with v0.1's, and a setup can be contested. Readers can
filter results and link to them permanently.

It serves Avery, Dana and the Maintainer ([07_sequencer.md](../../01_vision/07_sequencer.md) 1.1, "Releases at a
glance").

The reference campaign runs the v0.1 scenarios (S1, S2, S3, S8) in every arm. Each harness is pinned to its latest
release at the time of the campaign. Its shape, models and budget are set at calibration (dl-007, dl-012, triaged
below). A first sizing, Sonnet only, seven arms (a docs control per harness, decided at triage), v0.1's repetitions: about 42
runs, roughly 75–85 €
([plan-004](../../plans/plan-004-release-v0-2.md)).

Categories covered: C, D, E and F, as in v0.1. A, B and G remain not covered (v0.3).

## Scope

Waves and features from [07_sequencer.md](../../01_vision/07_sequencer.md) 1.1. Execution plan:
[plan-004](../../plans/plan-004-release-v0-2.md). The specification of the new features amends `docs/02_specification/`
in this release-planning phase (`release-cycle` › release-planning).

| Wave | Features | High unc. | Ends with | Verified |
|---|---|---|---|---|
| W12 — Eligibility and Spec Kit | F7.4 eligibility criteria · F7.1 Spec Kit arm | F7.1 (headless use of Spec Kit's gates) | Spec Kit runs S1–S3 and S8 under the same rules | **2026-10-07** |
| W13 — OpenSpec and contests | F7.1 OpenSpec arm · F7.2 setup contest process | — | OpenSpec runs, and a setup can be contested | **2026-10-10** |
| W14 — Comparison and Dana | F5.2 campaign comparison · F5.7 profile filter and stable URLs · F1.4 resumable campaign | — | a second public campaign compared with the first |**2026-10-13** |

### Triage of what v0.1 left

**Decided by the approver in chat on 2026-10-05: "triage come proposto".** Each approval was run by the agent at the
approver's request, with a reason saying so:

- **approved:** dl-011 `8488c61`, dl-014 `63c41d4`, dl-009 `9c405e3`, dl-007 `e09918a`, dl-008 `76a45aa`, dl-012
  `4b53a08`, dl-010 `42b05a0`;
- **bugs accepted for fixing:** bug-014 `c2682ac`, bug-015 `6743518`, bug-012 `abc441c`, bug-013 `62645b4`;
- **already approved since v0.1:** bug-005; its fix is planned in W12;
- **deferred to v0.3:** dl-013, left `pending` and carried to rel-v0-3. A reject would have sent it back to `draft`,
  which says something else.

The tables below are the proposal as approved.

**1. Process, before delivery starts** (tasks at the head of W12):

| Element | Proposal | Lands in |
|---|---|---|
| [dl-011](../decision-log/dl-011-an-independent-review-for-every-task-in-kanban-delivery.md) independent review for every task | **approve B**: written into `kanban-delivery` (version 3) | a task, first of W12 |
| [dl-014](../decision-log/dl-014-process-safeguards-for-a-repository-worked-by-several-sessions.md) multi-session safeguards | **approve B**: a benchmark directive | a task, W12 |
| [bug-005](../bug/bug-005-a-bug-cannot-name-the-task-that-fixes-it-and-never-closes.md) a bug never closes | **fix**: a `fixed` state and a `fixes` field for the bug type in `memory.yaml`; then the ten fixed bugs moved to it | a task, W12 |
| [dl-009](../decision-log/dl-009-benchmark-findings-linked-to-wingfoil-both-ways-and-verified-by-the-next-campaign.md) findings linked both ways | **approve B** (already applied to dl-147); C reconsidered with more findings | no task |

**2. Scope and budget** (decided now, measured at calibration):

| Element | Proposal | Lands in |
|---|---|---|
| [dl-007](../decision-log/dl-007-claude-5-5-models-for-the-v0-2-campaign.md) Claude 5.5 models, bridge, ladder | **approve B + E, conditional on calibration**: Sonnet 5.5 default with a v0.1 bridge slice; the Haiku 4.5 rung (Haiku 5.5 since dl-018) of the ladder; fall back to C if 5.5 does not fit. A spike first checks the agent pin against the 5.5 models | a spike in W12; calibration |
| [dl-008](../decision-log/dl-008-model-configurations-and-the-cost-quality-frontier.md) model configurations, frontier | **approve C as direction**: the ladder now (through dl-007 E); routing and `baseline-mixed` deferred until WingFoil's routing is designed | the site's frontier view: a task in W14 if the ladder runs |
| [dl-012](../decision-log/dl-012-budget-and-estimate-rebased-on-v0-1-s-measurements.md) budget, estimate, repetitions, partial re-runs | **approve C**: K4 and §6 amended; the estimate with a margin; a campaign-wide ceiling; a minimum *n*; partial re-runs as part of F1.4 | an amendment in this phase; estimate and guard tasks in W14 with F1.4 |
| [dl-010](../decision-log/dl-010-validation-exercises-every-arm-the-largest-step-and-the-harness-environment.md) validation in every arm | **approve B**: `release-cycle` validation amended (version 3) | a task, W12 |
| [dl-013](../decision-log/dl-013-saturation-levels-of-delegation-and-an-external-neutral-control.md) saturation, delegation, external control | **defer to v0.3** (broader categories, new scenarios): v0.2 adds no scenario | rel-v0-3 |

**3. Bugs that become tasks:**

| Element | Proposal | Lands in |
|---|---|---|
| [bug-014](../bug/bug-014-a-campaign-does-not-preflight-the-environment-its-harness-needs.md) no preflight | **fix**: every new arm adds environment needs | W12 |
| [bug-015](../bug/bug-015-dry-run-and-scoring-images-accumulate-on-the-host.md) images accumulate | **fix**: more arms, more images | W12 |
| [bug-012](../bug/bug-012-a-step-s-tokens-leave-out-the-models-claude-code-calls-for-its-own-work.md) auxiliary-model tokens | **fix before calibration**: tokens summed over `modelUsage`; REQ-RUN-09 amended; comparisons across campaigns read tokens | W13 |
| [bug-013](../bug/bug-013-a-running-campaign-cannot-be-stopped-cleanly-and-keeps-spending-after-systematic-failures.md) no stop, no fail-fast | **fix with F1.4** (resumable campaign): a clean stop, a fail-fast rule, a resume without repeating completed runs | W14 |

**4. The approver's answers (2026-10-05):**

- **A docs control per competitor (T3): yes.** Each harness arm gets its own docs control, generated from that arm's
  configuration as baseline-docs is from wingfoil's. "More context, not the harness" is then controlled per harness.
  The arms become seven: baseline, then wingfoil, Spec Kit and OpenSpec, each with its docs control. The first sizing
  grows to about 42 runs, roughly 75–85 € before slices, to be replaced by calibration. The generator, the arms'
  names and parity rules are part of this phase's specification.
- **The Spec Kit arm follows its process through its skills (option 1),** started by the runner like every arm.
  When WingFoil has its workflow engine, the engine-led option (2) is taken up for both tools, so that two
  engine-led harnesses are compared under the same new runner rules.
- **WingFoil for the campaign:** not changed, so the default stands, the latest WingFoil release at the campaign.

The questions as they were put:

- **A docs control per competitor (T3)?** v0.1's baseline-docs is generated from the wingfoil arm's configuration.
  Either one docs control stays (cheaper), or each competitor gets its own (fairer: "more context" is controlled per
  harness, but the run count grows).
- **How the Spec Kit arm follows its process?** The competitor re-verification of 2026-10-05
  ([X_competitor-landscape-2026-10-05.md](../../01_vision/X_competitor-landscape-2026-10-05.md)) found that Spec Kit's
  workflow engine (`specify workflow run`) spawns `claude -p --model …` itself. Two options:
  - (1) the agent follows Spec Kit's skills, started by the runner as in every arm. This keeps the metering, the caps
    and the neutral approver as they are, and is proposed for v0.2;
  - (2) Spec Kit's engine orchestrates the agent: the "harness launches the agent" arm of calibration §7 and dl-008,
    which needs new runner rules.
- **Which WingFoil for the campaign?** The latest release at the campaign. If WingFoil's workflow engine is released
  before v0.2's calibration, H1–H5 are tested. Otherwise the campaign runs v0.2.2 again, and H1–H5 wait.

**5. Found during W12** (approved by the approver on 2026-10-06, after task-062's spike):

| Element | Decision | Lands in |
|---|---|---|
| [dl-015](../decision-log/dl-015-the-effort-the-agent-sends-is-pinned-per-model-by-the-campaign.md) effort pinned per model | **approved, option C** (`662418a`) | **W13**, before calibration (the approver in chat, 2026-10-06: "dl-015 in W13") |
| [bug-016](../bug/bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price.md) a cost the agent cannot price is trusted | **approved as a defect** (`231524f`) | to place at W13's plan phase, beside dl-015 (both read `modelUsage` and the agent pin) |

task-062 also recommends pinning Claude Code **2.1.291 or later** for v0.2 (2.1.280 misprices Sonnet 5.5): an input
for calibration's re-pin.

**6. Before calibration** (approved by the approver on 2026-10-14):

| Element | Decision | Lands in |
|---|---|---|
| [dl-017](../decision-log/dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md) WingFoil v0.3 for the reference campaign, a bridge on v0.2.2, v0.1's repetitions | **approved, option D** (`5d7f35b`): widens dl-007's bridge slice to v0.1's whole configuration; makes precise the answer of 2026-10-05 on WingFoil for the campaign; v0.2.2 if v0.3 is not released by 2026-10-31, then no bridge | task-090 (experiment design 1.3 §6, plan-004 steps 3 and 5); a task admitting v0.3 before calibration |
| [dl-018](../decision-log/dl-018-sonnet-5-5-s-cache-reads-at-half-dl-007-s-price-and-haiku-5-5-beside-the-haiku-4-5-rung.md) Sonnet 5.5's cache-read price, Haiku 5.5, the effort | **approved, option B with `medium` effort** (`cb84b61`): dl-007's price table corrected; the weak-model rung on Haiku 5.5; Sonnet 5.5, Opus 5.5 and Haiku 5.5 at `medium` | the calibration task |

[task-093](../task/task-093-the-agent-pin-for-v0-2-checked-on-the-three-models-spike.md)'s spike recommends Claude
Code **2.1.300** as v0.2's agent pin (0.3881 USD, three ledger lines).

**Calibration waits for WingFoil v0.3** (the approver in chat, 2026-10-14): no tag after v0.2.2 on that day, so
calibration starts once v0.3 is released and admitted, or on 2026-10-31 with v0.2.2 and no bridge (dl-017).

**Smaller items** left by v0.1's Retrospective are triaged with the W12–W14 task plans; v0.2's wingfoil arm manual
is reviewed against WingFoil's `docs/agents.md` at the pinned tag (N43).

### W12 — verified 2026-10-07

**"Spec Kit runs S1–S3 and S8 under the same rules."** Verified offline, with the fake agent. The real-agent half is
task-065's spike: one consented session of S3 step 1 with Spec Kit v1.1.0, 1.4360 USD in the
[v0.2 ledger](../../calibration/v0.2-ledger.md). No further real-agent run was consented in W12; calibration (plan-004
step 3) makes the dry runs of every arm on the campaign's models.

- **By hand, on main** (`fe069c9`, the built CLI), in a temporary repository: `git archive main`, without
  `results/`.
  - The fake agent replays the public references of S1, S3 and S8 (`test/fixtures/reference/`) and S2's (the
    hold-out's `reference/S2/`).
  - WingFoil v0.2.2 is built from the clone. Spec Kit v1.1.0 (`f1d3a4f8`) is built as its bundle.
  - The dry-run profile, in the temporary repository only, pins the fake agent and both harnesses.
- **Validation:**
  - `bench scenario validate` → S1@1.0, S2@1.0, S3@1.0 and S8@1.0 valid with the hold-out.
  - `bench campaign validate` → `campaign 5d29758156e9 is valid (4 scenarios, 5 arms)`: baseline, baseline-docs,
    wingfoil, speckit and speckit-docs.
  - Preflight: `requires` lines for the fake script and the two harness clones, all set.
- **The runs:**
  - The first `campaign run` refused to start: `estimate: not available, 20 dry runs missing`, naming each.
  - 20 dry runs (4 scenarios × 5 arms), each `exit 0`.
  - `bench campaign run` → `20 runs completed, 0 failed`, cost 0.0000 USD.
- **`bench score 5d29758156e9/1 --holdout …`** → exit 0, `aggregate.json (20 groups, 0 slices)`. Each scenario
  scores the same in all five arms, the reference's result:
  - S1: final 165/165, hold-out 48/48;
  - S2: final 24/24, hold-out 17/17, checks 3/3;
  - S3: final 37/37, hold-out 17/17, checks 1/1, M-F1 5/5;
  - S8: final 23/23, hold-out 7/7, checks 16/16.
- **The same rules (K3, REQ-FMT-14, REQ-RUN-11).** On S8, each arm's setup patch carries the scenario's four rules
  R1–R4 in its own format:
  - baseline: nothing;
  - wingfoil: the directive files;
  - speckit: `.specify/memory/constitution.md`, whose principles are R1–R4;
  - baseline-docs and speckit-docs: `PROJECT_RULES.md`, which carries R1–R4 in both.
  - Each docs control's `generated_sha256` equals its `generated/S8@1.0/<arm>/PROJECT_RULES.md`.
  - The speckit runs record `harness` (v1.1.0, commit, tarball and artifact digests), `arm_digest` and
    `telemetry_off: []`.
- **The site:**
  - `bench site build 5d29758156e9/1` → 21 pages, with the five manuals and the two setup pages
    (`setup-wingfoil.html`, `setup-speckit.html`).
  - The headline compares speckit and both controls with the baseline.
  - No `bench-` container is left.
- **Suites at task-067's merge:**
  - `npm test` 1340/1340 (coverage 97.95 %), lint clean;
  - `test:bin` 8/8;
  - `test:docker` 21/21, Spec Kit's included.
- **What the fake cannot show:** it replays the same commands in every arm, so every arm scores the reference. Whether
  Spec Kit's process is followed headless on S1–S3 and S8, and what it costs, is calibration's (task-065 saw it on S3
  step 1).

| Task | Feature | Delivered |
|---|---|---|
| task-056 … task-067 | F7.4 · F7.1 (Spec Kit) | the eligibility register and page; the speckit arm, its bundle and its constitution generator; arm digests and telemetry settings; preflight; image prune; bug fixes from v0.1's triage; a docs control per harness and the setup pages |

**Left for later waves:**

- bug-017 (approved): the image prune fails when a container disappears between `docker ps` and `docker inspect`.
  Found by task-067's docker run.
- task-068 (W13 backlog): each harness compared with its own docs control (REQ-SCO-14, REQ-RES-03).
- task-067 review point B, for the task that delivers F7.2 (REQ-RES-10).
  - A rebuild is refused once a ran harness arm's files differ from its recorded `arm_digest`.
  - The contested execution must stay buildable after its arm is corrected: read the arm at its recorded state, or
    leave its pages out. The approver chooses.

### W13 — verified 2026-10-10

**"OpenSpec runs, and a setup can be contested."** Verified offline, with the fake agent. The real-agent half is
task-070's spike, one consented session of S3 step 1 and its resume with OpenSpec 1.14.0, 0.7651 USD in the
[v0.2 ledger](../../calibration/v0.2-ledger.md). No further real-agent run was consented in W13. The run was niced,
on the approver's go.

- **By hand, on main** (`0b6f2f3`, the built CLI), in a temporary repository from `git archive main`:
  - the fake agent replays the references of S1, S3 and S8 and the hold-out's S2;
  - OpenSpec 1.14.0 is built from the npm registry;
  - the dry-run profile, in the temporary repository only, pins the fake agent and OpenSpec.
- **Validation:** S1@1.0, S2@1.0, S3@1.0 and S8@1.0 valid with the hold-out. `campaign 6ac40187f98a is valid
  (4 scenarios, 3 arms)`: baseline, openspec and openspec-docs.
- **The runs:**
  - 12 dry runs (4 scenarios × 3 arms), each `exit 0`;
  - `bench campaign run`: `12 runs completed, 0 failed`.
  - The openspec runs record:
    - `harness` `{tool: openspec, version: 1.14.0}`, its commit the npm tarball's SHA-256 (task-071);
    - `telemetry_off: [OPENSPEC_TELEMETRY=0]`;
    - a `generated_sha256`.
- **`bench score 6ac40187f98a/1 --holdout …`:** exit 0, 12 groups. openspec and openspec-docs score each scenario as
  the reference does:
  - S1 final 165/165, hold-out 48/48;
  - S2 final 24/24, hold-out 17/17, checks 3/3;
  - S3 final 37/37, hold-out 17/17, checks 1/1, M-F1 5/5;
  - S8 final 23/23, hold-out 7/7, checks 16/16.
- **The same rules on S8:** the setup patch of each arm carries them in its own place: baseline nothing, openspec
  `openspec/config.yaml`, openspec-docs `PROJECT_RULES.md`.
- **The site:** `bench site build 6ac40187f98a/1` gives 18 pages: three manuals, the openspec setup page, and the
  setup page's "Contest this setup" link to `…/issues/new?template=contest-setup.yml`.
- **A setup contested** (task-073):
  - the temporary repository was committed as it ran, then `arms/openspec/setup.sh` was corrected and committed;
  - `site-content/contests.yaml` was given an accepted contest of `6ac40187f98a`'s openspec arm, followed by
    `fedcba987654/1`;
  - the rebuild succeeded. The setup page shows the setup as it ran, read from commit `6fa56d1728be` (the corrected
    line absent), and links the contest's issue. The campaign that followed is named, not linked: this repository
    holds no results of it.
- **Suites:** every W13 task's full suites were green before its approval (kanban-delivery version 5 from task-075).
  task-073's had one load timeout (@F5.5), which passed when run alone.
- **What the fake cannot show:** whether OpenSpec's process is followed headless on S1–S3 and S8, and what it costs.
  That is calibration's: task-070 saw propose, then a partial apply, on S3 step 1.

| Task | Feature | Delivered |
|---|---|---|
| task-068 | (F7.1, T3) | each harness against its own docs control, in the aggregate and on the category pages |
| task-069 | — | dl-015 (effort pinned per model), bug-012 (every model's tokens), bug-016 (an unpriced cost flagged) |
| task-070 | — | the OpenSpec spike (one consented session and its resume) |
| task-071 | F7.1 | OpenSpec built from the npm registry, the openspec arm, its rules in `config.yaml` |
| task-072 | F7.1 | the openspec-docs control, byte-identical to speckit-docs for the same rules |
| task-073 | F7.2 | the contest form, `contests.yaml`, the arm and manuals read as they ran |
| task-074 | — | bug-017 (the prune tolerates a container removed meanwhile) |
| task-075 | — | kanban-delivery version 5 (dl-016): the full suites, on demand, gate approval; `scripts/full-suites.sh`; bug-018 |

Decisions taken during W13:

- dl-016 (option B), with the approver's later choice of on-demand runs over a nightly cron (2026-10-09);
- the approver's choices for task-070 (the resume counted in the consented run) and task-073 (point B: the arm read
  as it ran);
- requirements 1.27 (REQ-RUN-08, -09, -16), 1.28 (REQ-FMT-12) and 1.29 (REQ-RES-10, REQ-RES-02).

Bugs: bug-012, bug-016, bug-017 and bug-018 fixed. Spending: 2.4124 USD in all so far.

**Seen during W13, for later:** acceptance tests time out under other sessions' load (@F4.8 fixed by bug-018;
@F5.5 once). If it recurs, a bug should raise the slow acceptance tests' limits.

### W14 — verified 2026-10-13

**"A second public campaign compared with the first."** Verified offline, with the fake agent: a second execution of
one campaign compared with the first, as for W12 and W13. The second real campaign is plan-004's campaign step
(`campaign-002`, compared with v0.1's `c82a5e74885b/2`), not W14's. No real-agent run was made in W14.

- **By hand, on main** (`7d07542`, the built CLI), in a temporary repository from `git archive main`, without
  `results/`:
  - the fake agent replays the public references of S1, S3 and S8 (`test/fixtures/reference/`);
  - WingFoil v0.2.2 is built from the clone;
  - the dry-run profile and a campaign of S1, S3 and S8 in baseline, baseline-docs and wingfoil, in the temporary
    repository only, pin the fake agent and WingFoil.
- **Validation:** S1@1.0, S3@1.0 and S8@1.0 valid with the hold-out; `campaign a8ff006d2102 is valid (3 scenarios,
  3 arms)`. 9 dry runs (3 scenarios × 3 arms), each `exit 0`.
- **A campaign stopped and resumed (F1.4, bug-013):**
  - execution 1 was interrupted with SIGINT after three runs: `interrupt: stopping after the current step's agent is
    killed`, then `3 runs completed, 0 failed, 1 interrupted`, `campaign ended: interrupted`, exit 1;
  - `execution.json` recorded `state: stopped`, `reason: interrupt` and the run it stopped in;
  - the estimate and the guard were printed before it ran: `budget guard: 0.0000 + 0.0000 = 0.0000 EUR (warn 1 EUR,
    ceiling 2 EUR)`;
  - `bench campaign run … --resume a8ff006d2102/1` → `resume: 6 runs to run (1 interrupted, 5 never started), 3 runs
    kept (3 completed)`, then `6 runs completed, 0 failed`, exit 0;
  - `execution.json` is `completed`, with one `resumed` time. The interrupted run's first attempt is in `attempts/1/`
    and its `run.json` records `attempts: 2`.
- **The second execution:** `bench campaign run` → execution 2, `9 runs completed, 0 failed`.
- **`bench score a8ff006d2102/<n> --final --holdout …`**, for both: exit 0, 9 groups, `n = 1 in 9`. Every arm scores
  the reference's result:
  - S1 final 165/165, hold-out 48/48;
  - S3 final 37/37, hold-out 17/17, checks 1/1, M-F1 5/5;
  - S8 final 23/23, hold-out 7/7, checks 16/16.
- **The comparison (F5.2):** `bench campaign compare a8ff006d2102/1 a8ff006d2102/2` → exit 0,
  `results/comparisons/a8ff006d2102-2/a8ff006d2102-1.json (9 groups matched, 8 rows with a change, 0 rows without,
  0 groups not compared)`. No pins differ and nothing is only in one execution. Each row compares the two arms'
  deltas against their own baseline, each side `n = 1 / 1 preliminary`, the change ±0.
- **The site (F5.7):** `bench site build a8ff006d2102/2` → 18 pages:
  - the headline marks every comparison preliminary (`preliminary: n < 3 in C, E and F`);
  - the landing page links `compare-a8ff006d2102-1.html`, which carries the rows above;
  - six profile pages (`profile-<id>.html`, from `site-content/profiles.yaml`) are linked from the landing page;
  - the root `site/index.html` lists `campaign a8ff006d2102, execution 2`, ended 2026-10-13.
  - No `bench-` container is left.
- **Suites:** every W14 task's full suites were green on the commit offered for approval. task-085's were red at
  `test:bin` (the page count) once: rejected, fixed, green on resubmission.
- **What the fake cannot show:** it replays the same commands in every execution, so every change is ±0. A real
  comparison, with differing pins and a resumed paid campaign, is the campaign step's.

| Task | Feature | Delivered |
|---|---|---|
| task-076 … task-078, task-087 | — | the WingFoil feedback inbox, versioned with one file per note and a ledger (dl-163), its source key svc-020; the `wingfoil-cli` directive |
| task-079 | F1.4 | a clean stop on an interrupt, `execution.json`, `fail_fast` (bug-013, first half) |
| task-080 | F1.4 | a resume without repeating completed runs, attempts kept, `score --final` (bug-013, second half) |
| task-081 | F1.4 (dl-012) | the estimate as a range with a margin; the ceiling covers every execution |
| task-082 | F5.2 (dl-012) | preliminary below *n* = 3; the harness version beside every value |
| task-083 | F5.2 | `bench campaign compare`, each arm's delta against its own baseline |
| task-084 | F5.2 | the comparison page, linked from the landing page |
| task-085 | F5.7 | profile pages, stable URLs, the root index; publish keeps what gh-pages has |
| task-086 | — (N43) | the wingfoil arm manual reviewed against WingFoil's guide for AI agents (v0.2.2) |

Decisions taken during W14:

- a bug fixed in halves is due `fixed` once every task that lists it in `fixes` is done (the approver's option A,
  task-080);
- task-086: the manual keeps v0.1's reads, declared as a departure from WingFoil's guide (the approver's option C).

Bugs: bug-013 fixed. Spending: none in W14; 2.4124 USD in all so far.

**Left for later:**

- REQ-RES-04's wording still speaks of "the root page of the execution it leads to" (task-085's notes): an amendment
  for the approver.
- The feedback inbox's citation form, with the full service id and full sha, as WFCoord asked (2026-10-11): a bug and a
  task right after this record.

## Release checklist

- [x] release-planning: scope approved (planning → in-development, `5f68d97`, 2026-10-05); triage recorded
  (`c304315`); specification approved and merged (`149745f`: experiment design 1.2, requirements 1.26, acceptance 1.1,
  traceability 1.4, after three independent reviews); W12 tasks task-056 to task-067 in the backlog (plan:
  [plan-004](../../plans/plan-004-release-v0-2.md))
- [x] delivery: W12–W14 done, every wave's "Ends with" verified (W12 2026-10-07, W13 2026-10-10, W14
  2026-10-13: `894ee03`); task-056 to task-088 done; the approver's go in chat, 2026-10-14
- [x] calibration: dry runs in every arm, budget revised (`docs/calibration/v0.2.md`): task-096 done (`c57d0f48`), 45
  dry runs, 23.55 USD; the revised budget approved in chat on 2026-10-21 (65 € for both campaigns); bug-023, bug-024
  fixed
- [x] validation: acceptance green on the fake agent, coverage > 80 %, lint clean, the real-agent validation dl-010
  decides: task-097 done, the full suites green on `6bdd4518` (97.57 % statements), S1@1.0 once in the seven arms and
  the bridge's two (`da13d57a65b5/1`, `27f0119be0ff/1`), 4.90 USD
- [x] campaign: reference campaign published and compared with v0.1: campaign-002 (`81ebb2691f9c/1`, 49 runs,
  24.31 €) and the bridge campaign-003 (`bf3a1ac7dff5/1`, 18 runs, 6.86 €), both from `bf60bc1f`, scored, reviewed and
  published; the comparisons `c82a5e74885b/2` → bridge → campaign-002; findings on S1's M-K1 (dl-147's verification)
  and S3's M-F1
- [x] publishing: site published (`gh-pages` `fbd5e8e0`: the three executions), transcripts and harness artifacts
  attached (releases `81ebb2691f9c-1`, `bf3a1ac7dff5-1`), release notes `docs/releases/v0.2.md`, tag `v0.2` on the
  releasing commit
- [ ] retrospective: section below written; WingFoil usage notes handed to the approver

## Retrospective

Written on 2026-10-24, at plan-004 step 7 (`release-cycle` › `retrospective`), after the release was approved
(`f7e412cf`). Inputs:

- three read-only agents mined the Execution notes, Review notes and Approval notes of the 42 tasks; the
  calibration report, the ledger and the two campaigns; and every bug, decision-log and the git history
  `v0.1..v0.2`;
- the analysis of the wingfoil arm's transcripts, [calibration v0.2](../../calibration/v0.2.md) §7;
- a discussion of every defect with the approver, point by point (2026-10-22/24), whose decisions are recorded
  below;
- an analysis of the review rounds of this release, compared with the review records of WingFoil, WingFoil UI
  and WingFoil Templates.

**v0.2 in figures:**

| | |
|---|---|
| Span and history | 17 days (2026-10-05 → 2026-10-22); 1 061 commits, 48 merges |
| Work | 42 tasks (056–097), all done; waves W12–W14, calibration, validation |
| Process | 411 WingFoil transitions, 1 of them a reject (task-085); 147 commits with an `Approver:` trailer |
| Bugs and decisions | 24 bugs touched, all `fixed` with `fixed_by` and a Resolution; 13 decision-logs, all approved but dl-013 (deferred to v0.3) |
| Tests | 1 660 (1 225 at v0.1), coverage 97.6 % statements, 90.8 % branches; requirements 1.33, experiment design 1.6 |
| Review | 118 independent review rounds, 2.8 a task; 4 tasks clean at the first round |
| Real-agent spending | 68.18 USD in the [ledger](../../calibration/v0.2-ledger.md): spikes 4.78, calibration 23.55 (45 dry runs), validation 4.90, campaigns 34.95 |
| The published campaigns | `81ebb2691f9c/1` (49 runs, 24.31 € against a high estimate of 32.51 €) and the bridge `bf3a1ac7dff5/1` (18 runs, 6.86 € against 8.74 €), 67/67 completed, 31.17 € of the 65 € consented |

### What went well

1. **v0.1's lessons held.** dl-010's validation in every arm, dl-012's estimate with a margin and a campaign-wide
   ceiling, bug-014's preflight, dl-014's multi-session rules and dl-015's effort pin all worked as written. Each
   campaign landed at its estimate's low bound (+0.7 % and +4.9 %), and per run within 0.86–1.48 times its dry run.
2. **Calibration found the defects before the campaign:** bug-023 (the openspec arm wrote no code) and bug-024 (the
   expected-cost line read another arm's dry run), both fixed in task-096 before any campaign run.
3. **Spikes stayed cheap and decisive.** task-062, task-065, task-070, task-093 and task-094 spent 3.71 USD of Claude
   (and 1.07 USD API-equivalent of Codex, not billed), and each answer changed a pin or a design.
4. **Independent reviews caught real defects** in task-060, 063, 084, 085, 090, 092 and 095, among them the agent's
   token placed on `grep`'s command line (task-062).
5. **Every bug closed.** bug-005's backlog of fixed bugs still marked `approved` is gone.
6. **The bridge made the step v0.1 → v0.2 readable one cause at a time:** the model, the agent and the effort first
   (S1's wingfoil run from 3.82 € to 0.60 €, correctness within the spread), then WingFoil v0.2.2 → v0.3.0 alone.
7. **No evidence lost:** every worktree removal listed its ignored files first; the transcripts are packed as
   release assets with their harness artifacts.

### What to change

1. **The wingfoil arm did not exercise WingFoil's workflow engine.** Its manual made it a document register with a
   fixed `developer` role, read only approved decision-logs while every record stayed pending, recorded only the
   decisions the agent "takes", and asked for approval and stopped after each document (calibration v0.2 §7). The
   lookup filter was the benchmark's manual, not WingFoil's guide. The engine's own hypotheses (H1, H2, H8) could not
   be tested on 0.3.0, whose `init` scaffold does not drive the engine (WingFoil bug-400).
2. **The oracle's content checks are lexical.** D3 passed on v0.2.2 only because "unchanged" contains "changed" and
   the WingFoil template's comment contains "replace"; on v0.3.0 the revision and the duplicate were recorded in other
   words and failed. The template false positive favours the arms with templates.
3. **A published finding was wrong.** The S3 M-F1 finding read as a WingFoil regression: its D3 difference is the
   check's false positive, and its D5 gap comes from the arm's manual and was already present on v0.2.2.
4. **Metrics and labels say more than the data.** M-R2 measures the file layout, not the public interface; M-K3 is
   always 0 and M-K4 is degenerate, its "not applicable" ignoring the variance; ▲/▼ and the headline count
   differences within the variance.
5. **The runner's approval classifier v1** read an agent's account of pending documents as a second approval
   request (Opus S1, step 2).
6. **Too many review rounds.** 2.8 a task: 15 rounds opened after nit-only rounds, 40 % of later findings created by
   the previous round's fix, and about half of all findings in notes and figures rather than code. The other
   WingFoil-governed projects show the same dynamics (round 1 rarely clean; 40–89 % of later findings fix-induced),
   with a round count set by their re-review rule, their task size and their reviewer's rigour. Whether WingFoil
   itself adds rounds cannot be told: none of these projects has an ungoverned baseline.
7. **Process slips:** tests written with or after the code in nine tasks; `test:bin` skipped by the day checks
   (task-085's reject); Markdown outside the Prettier check; findings cite the v0.2.2 template (`TEMPLATE_COMMIT`);
   an interrupted dry-run step loses its spent cost.
8. **The docs controls differ in size** because the tools ship different content (baseline-docs about 800 words,
   the others a line), and the wingfoil manual is three times the others': comparable only harness against its own
   control.
9. **Triage debt:** 12 smaller items of v0.1's retrospective were never triaged, and about 20 follow-ups of v0.2 are
   left in task notes.

### Decisions taken with the approver

- **The wingfoil arm, step A (v0.3, WingFoil ≥ 0.3.1):** the session agent drives WingFoil's workflow cycle (status,
  next, the step's role, gates, finalize), with no driver script written by the benchmark (T1, T12); the setup opens
  one instance per scenario, verified first by a spike on 0.3.1; the context comes from the MCP session Resource
  (pending records included); baseline-docs gets every role's directives, labelled. Steps B (WingFoil 0.4, only with
  its headless launch) and C (1.0) are planned, not committed.
- **Configured variants (v0.3):** besides each harness as installed, each harness configured for the project, with a
  configuration written by an agent that sees only the seed and the README, in scenario versions 1.1; extra cost
  accepted, full and partial campaigns to weigh after calibration. Profiles for prototype, enterprise and critical
  projects are a later idea.
- **Oracle and metrics (v0.3):** word-boundary checks on the agent's own text plus a published human judgement;
  classifier v2; M-R2 v2; M-K3 as one-off costs and M-K4 with the variance rule; ▲/▼ only beyond the variance. The
  published v0.2 values stay, with errata.
- **Review (as soon as possible):** re-review only after a blocker or should-fix, on the fix's diff; a severity on
  every finding; a checklist after each fix; figures generated by script; tasks kept small; a pre-review script.
- **A new measurement (v0.3 if possible):** the review loop per arm, the same reviewer in every arm, baseline
  included, which is the only way to tell whether a harness adds or removes review rounds.

### Actions recorded

To file, in this order (the approver approves each decision-log and task):

| When | Kind | What |
|---|---|---|
| Now | decision-log + task | the review rule, amending [dl-011](../decision-log/dl-011-an-independent-review-for-every-task-in-kanban-delivery.md), and its changes to `kanban-delivery`, the `code-review` directive and a pre-review script (`test:bin`, Prettier on Markdown) |
| Now | task | the v0.2 errata: the S3 M-F1 finding withdrawn and annotated; calibration v0.2 §9 (H3), campaign-002, the release notes and the GitHub release corrected |
| Now | decision-log | the synchronisation plan with WingFoil, steps A, B and C, with their entry conditions |
| v0.3 | decision-log + tasks | the wingfoil arm's step A (spike on 0.3.1, admission, rewrite) |
| v0.3 | decision-log + tasks | the configured variants and scenario versions 1.1 |
| v0.3 | bugs | the lexical checks, classifier v1, M-R2, M-K3/M-K4, the ▲/▼ labels, `TEMPLATE_COMMIT`, the interrupted step's cost |
| v0.3 | feature | the review loop measured per arm, with the cross-project analysis as its evidence |
| v0.3 planning | triage | [dl-013](../decision-log/dl-013-saturation-levels-of-delegation-and-an-external-neutral-control.md), v0.1's smaller items and v0.2's follow-ups |

### WingFoil feedback inbox

`docs/wingfoil-feedback/` (WingFoil dl-163) holds F-001 to F-039, all open, none synced. This retrospective adds:

| Note | Subject |
|---|---|
| F-040 | review rounds across four WingFoil-governed projects, and a re-review rule with a severity threshold |
| F-041 | what a benchmark needs to drive `agent execute` (step B): the agent's stream and usage to the launcher, its exit status, a `--dry-run` without a terminal |
| F-042 | `directive create` writes no body and takes no title |
| F-032, F-033 | evidence from 0.3.0: no MCP call in 69 steps; context only through the CLI; the guide leaves the lookup's status to the agent |

The approved-only lookup that hid the run's own records was the benchmark's manual, not WingFoil's guide: it is
said here so that the error is not attributed to WingFoil.
