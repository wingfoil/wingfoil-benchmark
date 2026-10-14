---
id: task-090-experiment-design-1-3-and-plan-004-record-dl-017-the-bridge-on-wingfoil-v0-2-2-the-reference-campaign-on-v0-3
type: task
title: "Experiment design 1.3 and plan-004 record dl-017: the bridge on WingFoil v0.2.2, the reference campaign on v0.3"
status: in-progress
release: v0.2
wave: calibration
features: []
acceptance: []
requirements: [REQ-FMT-01, REQ-SCO-13, REQ-FMT-11]
tags: ["calibration","docs","dl-017"]
---

## Context

Records [dl-017](../decision-log/dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md)
(approved `5d7f35b`, 2026-10-14) in the documents it amends, as its Consequences ask: the experiment design's §6
(v0.2's shape), plan-004's steps 3 and 5, and rel-v0-2's record of decisions. The approver asked for it in chat on
2026-10-14, after W14's delivery was closed and before calibration (plan-004 step 3), hence **wave: calibration**.

**Requirements, the nearest ones** (no requirement changes; these are the ones the amended text must agree with):

- **REQ-FMT-01** (as amended in 1.26): dl-007's bridge is a campaign of its own, with its own file, `harnesses` and
  `arm_digests`, and calibration's budget and the spending consent cover the main campaign and the bridge together.
  dl-017 widens that bridge to v0.1's whole configuration;
- **REQ-SCO-13**: the comparison of two executions, each arm's delta against its own baseline, the differing pins
  listed. dl-017's chain `c82a5e74885b/2` → bridge → reference campaign is two such comparisons;
- **REQ-FMT-11**: a campaign pinning a tool version the eligibility register has not assessed is refused, so v0.3 is
  pinned only once admitted.

**No real agent, no spending, no code.** **Done** means: experiment design 1.3, plan-004 and rel-v0-2 merged on main,
saying what dl-017 decided, with every test that cites them green.

## Acceptance criteria

All **characterization**: this task changes text only; no behaviour is added, and no test is written first. The
tests that cite these documents stay green (see Design, "What pins these documents").

- **Experiment design §6, v0.2's shape** (`docs/01_vision/09_experiment-design.md`), amended in 1.3 to say:
  1. **the bridge** is a campaign of its own that re-runs v0.1's whole configuration: S1, S2, S3 and S8 in baseline,
     baseline-docs and wingfoil, on **WingFoil v0.2.2** (`12537b62`) with task-086's manual (written against
     v0.2.2's guide for AI agents), on the reference campaign's model, Claude Code version and effort, and from the
     **same benchmark commit** as the reference campaign, recorded in both campaign elements since the comparison
     does not list it. It replaces the 1.2 bullet ("a bridge re-running v0.1's configuration on the default model");
  2. **the reference campaign** pins **WingFoil v0.3**, once released and admitted to the eligibility register, with
     the wingfoil arm's manual reviewed against v0.3's guide. If v0.3 is not released by **2026-10-31**, it pins
     v0.2.2 and the bridge is not run, since the reference campaign then holds the same three arms on v0.2.2;
  3. **repetitions:** v0.1's (S1 × 3, S2, S3 and S8 × 1) for both campaigns, until WingFoil 1.0 or the benchmark's
     1.0, whichever comes first; no group is raised to three to leave "preliminary" (dl-012's n ≥ 3 stands);
  4. **the chain of comparisons:** `c82a5e74885b/2` → bridge (model and tooling, WingFoil held) and bridge →
     reference campaign (WingFoil v0.2.2 → v0.3 alone); the bridge adds about 35–40 € (18 runs at v0.1's measured
     cost), which calibration replaces.
- **The header** becomes **Version:** 1.3, with the date; **Traces to** gains dl-017; a decision **8. Amendment 1.3**
  follows 1.2's in "Decisions from the experiment-design review", with its source: dl-017 and the approver's choices
  in chat of 2026-10-13 and 2026-10-14. 1.2's text elsewhere is unchanged.
- **plan-004 step 3** (calibration) adds the bridge's dry runs where the reference campaign has none of the same key
  (with v0.3: the wingfoil and baseline-docs arms on v0.2.2, 8 dry runs), and names the task that, before
  calibration, admits v0.3 to the eligibility register, reviews the wingfoil arm's manual against v0.3's guide,
  checks the arm's setup and the docs control's generator with v0.3, and pins it.
- **plan-004 step 5** (campaign) runs the bridge and the reference campaign from the same benchmark commit, one after
  the other, and publishes the comparisons `c82a5e74885b/2` → bridge and bridge → `campaign-002`; F5.2's comparison
  with `c82a5e74885b/2` is read through the bridge. Its gate covers both campaigns' spending.
- **rel-v0-2** gains one line under its decisions recording dl-017 (option D), its approval `5d7f35b`, and where it
  lands (this task; the v0.3 task before calibration).

## Design

**Files** (one worktree, `../WingFoil2-Benchmark-wt/task-090-…`, branch `task/task-090-…`):

- `docs/01_vision/09_experiment-design.md`: the header (Version 1.3, Date, Traces to + dl-017); §6's "v0.2's shape"
  list: the bridge bullet rewritten, two bullets added (the WingFoil pin with its deadline; the repetitions), and
  after the first sizing one sentence on the bridge's cost and the two comparisons; decision 8, "Amendment 1.3
  (v0.2 calibration, 2026-10-14)", in the style of 1.2's. §5 (T15 tool drift) is not touched: it already says each
  harness is pinned per campaign.
- `docs/plans/plan-004-release-v0-2.md`: the Produces cells of steps 3 and 5, kept short, and a paragraph
  "**Calibration and campaign (steps 3 and 5), from dl-017:**" after "Delivery rules (step 2)" with the detail. The
  Constraints line on harnesses ("today v0.2.2 …") gets "v0.3 by dl-017" so that the plan does not contradict
  itself. The plan stays `active`: no transition.
- `docs/memory/release/rel-v0-2.md`: under the Scope's triage, after "5. Found during W12", a **"6. Before
  calibration"** table with dl-017's row (Element | Decision | Lands in), in the format of section 5. The
  answer of 2026-10-05 ("WingFoil for the campaign: … the latest WingFoil release at the campaign") is left as it
  was, since the row says dl-017 makes it precise.

**What pins these documents** (grepped `test/`, `src/`, `site-content/` and `scripts/` on 2026-10-14):

- `test/unit/site/method-statements.test.ts` cites "experiment design §6" as a source string for the method page's
  `model-slices` and `threat-t14` anchors (v0.1's Opus slice). Neither anchor's statement changes, and the test reads
  `site-content/method.md`'s anchors, not the experiment design's text or version. It is run to show it.
- `site-content/method.md` names no section number or version of the experiment design, plan-004 or rel-v0-2;
  `#preliminary` and `#model-slices` speak of v0.1 and stay true.
- `test/acceptance/traceability.test.ts` reads the tasks' frontmatter (this task: no `features`, no `fixes`): run.
- No test reads `09_experiment-design.md`, `plan-004` or `rel-v0-2` directly.

**Checks** (day checks, niced): prettier on the three files and the task; `npm run lint`; vitest `--maxWorkers=2` on
`method-statements` and `traceability`. No code changes, so `tsc` and `test:bin` are not needed; they are named in
the Execution notes as skipped. The full suites only if the approver asks: the diff is three documents.

**Review:** an independent read-only agent checks the diff against dl-017 point by point (nothing added, nothing
lost), against REQ-FMT-01 and REQ-SCO-13, and the documents' consistency with each other; one round at a time until
clean, each round in the Review notes.

**After approval:** merge `--no-ff` on main, `memory submit` approved → done, worktree and branch removed, the task
counts printed. Push only on the approver's go.

## Execution notes

- `npx wingfoil memory add --type task --title … --tags calibration,docs,dl-017` on 2026-10-14, on main. Declared:
  create a draft with the type's scaffold and commit it. Observed: `task-090-…` as a draft (`4fc5314`), required
  fields empty (W-02); filled in a `docs(task)` commit before `submit` (W-01).
