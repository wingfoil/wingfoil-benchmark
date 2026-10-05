---
id: task-055-method-page-re-read-before-publishing-v0-1
type: task
title: "Method page re-read before publishing v0.1"
status: approved
release: v0.1
wave: campaign
features: [F5.8]
acceptance: [results.feature]
requirements: [REQ-RES-02]
---

## Context

campaign-cycle's last phase, `publish`, builds the site of the reference campaign's execution `c82a5e74885b/2`
([campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md), reviewed `5f3c2fc`), and the approver then
approves publishing it. The method page's prose, `site-content/method.md` (task-046, W11), was written before
calibration and the campaign. Several items were left due "before publishing". The approver asked for this task on
2026-10-04.

**What is due, and where it was left:**

1. **rel-v0-1, W11, "Before publishing":** re-read `method.md` against the requirements as they stand, now 1.25. The
   statements test pins the anchors, not their wording.
2. **rel-v0-1, W11, "Calibration and the reference campaign":**
   - the text names the campaign's shape (only S1 repeated); re-read it against the shape as it ran;
   - `harness-gaps` and T10 describe the development pin `3df305e`;
   - "This execution" reads the real pins, among them the released WingFoil's `provides`. To check on the built
     page.
3. **Calibration §10, still open:**
   - the slice decided in §5: the Opus 5 slice reduced to the **wingfoil arm** (option A). Today `model-slices` and
     T14 speak of "a comparison slice" without saying it covers one arm only;
   - a statement that the wingfoil arm's process (a task and a decision-log per request, each approved) is the
     operating manual's choice (§7), so that its overhead is read as the manual's process, not as WingFoil's minimum.
4. **task-054's deviation:** a sentence that Claude Code may call a smaller model for its own work. It did: Haiku
   4.5, 0.19 USD in `c82a5e74885b/2`. The models each step used are recorded in `run.json`.
5. **The executions:** `/2` is the one published. Whether the page says that `/1` existed and why it is not
   published (bug-011) is the design's to propose.

**Scope:** the prose of `method.md`, and its anchors where a statement is added; the statements test where an anchor
is added. No change to the site's generator unless the built page shows a fact read wrongly. That would be a bug of
its own.

**No real agent, no spending.**

**Done** means:

- every item above is either reflected in the page or stated as not needed, with the reason;
- the site is rebuilt on `c82a5e74885b/2` and read in the browser pane: the method page, the landing page and one
  category page;
- `npm test` is green, and lint is clean.

## Acceptance criteria

- Every new statement has its anchor, and the statements test (`test/unit/site/method-statements.test.ts`) lists it
  with its source. **Red-first:** the test names the anchors before the prose has them.
- The existing anchors are all kept, with no anchor renamed. **Characterization:** the statements test as it is.
- The built method page of `c82a5e74885b/2` reads the new statements, and its "This execution" section reads the
  real pins. Checked by hand in the browser pane, and recorded.
- `results.feature` @F5.8 stays green. **Characterization.**

## Design

The re-read, item by item. Each item either changes the page or is stated as not needing a change.

| # | Item | Finding on re-read | Change |
|---|---|---|---|
| 1 | Requirements 1.20 → 1.25 | 1.23 (the finding note's template at v0.2.2): the page says "shaped as a WingFoil bug or decision record", still true. 1.24 (rate limit): `#rate-limit` already states it. 1.25 (observed models): not on the page | item 4 below |
| 1b | task-053 (bug-011), the output bound | not on the page. A step whose output passes the runner's bound is failed and counted at its upper bound, as a killed step is | one sentence added to `#killed-step`: "The same holds for a step whose output passes the runner's 256 MiB bound." |
| 2a | The campaign's shape | `#preliminary` ("repeats only S1") and the M-R line ("only S1 has repetitions (three)") match the campaign as it ran | none |
| 2b | `harness-gaps` and T10 | `#harness-gaps` is general and true. T10 names `3df305e` as the pin *at design time*, and v0.2.2 as the public campaign's: both true, and the history is the point of T10 | none |
| 2c | "This execution" | the built page (`site/c82a5e74885b/2/method.html`) reads agent 2.1.280, Sonnet 5, the Opus slice "on S1, in wingfoil", WingFoil v0.2.2 with commit `12537b62` and its `provides`, the four scenario hashes, the scoring image, the manuals and the budget | none; re-checked on the rebuilt page |
| 3a | The slice covers one arm | `#model-slices` and T14 speak of "a comparison slice" without saying that in v0.1 it is one run of S1 in the wingfoil arm. It therefore compares models *within* the wingfoil arm, not the harness's effect on Opus | `#model-slices`: in v0.1 the slice is one run of S1 in the wingfoil arm, read against the same arm's runs on the main model. T14's mitigation gains "(in v0.1, the wingfoil arm only, for its cost)" |
| 3b | The wingfoil arm's process is the manual's | the manual asks for a task per request and a decision-log per design decision, each submitted and approved. Its reading and writing are in the arm's cost (the M-K1 finding of campaign-001). Not on the page | a new statement, `{#wingfoil-manual-process}`, after `#operating-manuals`: what the wingfoil manual asks the agent to record, and that the arm's cost and turns include that process. A lighter use of WingFoil would cost less; the manual is the one published |
| 4 | Auxiliary models | Claude Code called Haiku 4.5 for its own work (0.19 USD in `c82a5e74885b/2`) | a new statement, `{#auxiliary-models}`, after `#harness-not-model`: the agent may call a smaller model for its own work; the models each step used are recorded with the run; their cost is in the arm's cost |
| 5 | Execution `/1` | the method page describes the method, not one execution's history. `/1` is not published, and its story (bug-011) belongs in v0.1's release notes | none on this page; the release notes (plan-003 step 6) mention it |

**Files:**

- `site-content/method.md`;
- `test/unit/site/method-statements.test.ts`: two new anchors with their sources (the wingfoil manual; REQ-RUN-09 as
  amended in 1.25).

No generator change.

## Execution notes

- `npx wingfoil memory add --type task --title "Method page re-read before publishing v0.1"`. Declared: creates the
  element from the template and commits it. Observed: `wf(task): add task-055-…`, `status: draft`.
- `npx wingfoil memory submit task-055-…` (draft → pending), `ec53aae`; `memory approve` (pending → backlog), run by the
  agent on the approver's request in chat (2026-10-04, "Si procedi con il task per method.md"), `7f62369`. Branch in
  its own worktree (`../WingFoil2-Benchmark-task-055`, its own `npm ci`); Design committed first; `memory submit`
  (backlog → in-progress). Each command did what it declares.

### Build

- **Red first:** the statements test named `auxiliary-models` and `wingfoil-manual-process` before the prose had
  them, and failed ("holds every statement it owes").
- **Then green** (`1350bad`): the prose of Design items 1b, 3a, 3b and 4, and the test's sources for the new and
  changed anchors.
- **The site rebuilt** on `c82a5e74885b/2` in the worktree (16 pages) and read in the browser pane over a local
  HTTP server:
  - the method page shows the new statements under their anchors;
  - "This execution" reads the pins of Design item 2c;
  - the landing page and category C load.
- `npm test`: 77 files, 1225 tests; coverage 98.04 %. `npm run lint`: clean.

### Review

An independent, read-only agent checked the whole page against its sources and the recorded results. Among its
checks:

- Haiku 4.5 in 5 of 86 steps, 0.27 % of the cost;
- the runner's path for a bounded step;
- the slice: one Opus run.

It found no blocker, and no other statement contradicting how the campaign ran.

| # | Finding | Severity | Outcome |
|---|---|---|---|
| 1 | The 256 MiB sentence implied that the work before the bound is scored like a killed step's; its snapshot is not reliable, and the run fails | should-fix | **Fixed** (`4253600`): a failed step, counted at its bound, the run ends |
| 2 | The manual's process not said to be the manual's choice, not WingFoil's requirement (calibration §7) | should-fix | **Fixed** (`4253600`) |
| 3 | "A lighter use would cost less" stated as fact, unmeasured | should-fix | **Fixed** (`4253600`): "could cost less …; v0.1 measures only this one" |
| 4 | The arm's tokens are the run's model's only, while its cost includes the auxiliary model's (bug-012) | should-fix | **Fixed** (`4253600`) |
| 5–9 | The approval round trip; "for its cost"; "a stronger model"; T14's wording; "beside the run's model" | nit | **Fixed** (`4253600`) |
| 10 | T13 named S4 without "a later scenario" (pre-existing) | nit | **Fixed** (`4253600`) |
| 11 | Execution `/1` not mentioned on the page | nit | Left, as the Design reasons: the release notes say it |

A **re-review** of `4253600`: clean. Its three wording nits were fixed:

- the approval is asked only when the work needs one;
- the round trips, not "waiting";
- the full slice "would have cost too much for v0.1's budget", since it never ran.

`npm test` after the fixes: 1225 tests, green.

