---
id: task-152-align-the-benchmark-to-wingfoil-v0.3.2-the-memory-cli-the-wingfoil-arm-and-the-next-campaigns-pins
type: task
title: "Align the benchmark to WingFoil v0.3.2: the memory CLI, the wingfoil arm and the next campaigns' pins"
status: approved
release: v0.3
wave: maintenance
features: []
acceptance: []
requirements: [REQ-CLI-02, REQ-CLI-05, REQ-RUN-16]
fixes: [bug-050-the-memory-cli-and-the-campaign-pins-lag-wingfoil-v0.3.2]
tags: ["v0.3","wingfoil","config"]
---

## Context

Fixes [bug-050](../bug/bug-050-the-memory-cli-and-the-campaign-pins-lag-wingfoil-v0.3.2.md): the memory CLI is
pinned to WingFoil 0.3.1 and the `wingfoil` arm's manual names 0.3.1, while v0.3.2 is released (2026-11-02). The bug
records what v0.3.2 changes for the benchmark: nothing to migrate in `.wingfoil/`, the commands this repository runs
unchanged, another `init` scaffold for the arm, the MCP server's surface unchanged. A configuration change, so through
a bug and a task, never straight to main.

**Widened on 2026-11-16 (the approver's decision) to one pin refresh before W19's dry runs.** Bug-050 also records
that the agent pins lag (Claude Code 2.1.300, latest 2.1.325; Codex 0.162.1, latest 0.169.0) and that a step's dry run
is matched without its agent's version. W19's eight loop dry runs
([task-151](task-151-w19-the-review-loop-in-the-estimate-and-its-dry-runs-task-d.md)'s criterion 7) wait for this task:
run on today's pins, the `wingfoil` ones would be skipped after the harness and the arm move, and every loop would
miss the reviewer's agent pin. **When:** now, after task-151's merge (`a0132a52`) and before its dry runs; task-151
stays approved meanwhile.

**Narrowed on 2026-11-16 (the approver's decision, option 1): v0.3's measured pins are frozen.** Moving the arm or
the agent within v0.3 is more than the campaign files' lines: WingFoil v0.3.2 would need its own admission in
`eligibility/register.yaml` (five criteria, dry-run evidence), the four `wingfoil-configured` configurations
(`scenarios/S{1,2,3,8}/1.1/configured/`) record v0.3.1 and Claude Code 2.1.300 and would be re-run, REQ-RUN-20 as
amended in 1.52, plan-005 and the vision name WingFoil 0.3.1 and Claude Code 2.1.300, and v0.3's published campaigns
(W15, W17) ran on 2.1.300, so a mid-release agent change confounds their comparisons. So the measured `wingfoil` arm
stays on WingFoil v0.3.1 and the agents on Claude Code 2.1.300 and Codex 0.162.1 for the whole of v0.3; moving them
is v0.4's first step, with the release watcher below (one admission and one reconfiguration per release). This task
keeps the memory CLI's bump, the agent's version in the step key, and the profile W19's loop dry runs run on. The
title still names the arm: the id stays as approved.

Also corrected while reading: `scenarios/dry-run.yaml` is v0.2's profile (its header: the pins of
`campaigns/v0-2-reference.yaml`), so its `wingfoil: v0.3.0` is right there and stays; v0.3's is
`campaigns/v0-3-reference.dry-run.yaml` (task-144: WingFoil v0.3.1, Claude Code 2.1.300, approver policy v5, the arm
digests pinned), which carries no review loop. W19's loop dry runs therefore run on a v0.3 profile with the loop.

## Acceptance criteria

<!-- Each red first unless marked: a failing test before the code; `acceptance` lists the scenarios as written. -->

1. **The memory CLI** (characterization): the devDependency is `npm:wingfoil@0.3.2`, installed with `npm install` and
   its lockfile committed; `npx --no-install wingfoil --version` says 0.3.2; a `memory add --dry-run` and a
   `memory submit --dry-run` on a throwaway element read the committed `memory.yaml` and the existing elements
   unchanged, and write nothing. `.wingfoil/` is migrated only if the changelog requires it (it does not, per bug-050).
   The `wingfoil-cli` directive's rules 5, 7 and 8 at the pin bump: its entries re-checked on 0.3.2, its version and
   *Checked against* bumped; `scripts/wingfoil-sync.mjs` run against the WingFoil clone at `v0.3.2` (read only) and
   the sync recorded in `docs/wingfoil-feedback/README.md`.
2. **The measured pins stay** (characterization): no file under `arms/`, no campaign file, no preset, no profile's
   `harnesses` or `agent`, no `configured/` record and no eligibility entry changes; a test that treats 0.3.1 as the
   measured WingFoil keeps doing so. Only references to the *managing* CLI move to 0.3.2.
3. **The loop's v0.3 dry-run profile** (characterization, a unit test of the file): a new
   `campaigns/v0-3-review-loop.dry-run.yaml` with `campaigns/v0-3-reference.dry-run.yaml`'s pins unchanged
   (harnesses, agent, models, approver policy, caps, currency, arm digests) plus task-151's `review_loop` as
   `scenarios/dry-run.yaml` pins it (reviewer Claude Code 2.1.300, `claude-sonnet-5-5`, medium, both prompts' SHA-256,
   `max_rounds` 5, the loop's caps), so that a v0.3 campaign with that loop is priced by these dry runs. A
   `scenario dry-run --profile` without `--allow-spending` on it refuses with the run's and the loop's bounds for
   S1, S2, S3 and S8 at 1.1 in `baseline` and `wingfoil` (the arm digests still the arms'), spending nothing.
4. **The agent's version in the step key** (unit, red first; REQ-CLI-02 amended, the text proposed to the approver
   with the change): a step's dry run counts for a key only if it ran the campaign's agent at the pinned version (its
   recorded `agent.version`), as the loop's pins already require; otherwise the estimate names the dry run skipped
   and why. A dry run stored without an agent version counts, as one stored without an arm digest does.
5. **Then, on the approver's spending consent** (task-151's criterion 7, run after this task's merge): S1, S2, S3 and
   S8 at 1.1 in `baseline` and `wingfoil` on `claude-sonnet-5-5` with
   `--profile campaigns/v0-3-review-loop.dry-run.yaml`,
   their upper bounds given first.
6. Checks: prettier, tsc, `scripts/pre-review.sh main`; an independent read-only review (dl-020); the full suites on
   the approver's go.

## Design

- One worktree under `../WingFoil2-Benchmark-wt/`, no `node_modules` symlink; nothing written in the WingFoil clone.
- This task spends nothing. The only spending it leads to is W19's eight loop dry runs (criterion 5), proposed after
  the merge with their upper bounds and run only on the approver's spending consent; then task-151's figures note and
  W19's "Ends with" close W19, and task-151 goes to done.
- **v0.4's pin refresh** (filed with the follow-up below once this task is done): WingFoil 0.3.2 or later for the
  measured arm (its admission, the arm's manual and digest, the configured variants re-run), Claude Code and Codex at
  their latest, REQ-RUN-20's pins and the next campaign files.

## Follow-up requested by the approver (2026-11-16)

A configuration that **watches WingFoil's releases**, and the agents' (Claude Code, Codex) as well (added 2026-11-16):
on a new release it updates the pins (the memory CLI, the `wingfoil` arm's harness pin, the agent pins in the next
campaign files and the dry-run profile) and prepares a **full campaign for a
major release, a partial one for a minor**, as the approver's `templates` project does to update the versions of its
packs. The campaigns it prepares still need the approver's spending consent before any session (the benchmark's
spending rule). Filed as its own element (a decision-log or a task, the approver's choice) once this task is done: it
is not built here.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->

- **Criterion 1** (`e4c4f42b`, `4e67fb31`): `npm install --save-dev --save-exact wingfoil@npm:wingfoil@0.3.2` wrote
  `"0.3.2"`, not the alias form rule 8 requires; `package.json` set back to `npm:wingfoil@0.3.2` by hand and
  `npm install` re-run (declared: the alias kept; observed: npm drops it with `--save-exact`). The lockfile's integrity
  equals npm's for 0.3.2 (`sha512-A9Uutvf4…`). `--version` prints `0.3.2 (6de2e13c…)`, the commit `v0.3.2` resolves to
  in the clone. `memory add --type task --dry-run` (it would add `task-153-…`) and `memory submit task-152-… --dry-run`
  exit 0 and write nothing; `memory search` reads every element (152 tasks, 50 bugs, 33 decision logs, each the
  count of files). The `wingfoil-cli` directive: none of its entries is named fixed by 0.3.2's changelog; W-03, W-07,
  W-08, W-13, W-14 and W-15 re-run with `--dry-run` on 0.3.2 behave as their entries say (W-08: `park` refused, `not a
  returns state`; W-15: `unknown role 'global'`); version 1.3, *Checked against* `wingfoil@0.3.2` (`6de2e13c`). The
  sync read at `v0.3.2` (the clone read only, its status unchanged) moved F-036 to `resolved` (bug-409 shipped in
  v0.3.2) and warned of twelve notes cited at WingFoil's `origin/main` by elements their row does not name;
  recorded in the inbox's README. `npm ci` re-run on the branch after the lockfile changed: `--version` still 0.3.2.
- **Criterion 2:** the branch's diff against main touches nothing under `arms/`, `campaigns/presets/`,
  `eligibility/`, `configuring/`, `scenarios/` or any `configured/` record, and no existing campaign or profile file.
- **Criterion 3** (`ae5d9d23` red, `fde2c64f`): `campaigns/v0-3-review-loop.dry-run.yaml`, the reference profile's
  pins byte for byte plus the default profile's `review_loop`; its test compares both files as loaded and checks
  `checkDryRun` for the eight keys. Without `--allow-spending`, every one of the eight refuses with "up to the run's
  cap of 3 EUR, and its review loop's up to 18 EUR (5 rounds)": the reference profile's run cap is 3 EUR, not the
  default profile's 5, so a dry run's worst case is 21 EUR, 168 EUR for the eight.
- **Criterion 4** (`38ff7234` red, `2f5b71fd`): `DryRunKey.agent`, filled by the estimate from the campaign's agent
  and by `scenario dry-run` from the profile's; a dry run whose recorded agent name or version differs is skipped and
  named (`dry run <n> ran agent <name> <version>, the campaign pins <name> <version>`), one without a version counts.
  The estimate's provenance note for another agent release is dropped (task-022's Design counted such a dry run with
  a note; the test that pinned it now pins the skip). REQ-CLI-02 amended in 1.59. Checked on the real records: the
  stored dry runs ran Claude Code 2.1.280 (19), 2.1.300 (147) and Codex 0.162.1 (41), and `campaign estimate` prints
  the same for all 13 campaign files before and after the change.
- **The acceptance test** (`3a07dd5c`): `@F4.9 A campaign without a review loop is unchanged` also asserted that no
  dry-run profile under `campaigns/` holds a loop, beyond its scenario's text ("every campaign file of the repository
  still loads"); it now requires every profile to load and only `v0-3-review-loop.dry-run.yaml` to hold one. Red from
  `fde2c64f` to `3a07dd5c`: the pre-review's selection did not run it, the wider targeted run did.
- **Review round 1** (an independent read-only agent, dl-020, at `3a07dd5c`): no blocker. Should-fix, fixed: the sync
  printed twelve warnings, not seven (my reading had cut its output); the README and these notes list all twelve.
  Nits fixed: a dry run naming another agent without a version no longer counts (REQ-CLI-02's text says so), and
  `DryRunRecord.agent` is set only when the record names both; REQ-CLI-05 gains its 1.59 note; `npm ci` re-run and
  recorded. Nits kept: the refusal of criterion 3 is checked by hand, as task-151's dry-run bounds were; the red span
  of the acceptance test above stays in history.
- **Review round 2** (the same agent, at `22ce5e8a`): nits only. Each round-1 fix confirmed, no reader of
  `DryRunRecord.agent` broken, the 13 estimates unchanged again. Kept: a record holding a version without an agent's
  name is matched by its version alone (no stored dry run lacks the name; the spec does not cover it).
- **Pre-review green at `22ce5e8a`**; prettier on every file, tsc and eslint clean; 939 targeted tests green.
