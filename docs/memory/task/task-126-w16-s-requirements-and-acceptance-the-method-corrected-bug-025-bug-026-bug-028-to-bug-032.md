---
id: task-126-w16-s-requirements-and-acceptance-the-method-corrected-bug-025-bug-026-bug-028-to-bug-032
type: task
title: "W16's requirements and acceptance: the method corrected (bug-025, bug-026, bug-028 to bug-032)"
status: approved
release: v0.3
wave: W16
features: []
acceptance: []
requirements: [REQ-SCO-05, REQ-SCO-06, REQ-SCO-07, REQ-SCO-08, REQ-RES-03, REQ-RES-05, REQ-RUN-09]
fixes: []
tags: ["v0.3","specification","w16"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W16, "The method corrected": its requirements and acceptance first
(delivery order item 2), then one task per bug group. The experiment design already states the rules
([task-103](task-103-the-v0-3-vision-and-experiment-design-amendments.md): the variance rule for ▲/▼, headline counts
and M-K4); this task carries them, and the other fixes the retrospective's bugs ask, into `requirements.md` and the
acceptance features, so that each later task starts from a stated, red-first criterion. The approver asked to start
W16 in chat (2026-11-02). A specification change: no code, no real-agent session.

The bugs:
[bug-025](../bug/bug-025-s1-1-0-s-step-5-leaves-createpatch-s-diff-ambiguous-and-its-result-is-bimodal-in-every-arm.md)
(S1 1.0's bimodal step 5),
[bug-026](../bug/bug-026-the-oracle-s-content-checks-match-substrings-and-template-text-not-the-agent-s-own-words.md)
(content checks match substrings and template text),
[bug-028](../bug/bug-028-m-r2-measures-the-file-layout-not-the-public-interface.md) (M-R2 measures the layout),
[bug-029](../bug/bug-029-m-k3-is-always-zero-and-m-k4-s-not-applicable-ignores-the-variance.md) (M-K3 always zero;
M-K4's "not applicable" ignores the variance),
[bug-030](../bug/bug-030-the-up-and-down-marks-and-the-headline-counts-flag-differences-within-the-variance.md) (▲/▼
and headline counts within the variance),
[bug-031](../bug/bug-031-findings-cite-the-v0-2-2-template-through-template-commit.md) (`TEMPLATE_COMMIT`),
[bug-032](../bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md) (an interrupted step's cost).

## Acceptance criteria

<!-- A specification change. The approver's choice (chat, 2026-11-02): this task amends the requirements and drafts
     each acceptance scenario's text; the task that implements an item adds the scenario to its `.feature` with its
     test, red first (the traceability test requires a test for every scenario of a feature a started task lists). -->

1. **Content checks v2 (bug-026):** REQ-SCO-06 amended: a content check matches whole words in the agent's own text
   (what the step wrote and its commit messages), never the seed's or a template's text; a check's verdict also has a
   published human judgement against a rubric; 1.0's results get an erratum. Scenario drafted for its task
   (`scoring.feature`).
2. **M-R2 v2 (bug-028):** REQ-SCO-07's M-R2 reads the public interface (its 1.17 definition), and the layout no longer
   counts; a version of the metric recorded with each value. Scenario drafted for its task (`scoring.feature`).
3. **M-K3 and M-K4 (bug-029):** REQ-SCO-08 amended: M-K3 is the cost an arm pays once (setup, configuration), measured
   where it is spent; M-K4 is "not applicable" only when the difference it divides by is within the variance
   (experiment design 1.7); the approver chose (chat, 2026-11-02) the variance on both conditions, the quality as
   bug-029's Resolution reads and the step-cost difference as its Expected reads. Scenario drafted for its task
   (`scoring.feature`).
4. **The variance rule on the site (bug-030):** REQ-RES-03 amended: ▲/▼ and a headline count only beyond the variance,
   on every page; a difference within it is shown without a mark. Scenario drafted for its task (`results.feature`).
5. **The template cited (bug-031):** REQ-RES-05 amended: a finding note names the WingFoil template of the version it
   is filed against, read from the run, not a constant. Scenario drafted for its task (`results.feature`).
6. **An interrupted step's cost (bug-032):** REQ-RUN-09 amended: a step that stops early (interrupted, killed at a
   cap, failed) is recorded with the cost it spent, or at its bound when the agent reports none, and marked so.
   Scenario drafted for its task (`runner.feature`).
7. **S1 1.1 (bug-025):** the scenario conventions' K7 (amendment 1.5) already state the 1.1 versions: no requirement
   changes; S1 1.1 states step 5's requirement so that one reading passes (createPatch's diff); 1.0 kept, with its
   limit on the method page. Scenario drafted for its task (`scenarios.feature`).
8. The W16 tasks that follow, named in the Execution notes in plan-005's order (bug-026; bug-028 with bug-029 and
   bug-030; bug-031 with bug-032; bug-025 with S1 1.1; the M-K1 annotation; the re-scoring of v0.2's campaigns), each
   to be filed after this task's approval.
9. Checks: `pre-review.sh main` (the traceability and documentation tests); an independent review (dl-020).

## Design

- **Requirements 1.49** amend REQ-SCO-05, REQ-SCO-06, REQ-SCO-07, REQ-SCO-08, REQ-RES-03, REQ-RES-05 and REQ-RUN-09,
  each by the approver's decision recorded in its bug (2026-10-23): content checks on whole words over the agent's own
  text, less the templates the setup installs (the approver's reading of 2026-11-02), with a rubric and a human
  judgement (`match: words`, `oracle/rubric.md`, `judgements.json`); M-R2 v2 resolved from the entry point; M-K3 as
  one-off costs per scenario version and harness; M-K4 with the variance on both its quality and its step-cost
  comparisons; ▲/▼ and the headline only beyond the variance; the template read from the campaign's pin.
  REQ-RUN-09 keeps REQ-RUN-19's kill at the bound and fixes what bug-032 lists (a step ending with no result event
  never zero; an interruption recorded `interrupted`).
- **The two points experiment design 1.7 left to W16.** bug-029's Resolution (the approver's decision: "not
  applicable only beyond the variance") puts M-K4's variance on its **quality condition**; its Expected puts it on the
  **step-cost difference** it divides by, and task-103's review leaned to that reading, so 1.7 left it open
  (task-103.md, §4.2). The approver chose both (chat, 2026-11-02): a quality worse beyond the variance, or preliminary
  and lower, is "not applicable" (reason `quality`); a step cost the same or higher beyond the variance, or
  preliminary and not lower, is "never"; a step cost within the variance is "not applicable" (reason `saving within
  variance`), since a break-even divided by noise would be published as a number; the value divides by the
  difference of the two means compared, no longer 1.15's pooled one. Each comparison's outcome is recorded.
  Experiment design 1.11 amends §4.2 to match. **A preliminary difference** gets no symbol and is counted apart in
  the headline, as one within the variance.
- **Existing tests the implementing tasks will change** (not regressions): REQ-RES-03's headline and marks in
  `test/acceptance/results.test.ts` (the headline's wording; "Losses, ties and gaps…" expects ▲/▼ on n = 1 fixtures),
  `test/unit/site/rules.test.ts` and `test/unit/site/build.test.ts`; M-R2's in the scoring tests reading
  `<file>: <signature>`. M-K4's task also rewrites `src/results/aggregate.ts`'s `BreakEven` (a reason and two
  outcomes), `src/results/finding.ts`'s `breakEvenLine` and `site-content/method.md`'s `#m-k4`, which describe the
  point comparisons until then.
- **The scenarios, drafted** for the tasks that implement them (each adds its scenario to the `.feature` with its test,
  red first, and names it in `acceptance` as `<file>#<title>`):
  - `scoring.feature`, @F4.7 — "A v2 content check reads whole words in the agent's own text": Given a check with
    `match: words` for "revised" and a fixture whose `setup/diff.patch` adds a template holding a line "Mark it
    revised", When a step adds "unrevised" to a source file, the same line "Mark it revised" to a new document, a
    front-matter line `title: D3 revised` and "D3 revised" to the seed's README, Then the template line does not
    count, the title and the README line do, and the check passes; And in a scenario with a separate approver, a
    commit the verdict hook made saying "revised" does not count, while the agent's own `Reason: D3 revised` in a
    verb's commit does. — "The maintainer's judgement is shown beside a content check's verdict": Given
    `judgements.json` holds a judgement for a check at a step of a run, When the site is built, Then the verdict and
    the judgement are shown together and a disagreement is counted.
  - `scoring.feature`, @F4.5 — "M-R2 v2 compares the interface the entry point exposes": Given two runs whose
    `src/index.ts` re-exports the same functions from different modules, Then M-R2 is 1; Given two runs with the same
    files exposing different functions, Then it is below 1; And a module the entry point does not reach is not
    counted; And each value records version 2; Given a run with no `src/index.ts`, Then its interface is
    `(no entry point)`; Given a reached module that does not parse, Then its entry is `<file>: (does not parse)`.
  - `scoring.feature`, @F4.4 — "Break-even reads the variance on quality and on step cost": Given an arm whose final
    M-Q1 is lower within the variance (n ≥ 3 a side) and whose step cost is lower beyond it, Then break-even is the
    value, its quality's outcome "within the variance"; Given its M-Q1 lower beyond the variance, Then "not
    applicable", reason `quality`; Given n < 3 and a lower M-Q1 mean, Then "not applicable", reason `quality`, its
    quality's outcome preliminary; Given the arm's runs, none of which reached a step, and every baseline run's final
    M-Q1 above 0, Then "not applicable", reason `quality`. With an M-Q1 the same or within the variance (n ≥ 3 a
    side), or not lower (n < 3): Given step costs within the variance, Then "not applicable", reason `saving within
    variance`; Given equal step-cost means, a step cost higher beyond the variance, or n < 3 and a higher one, Then
    "never"; Given n < 3 and a lower step cost, Then the value, its step cost's outcome preliminary; Given three runs
    a side, one of the arm's reaching no step, Then the step-cost comparison reads the other two, its `n` is 2 and its
    outcome preliminary; Given a side's runs, none of which reached a step (the arm's, n ≥ 3 a side, with a baseline
    run at M-Q1 0, or the baseline's), Then "not applicable", reason `not measured`; And each entry records both
    outcomes, each with its runs and `n`. — "M-K3 is the one-off cost per scenario version and harness": Given a
    configured arm whose configuration cost is recorded once and three runs' setup costs, Then M-K3 is the
    configuration's cost plus their mean.
  - `results.feature`, @F5.5 — "A difference is marked only beyond the variance": Given two arms with overlapping
    ranges (n ≥ 3), Then the comparison shows the delta and "within the variance", no symbol, and the headline counts
    it so; Given n < 3, Then "preliminary", no symbol, counted apart; Given equal means, Then "the same". The same on
    the category, profile, comparison (`comparison.feature`, @F5.7), across-agents and parity pages.
  - `results.feature`, @F5.4 — "A finding cites the template of the WingFoil the campaign pinned": Given an execution
    pinning WingFoil v0.3.1, When a finding is exported, Then it cites 0.3.1's template, not the constant v0.3.0's;
    Given a bridge whose arms ran two versions, Then each arm's is named; Given no WingFoil, Then none.
  - `runner.feature`, @F2.3 — "A step that ends with no result event is counted at its bound": Given a Claude Code step
    killed before its result event, Then its cost is its bound with `cost_reported: false`; Given the runner
    interrupted during a step, Then the step is recorded `interrupted` at its bound; Given a dry run interrupted, Then
    its record keeps the cost its steps spent.
  - `scenarios.feature`, @F3.4 — "S1 1.1's step 5 has one reading": Given S1 1.1, Then its step 5's request states
    createPatch's diff form, and 1.0 stays registered with its limit stated.

## Execution notes

- **Deviation, the approver's choice (2026-11-02):** the scenarios are drafted here and written, with their tests, by
  the tasks that implement them: the traceability test fails on a scenario of a feature that a started task lists
  without a test (checked: a probe scenario tagged @F4.1 turned it red), and no tag marks a scenario as planned.
  `features` and `acceptance` are empty here, as task-103's.
- **Criteria 2, 3 and 6, as the Design refines them for the approver:** M-R2 v2 resolved from the entry point, not
  REQ-SCO-05's 1.17 file-keyed entries (bug-028's Resolution); M-K4's variance on both its quality and its step-cost
  conditions (the approver's choice of 2026-11-02 between bug-029's Resolution and its Expected, Design); an
  interruption counted at its bound as REQ-RUN-19 says, not read gracefully.
- **The W16 tasks to file after this task's approval**, in plan-005's order: (1) content checks v2 and the rubric
  (bug-026); (2) M-R2 v2, M-K3 and M-K4, the variance rule on the site (bug-028, bug-029, bug-030); (3) the cited
  template and an interrupted step's cost (bug-031, bug-032); (4) S1 1.1 (bug-025); (5) the M-K1 annotation (plan-005
  triage item 4); (6) v0.2's campaigns re-scored offline from their transcripts. task-112 and task-113 (W16's
  backlog) stay as they are.
- **Full suites** (2026-11-02, `a25dc0a1`, under the load watcher): LINT 0, TEST 0 (2004 passed, 9 skipped), BUILD 0,
  BIN 0, DOCKER 0.

### Review

**Round 1** (2026-11-02, a fresh read-only agent in `/tmp/claude-1000/review-126-hxaA`, a clone of `b9b65b97`; both
checkouts unchanged; docs and traceability tests green). Two blockers and nine should-fix:

| # | Finding | Outcome |
|---|---|---|
| B1 | "the agent's own text" excluded seed files and still counted template text written during the step | fixed: added lines anywhere, less template and harness text; the scenario says where each line is |
| B2 | M-R2 v2 dropped the file prefix, not the approver's "resolved from the entry point" | fixed: resolved from the entry point; REQ-SCO-05 amended |
| S1–S2 | REQ-SCO-05 contradicted; "an export named twice" ambiguous | fixed: one entry per name, its declaration's |
| S3 | v2's selection, stems, whitespace, the agent's commits; S10 1.0 on v1 | fixed: `match: words`, inflections listed, folding kept, the agent's identity; S10 1.0 v1 with its erratum |
| S4 | rubric and judgement storage | fixed: `oracle/rubric.md` (hashed), `judgements.json`; 1.0 executions not judged |
| S5 | M-K3's unit and storage; M-K4's preliminary mark | fixed: per scenario version and harness, configuration once plus the setups' mean; `certainty` recorded |
| S6 | REQ-RES-03's precedence, wording, markup; tests that will change | fixed: the order stated, the headline quoted whole; the tests named in the Design |
| S7 | REQ-RUN-09's graceful stop contradicted REQ-RUN-19 | fixed: killed at its bound; the dry run's record kept |
| S8 | several WingFoil versions; no WingFoil; the constant is v0.3.0 | fixed |
| S9 | the M-K4 history misstated | fixed: bug-029's Resolution and Expected disagree, and this task takes the Resolution |
| N | link lines with prose, a duplicated id, missing scenario cases | fixed where in this task |

**Round 2** (2026-11-02, a fresh read-only agent in `/tmp/claude-1000/review2-126-SVLu`, a clone of `67c94498`; both
checkouts unchanged), on `b9b65b97..67c94498`: B2 and S2–S9 resolved, B1's core resolved. Three should-fix, fixed:
REQ-SCO-06 still counted text the harness's commands write (front-matter states, `wf(…)` commit messages): excluded,
by the approver's "template and harness text excluded" (**for the approver to confirm at the gate**); its commit
filter contradicted the 1.1 scenarios, where the agent's identity is the Benchmark Approver: now the verdict hook's
commits under a separate approver (1.44) are the ones left out; REQ-SCO-07's entry point is the scenario's required
`src/index.ts`, never `main`/`exports`, with `(no entry point)` and `(does not parse)` stated. Nits fixed: whitespace
folded within a line only; overloads, `export * as ns`, `default`, `.js` specifiers; M-K3's runs and the certainty
of the quality comparison; 1.20's preliminary list dropped; REQ-RUN-09 per invocation, status against cost; the
Design's scenarios (a harness commit, no entry point, a bridge); criterion 3's reading; the long context line.

**Round 3** (2026-11-02, a fresh read-only agent in `/tmp/claude-1000/review3-126-4tGQ`, a clone of `21c1f85f`; both
checkouts unchanged; it sorted every stored commit message). No blocker; four should-fix: the `wf(` prefix missed
WingFoil's 1 181 `workflow: finalize` commits, and dropping whole verb commits and front matter dropped the agent's
own words (`Reason:` texts, a document's `title:`), against the wingfoil arm. **The approver chose (chat,
2026-11-02)** to exclude only the templates the setup installs and the verdict hook's commits: REQ-SCO-06 reworded,
harness-neutral, which also settles its "never a harness's format" clause and the undefined "document the harness
manages". REQ-SCO-07's entry point is `src/index.ts`, a constant (a scenario would declare another in
`scenario.yaml`). Nits fixed: commits matched by sha; directory, extensionless and local re-export specifiers;
unresolved specifiers and unparsable modules; two runs with no entry point agree; M-K4's "not applicable" wording;
the Design's cases (the hook's commits, a `Reason:`, `(does not parse)`).

**Round 4** (2026-11-02, a fresh read-only agent in `/tmp/claude-1000/review4-126-H0Pg`, a clone of `14eef7b0`; both
checkouts unchanged). REQ-SCO-06 states the approver's choice harness-neutrally; on stored wingfoil runs the template
rule removes, line for line, the scaffold comment that made v1 match (bug-026). One should-fix: the Design and the
M-K4 scenario's title still said "only" while listing the preliminary case: fixed. Nits fixed: front matter counts
except its lines equal to a setup line; "the reason the agent gave to a harness command" for `Reason:`; "the lines
the arm's setup added"; the content-check scenario's fixture made explicit, with a `title:` that counts.

**Round 5** (2026-11-02, a fresh read-only agent, nothing run; both checkouts unchanged), on `14eef7b0..f0f0c02f`:
round 4 resolved, no should-fix. Nits fixed: REQ-SCO-06's parenthetical limited to a front-matter line in a file;
two ragged lines reflowed.

**Round 6** (2026-11-02, a fresh read-only agent in a `mktemp` clone of `efb2d0c4`; both checkouts unchanged), after
the approver chose reading C for M-K4 (the variance on quality and on step cost). No blocker; three should-fix, fixed
in `c54938cf`: the value divided by 1.15's pooled mean while the comparison read per-run means (now the two means
compared); no outcome for equal means (now the same, and "never" for step cost); experiment design §4.2 still said
"never" when not lower (amendment 1.11). Nits fixed: "whichever mean is lower", a run with no reached step, 1.15's
bullets retired, the implementing task's files named, the scenario's preliminary branches.

**Rounds 7 to 10** (2026-11-02, fresh read-only agents in `mktemp` clones of `c54938cf`, `05cc2268`, `e3a79673` and
`739bdedc`; both checkouts unchanged each time). Round 7: one should-fix, each comparison's runs and `n` (the
preliminary case counts the runs it read), and a side with no run that reached a step (`not measured`). Rounds 8 and
9: one should-fix each, in the drafted @F4.4 scenario (an arm with no reached step has M-Q1 0, so `quality` comes
first unless a baseline run is at 0), and "not measured" among the outcomes. Round 10: every Given walked through the
ordered cases holds; no should-fix; its one nit (the arm's case at n ≥ 3) fixed.
