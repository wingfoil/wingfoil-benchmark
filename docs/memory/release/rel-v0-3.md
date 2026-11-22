---
id: rel-v0-3
type: release
title: "v0.3"
status: released
version: v0.3
waves: [W15, W16, W17, W18, W19]
features: [F1.1, F4.1, F4.3, F2.7, F2.6, F7.5, F4.9]
---

## Goal

**WingFoil as designed, harnesses as configured.** Re-measure S1, S2, S3 and S8, in scenario versions 1.1, with an
oracle and metrics that say no more than the data, with the wingfoil arm driving WingFoil 0.3.1's workflow engine
(dl-021 step A), every harness also configured for the project, and the review loop measured in every arm. It serves
Riley (a WingFoil result that tests the engine), Avery and Dana (harnesses compared as they would use them) and the
Maintainer. The sequencer's "Broader categories" move to v0.4 (sequencer 1.2).

## Scope

Waves and features: [plan-005](../../plans/plan-005-release-v0-3.md), which holds the triage table (the approver's
decisions in chat, 2026-10-24). The specification amends `docs/02_specification/` through task-103 and each wave's
first task.

| Wave | Features | High unc. | Ends with | Verified |
|---|---|---|---|---|
| W15 — Presets and Codex | F1.1 presets and `extends:` | the Codex spike | the Codex baseline campaign run | 2026-10-29: campaign-004 published (2026-10-25); task-101, task-102, task-104 to task-111, task-114 and task-115 done; step A brought ahead by dl-027, campaign-007 published |
| W16 — The method corrected | F4.1 · F4.3 | — | v0.2's campaigns re-scored offline | 2026-11-05: task-134, `docs/calibration/v0.3-rescore.md` (task-126 to task-134 done; task-112 and task-113, its backlog, done the same day) |
| W17 — WingFoil 0.3.1, step A | F2.7 · F2.6 | the spike on 0.3.1 | an S1 dry run driving the engine | 2026-11-06: task-114's dry runs `dry-runs/94` and `95` (2026-10-28); campaign-008 published (2026-11-01); task-116 to task-125 and task-135 to task-137 done; `docs/calibration/v0.3.md` 0.1, step A read |
| W18 — Configured variants | F7.5 | the configuring agent | every arm in a dry run | 2026-11-13: closed. task-138 to task-146 done (bug-034, bug-047, bug-048, bug-049 fixed); the twelve 1.1 configurations (task-143, `docs/calibration/configuring.md` 1.1); task-144's dry runs `dry-runs/155` to `207`, every arm on S1, S2, S3 and S8 at 1.1, all completed (`160` superseded by `204`, bug-048), `docs/calibration/v0.3.md` 0.2, §5; `configure` scans what it writes (task-145); the contest form and the method page state the configured variants (task-146) |
| W19 — The review loop | F4.9 | F4.9 | the review-loop metrics in the dry runs | 2026-11-17: closed. task-147 to task-151 and task-153 done (bug-051 fixed); task-152, the pin refresh before the dry runs, done (bug-050 fixed); task-151's dry runs `dry-runs/208` to `215` (S1, S2, S3 and S8 at 1.1 in `baseline` and `wingfoil`, on `campaigns/v0-3-review-loop.dry-run.yaml`), all completed, 3.54 EUR: seven loops clean at round 1, one `no fix` at round 2; their figures from `scripts/review-loop-figures.mjs` in `docs/calibration/v0.3-review-loop.md` 1.0 |

**Outside the release, by dl-022:** the Codex baseline campaign (arm A), before 2026-11-13.

**Not in v0.3:** S4, S5 with F4.6, S6, S7 (v0.4); dl-022's arm B; dl-021's steps B and C; configuration profiles;
dl-013's levels of delegation and external control (v0.4).

**Triaged** (plan-005, Context): dl-013 amended; dl-023 and dl-024 new; bug-025 to bug-034 new; v0.1's 12 smaller items
and v0.2's follow-ups merged, filed or dropped.

## Release checklist

<!-- delivery done · calibration (dry runs, budget revision) · validation · reference campaign ·
     publishing · retrospective — with links to the elements that prove each one. -->

- **Calibration:** [task-154](../task/task-154-calibration-v0.3-plan-005-step-3-the-1.1-dry-runs-scored-the-reference-campaign-with-its-loop-and-haiku-slice-the-revised-budget-and-the-hypotheses.md): the dry runs `216`-`263`, the estimate, the budget the approver approved on
  2026-11-18 (warn 65 EUR, ceiling 80 EUR) and the hypotheses on 1.1, in
  [docs/calibration/v0.3.md](../../calibration/v0.3.md) §6.
- **Validation:** [task-159](../task/task-159-validation-of-v0.3-the-suites-and-one-real-agent-run-per-arm-on-s1-the-scenario-with-the-largest-step.md): the suites on main and the execution `2ee46ad9e617/1`, S1@1.1 in the
  thirteen arms on Sonnet 5.5, all `completed` with their review loops, 8.59 EUR API-equivalent.
- **Reference campaign:** [campaign-009](../campaign/campaign-009-v0.3-reference-campaign-thirteen-arms-on-sonnet-5.5-with-a-haiku-5.5-slice-and-the-review-loop.md): the execution `1f70fcaf2ec2/1`, 82 runs, all
  `completed`, 46.77 EUR (52.45 USD) API-equivalent within the approved budget; scored, reviewed and published
  (`5bb1e07f`, 2026-11-20). Its findings exported, bug-055 filed and approved (`0402db49`). No `compared_with`:
  campaign-002 differs in manual, scenario version and policy; the chain to v0.2 is in the release notes.
- **Publishing:** prepared on 2026-11-20 (`1e3b2338`): the catalogue entry, the site built (`1f70fcaf2ec2/1` leading,
  137 pages), the release notes [docs/releases/v0.3.md](../../releases/v0.3.md), the transcripts' release
  `1f70fcaf2ec2-1` packed (540 transcripts and the harnesses, both archives scanned clean). Published by the approver
  on 2026-11-21: main pushed at `779ebc19`; the release `1f70fcaf2ec2-1` with `transcripts.tar.gz` and
  `harnesses.tar.gz`; the site published (`gh-pages` `8f11d6db`: the eight executions, `1f70fcaf2ec2/1` leading); the
  annotated tag `v0.3` on the releasing commit `779ebc19`; the GitHub release "WingFoil Benchmark v0.3 — WingFoil as
  designed, harnesses as configured" with the release notes as its body.

## Retrospective

Written on 2026-11-21 and 2026-11-22, at plan-005 step 7 (`release-cycle` › `retrospective`), after the release was approved
(`39571f45`). Inputs:

- three read-only agents mined the Execution, Review and Approval notes of the 59 tasks; the calibration report, the
  ledger, the re-scoring and the review-loop report, campaigns 004 to 009 and the release notes; every bug and
  decision-log of v0.3, the feedback inbox and the git history `v0.2..v0.3`;
- the WingFoil maintainer's input of 2026-10-24, collected below;
- a discussion of the points below with the approver, whose decisions are recorded under "Decisions taken with the
  approver".

**Inputs collected for the retrospective** (input only, not acted on before it):

- 2026-10-24, the WingFoil maintainer on the wingfoil arm and WingFoil's workflow model (dl-203, the steps A, B, C):
  [docs/retrospective-inputs/v0.3/](../../retrospective-inputs/v0.3/2026-10-24-wingfoil-maintainer-the-arm-and-the-workflow-model.md).

**v0.3 in figures:**

| | |
|---|---|
| Span and history | 30 days (2026-10-22 → 2026-11-21); 1 514 commits, 73 merges |
| Work | 59 tasks (101–160 but 127, which is v0.4's), all done; waves W15–W19, calibration, validation |
| Process | 668 WingFoil transitions, 3 of them rejects (dl-022, task-117, task-146); 207 commits with an `Approver:` line |
| Bugs and decisions | 31 bugs (bug-025 to bug-055), 27 `fixed` with `fixed_by`, 4 `approved` and open (bug-046, bug-052, bug-053, bug-055); 17 decision-logs (dl-021 to dl-037), all approved |
| Tests | 2 521 (1 660 at v0.2), coverage 97.05 % statements; requirements 1.60 (1.33), experiment design 1.13 (1.6) |
| Review | about 166 independent review rounds, 2.8 a task; 7 tasks clean at the first round |
| Real-agent spending | Claude Code 155.12 USD API-equivalent: calibration dry runs 65.99, campaigns 74.03, validation 9.63, review-loop dry runs 3.97, configuring 0.81, spike 0.70. Codex 74.71 USD API-equivalent, campaign-004's 6.11 included (its runs added to the ledger by task-161); nothing billed (ChatGPT Plus) |
| Campaigns | six: 004, 006, 007 on Codex, 008 and 009 on Claude Code published, 005 deprecated (bug-035); the reference `1f70fcaf2ec2/1`, 82 runs, 46.77 € against a high estimate of 50.85 € |

### What went well

1. **Every estimate held.** Each campaign came in between its estimate's mean and high; the review loop's worst case
   was a safe overestimate (18 € reserved, 0.03–0.18 € a loop measured).
2. **Calibration and validation caught the defects before they reached a published result:** bug-038 and bug-039 (S10),
   bug-047, bug-048 and bug-051 (calibration), bug-054 (validation), each fixed before the reference campaign.
3. **v0.2's decisions were all carried out:** step A (brought ahead by dl-027, measured under both agents), the
   configured variants with scenario versions 1.1, the oracle and metrics v2, the review rule, the review loop in
   every arm, the v0.2 errata.
4. **Spikes stayed decisive:** task-107 (F-043, F-044, and bug-036 from its review), task-109 (F-045, F-011 explained),
   task-114 (the approval question read as a question; the manual fixed).
5. **The Codex trial was used before its end** (dl-022, dl-027): four Codex campaigns, the weak model Luna among them,
   nothing billed.
6. **The re-scoring reproduced:** task-139's 2 536 patches with no difference, task-132's v1/v2 comparison, task-121's
   figures of dl-032.

### What to change

1. **Gates and records slipped around campaigns:** a second `memory approve` passed campaign-004's publish gate (then
   reverted); campaign-009's element was filed after its launch, so its spending gate was recorded afterwards;
   campaign-004's results were not committed by its campaign step and its runs are missing from the ledger.
2. **Agents touched the main checkout:** task-102's reviewer helper reset main (restored); reviewers of task-131 and
   task-133 read main's history against their brief.
3. **The targeted checks miss tests.** Full suites went red after a green targeted or pre-review run in tasks 114,
   117, 120, 140, 146 and 156 (two rejects); red tests reached history in 106 and 152; the pre-review script stops
   silently on many files (bug-053). Red-first slipped in eleven tasks.
4. **Review rounds stayed at 2.8 a task**, with fixes that caused the next round (task-147 r2–r4, task-150 r2), final
   changes not reviewed again (154–158, 160), and the same findings recurring: hand-made figures in notes, prose that
   claims more than was observed, requirements out of step with the code.
5. **The machine interrupted the work:** reboots and a lost scratchpad (task-144), an ACPI hang, a full disk and sleep
   during a dry run (task-154), systemd-oomd killing the session inside campaign-009.
6. **A published headline changed without a note.** Rebuilding the site for campaign-009 applied bug-030's rule
   (better or worse only beyond the variance) to campaign-008: wingfoil "better in 4, worse in 2" became "1 better,
   1 worse, 4 within the variance". Only the method page mentions the rule; campaign-008's element still states the
   old counts.
7. **The evidence stays preliminary:** n = 1 on S2, S3, S8 and the Haiku slice; dl-023's repetition campaigns never
   ran; steps are small (median about 58 lines); H5 was not observable; the chain from v0.2 changes the manual, the
   scenario version and the policy together.
8. **Follow-ups left in notes:** about fourteen without an element (among them classifier v2's gaps, the Resource's
   size under Codex, `memory amend`/`park`, the `ambiguous` hook answer on Haiku, the hold-out branch of the review
   loop, `.prettierignore` hiding `src/results/`, the evaluation page after publication); plan-005's test-gap and
   cleanup tasks never filed; dl-033 to dl-036 without tasks.
9. **The feedback inbox grew and nothing reached WingFoil:** F-040 to F-047 added, 12 notes open and 4 `needs-info`
   waiting for a sync.

### Decisions taken with the approver

The approver accepted every proposal below on 2026-11-22.

- **Campaign gates and records:** `campaign run` refuses to start without the campaign's element and the approver's
  spending consent recorded in it; every run writes its own line in the ledger, whatever the agent; campaign-004's
  missing lines (6.11 USD API-equivalent) are added.
- **Agents and the main checkout:** a review or helper agent works only in a temporary directory of its own, never in
  the main checkout; the reflog is checked after every review round. This becomes written practice in the
  `code-review` directive and in `kanban-delivery`'s review step.
- **The checks before review:** bug-053 is fixed and the pre-review script's test selection made to cover every test
  that imports a changed file; the full suites run before every move to in-review, at night when the approver is
  away.
- **Review rounds:** figures in notes are generated by script, never typed; after the last fix a short final review
  reads the final diff before in-review.
- **The machine:** a campaign preflight checks sleep inhibition, free memory and free disk, together with dl-037's
  quota wait and notices (task F).
- **campaign-008's headline:** an erratum, no rerun. The campaign's element, the catalogue and the release notes say
  that bug-030's rule (better or worse only beyond the variance), applied when the site was rebuilt for campaign-009,
  turned "better in 4, worse in 2" into "1 better, 1 worse, 4 within the variance".
- **Repetitions:** dl-023's repetitions (n = 3) are decided before the next campaign, so that its results can be read
  as more than preliminary (plan-005's step 7 already asked it).
- **Follow-ups:** the fourteen follow-ups left in notes, plan-005's test-gap and cleanup tasks, dl-033 to dl-036
  without tasks, and the WingFoil maintainer's new points of 2026-10-24 (WingFoil dl-203's `coordinator` role,
  dl-171, bug-413, bug-392, the Determinism Index's *P* read from the workflow) are triaged when v0.4 is planned. The
  input's other points were dl-021's step A, carried out in v0.3.
- **The WingFoil feedback inbox:** the approver files F-040 to F-047 and the open notes in WingFoil now, with the
  findings (dl-009), and the inbox is synced afterwards.
- **The open bugs:** bug-052, bug-053 and bug-055 go into v0.4's first wave, each with a task; bug-046 stays as it is.

### Actions recorded

To file, in this order (the approver approves each decision-log and task; one task in review at a time):

| When | Kind | What |
|---|---|---|
| Now | task | the v0.3 erratum: campaign-008's headline in its element, the catalogue and the release notes; campaign-004's ledger lines |
| Now | approver | F-040 to F-047 and the open notes filed in WingFoil (dl-009), then the inbox synced |
| v0.4, first wave | tasks | bug-053 with the pre-review selection; bug-052; bug-055 |
| v0.4, first wave | task | campaign gates: `campaign run` checks the element and the consent; a ledger line for every run |
| v0.4, first wave | task | the review practice: a temporary directory for every review agent, the reflog after each round, figures by script, a final review on the last diff, the full suites before in-review (`code-review`, `kanban-delivery`) |
| Before the next campaign | tasks | dl-037's F (quota wait and notices) with the machine preflight, G (the arms' pin), B's spike and the `wingfoil-runner` arm |
| Before the next campaign | decision-log | dl-023's repetitions (n = 3) for the next campaign |
| v0.4 planning | triage | the follow-ups in notes, plan-005's test-gap and cleanup tasks, dl-033 to dl-036, the maintainer's new points of 2026-10-24 |

### WingFoil feedback inbox

`docs/wingfoil-feedback/` holds F-001 to F-047: 25 resolved, 6 captured, 4 needs-info (F-007, F-009, F-023, F-034),
12 open (F-030, F-031, F-035, F-037, F-040 to F-047). v0.3 added F-040 to F-047 (task-100, task-107, task-109,
task-122, task-133); the syncs of 2026-10-27 (0.3.1) and 2026-11-16 (0.3.2) moved F-036 to resolved.
