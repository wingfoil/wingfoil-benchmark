---
id: task-157-runner-and-tooling-edge-cases-refuse-bad-input-early-and-report-it-rightly
type: task
title: "Runner and tooling edge cases: refuse bad input early and report it rightly"
status: in-progress
release: v0.3
wave: publishing
features: [F7.4]
acceptance: []
requirements: [REQ-FMT-01, REQ-FMT-04, REQ-FMT-12, REQ-CLI-02, REQ-CLI-05, REQ-RES-07]
fixes: [bug-033-runner-and-tooling-edge-cases-accept-bad-input-or-report-it-wrongly]
tags: ["v0.3","runner","tooling"]
---

## Context

This task fixes [bug-033](../bug/bug-033-runner-and-tooling-edge-cases-accept-bad-input-or-report-it-wrongly.md), the last bug the approver placed before v0.3 publishes (2026-11-17). The bug
collects eight small items from v0.1's and v0.2's task notes. Each was read against the code on 2026-11-18:

| # | Item | Today |
|---|---|---|
| 1 | An empty seed fails with git's words | Holds: `prepareWorkspace` commits the copied seed, and nothing checks it has a file |
| 2 | `bench run compare` without models fails obscurely | **Not reproduced**, see below |
| 3 | `scenario dry-run`'s profile check skips the eligibility register | Holds: only `checkCampaign` calls `eligibilityIssues` |
| 4 | A registry harness's commit pin is refused only at run time | Holds: only `prepareFromRegistry` refuses it |
| 5 | `scripts/full-suites.sh`: a `git` failure reads as clean | Holds: an empty `git status` output means clean |
| 6 | A `run.json` holding an array passes the object check | Holds: `src/results/execution.ts` tests only `typeof` |
| 7 | Execution links sort in file-name order | Holds for the comparisons: `src/site/comparisons.ts` sorts `…-10` before `…-2` |
| 8 | The dry run's key and skip reason are unstated | Holds: `src/cli/dry-run.ts` calls `latestDryRun`, which drops the reason |

**Item 2 needs no fix.** With no arguments the command prints its usage and exits 2. A `run.json` with no `model` says
`run.json.model: is required` and exits 1. Runs whose steps record no observed `models` compare normally. The note it
came from (task-054, review item 8) says something else: "`run compare` does not show models", a nit left because
nobody asked for it. This task changes nothing there, and its notes record why.

**Done** means each of the seven items is refused or reported as its row asks, and every stored campaign, dry-run
profile and scenario stays valid.

## Acceptance criteria

<!-- Each red first, in the unit test of the code it changes. No Gherkin scenario planned. -->

1. **An empty seed (item 1):** a scenario whose seed holds no file that a run would copy (it is empty, or holds only
   empty directories or symbolic links) is refused when the scenario loads, at the `seed` field, in the benchmark's own
   words.
2. **The dry run's register (item 3, amended by the approver's choice A, 2026-11-18):** a harness arm whose pinned tool
   and version the eligibility register does not admit still runs, because dry runs are how a version is studied before
   it is assessed (task-063). `scenario dry-run` prints `campaign validate`'s message as a note.
3. **A registry pin (item 4):** `campaign validate` and `checkDryRun` refuse, before any image is built, a registry tool
   pinned by `commit` or by a version that is not a release. The run-time refusal stays as a guard.
4. **The suites' report (item 5):** when `git` fails in a worktree, the summary line says so and does not read as clean.
5. **A run record (item 6):** a `run.json` holding an array is refused as "not a run record", as `null` already is.
6. **The comparisons' order (item 7):** comparisons sort by campaign, then by execution as a number, so `…-2` comes
   before `…-10`. A site with fewer than ten executions of a campaign keeps its bytes.
7. **The dry run's quote (item 8):**
   - when the latest dry run of a key does not count, `scenario dry-run` prints why;
   - that reason names what it compares with, the profile and not "the campaign", in a dry run's output;
   - the estimate's messages stay as they are;
   - the line states that a dry run always keys on the arm's digest, which an unpinned campaign's estimate does not.
8. **Nothing stored breaks (characterization):** `campaign validate` passes on every file in `campaigns/` that passes
   today, every dry-run profile passes `checkDryRun`, and every scenario version still loads with the same hash.
9. **Checks:** `scripts/pre-review.sh main`, an independent read-only review (dl-020), and the full suites on the
   approver's go.

## Design

- **One commit per item,** each with its red test, so that a review can read them apart.
- **The registry tools move to `src/core/`:** `REGISTRY_PACKAGES` and the release pattern leave `src/runner/harness.ts`,
  so that the campaign's check and the dry run's share them with the build.
- **One check for both callers:** the dry run calls the campaign's eligibility and pin checks and does not copy them.
- **A requirement that changes:** if an item needs a requirement's wording amended, the amendment goes to the approver
  with this task's review, and no scenario version or stored result changes.
- **No spending:** no agent runs, and no campaign or dry run is launched. Items 3 and 8 are tested with the fake agent's
  fixtures.

## Execution notes

- **Item 2 is left out:** it did not reproduce (§ Context), and the approver approved the task that says so.
- **Red first:** every new test failed before its fix. Items 3 and 4 share one check, `src/runner/harness-pins.ts`, so
  they are one commit and not two.
- **`readRecord` in `src/runner/run.ts`:** it refuses a list too, but a resume reads `executionSpendingEur` first, so
  the CLI test catches a regression only when both checks are removed.
- **Nothing stored breaks (criterion 8):** main's checks and this branch's gave the same answer on all 1310 stored
  cases: 9 scenario versions with their hashes, 14 campaign files, and 1287 pairs of a dry-run profile, a scenario
  version and an arm.
- **The independent review (2026-11-18) found that refusing an unassessed version would block its admission:** a new
  version needs dry-run evidence before it is admitted (task-063; WingFoil v0.3.1's entry cites dry runs 86 and 87). The
  approver chose A: the dry run runs and notes it. Registry pins that cannot be fetched stay refused.
- **The review's other findings are fixed:** the dry run names every kind of dry run that does not count, also when an
  older one still counts; a seed git cannot commit fails in the benchmark's words; and the regressions it found
  untested are tested. A seed holding only links stays refused by the earlier link check, at the link's own path.
- **A second independent review (2026-11-18) found no blocker.** Its findings are fixed: a note names the register when
  it is missing or invalid, the empty seed is recognised by asking git for an empty commit and not by git's words, which
  change with its locale, and the reasons and the `CHANGED` case it found untested are tested. These last fixes were not
  reviewed again.
