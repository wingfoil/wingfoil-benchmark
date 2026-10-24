---
id: task-101-campaign-presets-and-extends-and-campaigns-run-on-their-own
type: task
title: "Campaign presets and extends, and campaigns run on their own"
status: approved
release: v0.3
wave: W15
features: [F1.1]
acceptance: [campaign.feature]
requirements: [REQ-FMT-01, REQ-FMT-02, REQ-CLI-01, REQ-CLI-13]
fixes: []
tags: ["campaign","presets","v0.3"]
---

## Context

[dl-022](../decision-log/dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)
(approved 2026-10-24): any campaign runs through `campaign-cycle` whenever the approver wants, and a campaign file may
extend one preset. It is the first task of [plan-005](../../plans/plan-005-release-v0-3.md)'s W15, before the Codex
campaign (task-102), whose subscription ends on 2026-11-13. If it is not approved by **2026-11-05**, the Codex
campaign runs from a whole hand-written file (dl-022's fallback) and this task continues without the deadline.

**Done** means: `campaigns/presets/` holds the four presets of dl-022, a campaign file with `extends:` resolves,
validates, estimates and runs, its id is the digest of the resolved campaign, and the existing campaign ids are
unchanged.

## Acceptance criteria

1. A preset is a partial campaign file under `campaigns/presets/<name>.yaml` with a required one-line `description:`;
   a preset with `extends:` (a chain) or without `description:` is refused. **Red-first** (`campaign.feature`).
2. `extends: presets/<name>.yaml` in a campaign file merges the preset under the file: maps merged by key, lists
   replaced whole, the file's keys winning. **Red-first.**
3. The campaign's id is the first 12 hex of the SHA-256 of the resolved campaign's canonical JSON; a file without
   `extends:` resolves to itself, so `81ebb2691f9c` and `bf3a1ac7dff5` keep their ids. **Red-first** for the resolved
   id, **characterization** for the existing ids.
4. The resolved file is written into each execution's results next to `run.json`. **Red-first.**
5. `bench campaign presets` lists the presets with their descriptions; `bench campaign validate <file>` prints the
   resolved campaign. **Red-first.**
6. `estimate` and `run` read the resolved campaign and are otherwise unchanged. **Characterization.**
7. The four presets of dl-022 (`reference`, `baseline-across-agents`, `harness-vs-docs`, `smoke`) and the
   `repetitions` preset of [dl-023](../decision-log/dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset.md)
   if it is approved first; each validates when extended by a minimal file. **Red-first.**
8. `campaign-cycle.yaml`'s header and `release-cycle` › `campaign` say that a campaign runs on its own and that a
   release requests its own campaigns (a configuration change). **Characterization** (the workflow tests pass).

## Design

- **The specification first, in this task:** requirements 1.34 (REQ-FMT-01, REQ-FMT-02 amended: presets,
  `extends:`, the id over the resolved file, the resolved file in the results; REQ-CLI: `campaign presets`,
  `validate`'s printed resolution), `campaign.feature` amended, traceability amended. Committed before the red tests.
- **The loader** (`src/campaign/load.ts`): read the YAML, and when it has `extends:`, read the preset from
  `campaigns/presets/` (a path that leaves `campaigns/presets/`, a missing preset, a preset with `extends:` or
  without `description:` refused), merge the preset under the file, drop `extends:` and the preset's `description:`,
  then validate (`campaignSchema`, unchanged) and hash the resolved object. `campaignId` already hashes the object as
  parsed, so a file without `extends:` keeps its id.
- **The results:** the runner copies the campaign file into each execution as `campaign.yaml`
  (`src/runner/run.ts`, `source`), which `aggregate`, `compare` and `finding` read with the pins schema. A file
  without `extends:` is still copied byte for byte; a file with it is written resolved, as YAML, so that every
  reader and the finding's reproduction line (`cp …/campaign.yaml campaigns/<id>.yaml`, the same id) are unchanged.
  dl-022's "next to `run.json`" is read as the execution's `campaign.yaml`, one per execution.
- **The CLI:** `bench campaign presets` (a new REQ-CLI) reads `campaigns/presets/*.yaml` and prints name and
  description; `validate` prints the resolved campaign after its checks when the file extends a preset.
- **Out of scope:** dry-run profiles (`*.dry-run.yaml`) do not extend presets; the Codex campaign's profile is written
  whole (task-102).
- **No generator** (dl-022's option C rejected) and no flags in place of a file (option D rejected).
- The existing campaign files are not touched.

## Execution notes

- `npm run -s wingfoil -- memory add --type task --title "…" --tags "…"` on main, at v0.3's release-planning
  (2026-10-24). Declared: the element from the template in `draft`, one commit. Observed: as declared.
- The body committed by hand (`e7a5e1e2`), then `memory submit` (draft → pending). Declared and observed: one commit,
  `status: pending`.
- `memory submit` (backlog → in-progress, `2525cbe0`) on main, after the Design (`ba3007a4`). Declared and observed:
  one commit, `status: in-progress`.
- **Build** (on `task/task-101`, worktree `../WingFoil2-Benchmark-wt/task-101`, its own `npm ci`): requirements 1.34
  and traceability 1.5 (`8f1587b4`); red: campaign.feature 1.2's five scenarios and the unit tests (`1cb3b839`);
  code (`f7125217`); the workflows, release-cycle version 5 and campaign-cycle's header (`48d1d7cb`).
- **Slip, disclosed:** the usage text gained `bench campaign presets` in the code commit, and its two tests
  (`test/bin/bench.test.ts`, then `test/unit/cli/main.test.ts` in review round 1) were updated after it: test-after
  for that one line. `scripts/pre-review.sh main` caught the first (`test:bin` red), the review the second.
- `npm run -s wingfoil -- workflow list` exits 0 and reads release-cycle version 5.
- **Not in this task:** dl-023's joining rule (a repetition campaign's runs counted with the reference campaign's
  group of the same key, REQ-RES-03); the `repetitions` preset says so in its header.

### Review

Under dl-020 and the `code-review` directive; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, `git diff main...HEAD` at `829cc31e`):
  - **blocker:** `test/unit/cli/main.test.ts`'s usage regexes not updated (12 tests red). Fixed in `c73ae19d`.
  - **should-fix:** REQ-CLI-13's error path: the listing printed nothing when one preset was broken, and named it
    `extends:`. Fixed: red `c73ae19d`, fix `c767d6b1` (valid presets listed, each broken one named by its file with
    its refusal, exit 1).
  - **should-fix:** a file extending a superset preset (reference, smoke) cannot narrow arms or scenarios, unstated.
    Fixed: REQ-FMT-01 1.34 states it, a refused resolved campaign ends with a hint naming the preset, and the
    reference preset's header says so (`c767d6b1`).
  - **should-fix:** tests missing for a non-string `extends:`, a preset in a subdirectory, a resume and an estimate
    of an extending campaign. Added in `c73ae19d` (they pass: the behaviour already held).
  - **nits, fixed:** a symlinked preset refused; `..x.yaml` accepted; a misplaced file with `extends:` refused for its
    place first (its first version reordered every file's checks and broke `test:bin`, fixed in `1b932475`); a
    non-string description worded as "no one-line description"; the reference preset says it resolves to
    campaign-002's id.
- **Round 2** (a new independent agent, the fixes' diff `829cc31e..HEAD`): the fixes correct and complete, no
  regression (red-first checked at `c73ae19d`).
  - **should-fix (process):** these Review notes were not yet written. Fixed here.
  - **nits, fixed** in `f3298443`: a dangling symlink and a symlinked `campaigns/presets/` refused as symbolic links
    (red `6ab3f72e`); a unit test pinning the order of checks for a misplaced file that extends nothing
    (characterization, green at `6ab3f72e`); the hint worded for any refusal of the resolved campaign (its test's
    pattern reworded in the fix); smoke's header on what a file cannot remove (no test).
- **Round 3** (a new independent agent, `1b932475..HEAD`): the code fixes correct, no regression; the notes checked
  against the history.
  - **should-fix:** smoke's new header recommended extending harness-vs-docs or baseline-across-agents with S3, which
    the loader refuses (both set `repetitions` for every scenario); reference's header said the same for scenarios.
    Fixed: both headers name the presets that leave those fields out (harness-vs-docs for arms, repetitions for
    scenarios), the recipes the unit tests' minimal files already validate.
  - **nits, fixed:** this round 2 note made exact; a symlinked `campaigns/presets/`, dangling or not, named once by
    the listing instead of once per file (red `fa91234f`, fixed in the commit after it).
- **Round 4** (a new independent agent, `9d38e7d7..HEAD`): **clean**, no finding. Each recipe the headers state
  loads (harness-vs-docs with fewer arms; repetitions with fewer scenarios, and with S3 once in fewer arms), and the
  old recipes are refused; the red `fa91234f` precedes the fix `d37d6a2b`; the notes checked against the history.
  The review is closed.
- **Rounds:** 4; the should-fix of rounds 2 and 3 were in notes and comments, not code.
