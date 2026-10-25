---
id: task-104-the-site-s-catalogue-a-home-grouped-by-kind-and-the-across-agents-comparison-page
type: task
title: "The site's catalogue, a home grouped by kind, and the across-agents comparison page"
status: in-progress
release: v0.3
wave: W15
features: [F5.5, F5.2]
acceptance: [results.feature, comparison.feature]
requirements: [REQ-RES-02, REQ-RES-04, REQ-RES-07, REQ-CLI-12]
fixes: []
tags: ["site","codex","v0.3"]
---

## Context

[campaign-004](../campaign/campaign-004-codex-baseline-campaign.md) (the Codex baseline campaign, dl-022 arm A) is
`reviewed`: the approver accepted its results as publishable (2026-10-25), to be published only as their own
cross-agent comparison, never mixed with the Claude headlines (T14, dl-022). The site cannot do that today:

- `site/index.html` (REQ-RES-02 and REQ-RES-04 as amended in 1.26) lists every published execution flat, by
  hexadecimal id, without saying what each is; the Codex execution would come first, beside the reference campaigns;
- an execution's landing page has a headline across arms ("harness, not model"), meaningless for one arm;
- the cross-agent comparison of task-094 (`m_r_across`, REQ-SCO-13 as amended in 1.32) exists only in JSON
  (task-094's follow-up).

W15 of [plan-005](../../plans/plan-005-release-v0-3.md), before task-103, the approver's choice in chat (2026-10-25),
with the home's three groups and titles as proposed there. **Done** means: the site's catalogue, the home grouped by
kind, the across-agents page for `4682bcc65d6b/1` against `81ebb2691f9c/1`, and a one-arm landing page, built from
the committed results; publishing stays the approver's (`bench site publish`, campaign-004 reviewed → published).

## Acceptance criteria

1. **The catalogue:** `site-content/catalog.yaml` gives each published execution a title, a kind (`reference`,
   `bridge`, `across-agents`), the release, its agent and arms, and what it is compared with (its date is its
   `execution.json`'s); it is not part of any campaign
   file, so no campaign id changes. `bench site build` refuses an execution under `site/` with no catalogue entry, and
   an entry of an unknown kind, naming it. **Red-first** (`results.feature`).
2. **The home** (`site/index.html`) shows the preliminary and T1 statements, then the executions grouped by kind in
   the order reference, bridge, across-agents, each group under its heading and one-line description, each execution
   newest first with its title, date, agent and models, arms, and links (the execution, its comparisons, an erratum
   when the catalogue names one). **Red-first.**
3. **The across-agents page** `across-agents-<earlier-id>-<m>.html` in the newer execution's directory, rendered for a
   comparison `bench campaign compare` made of two executions whose agents differ (REQ-CLI-12): the baseline arm, one
   row per scenario and model of each agent, with final public and hold-out tests, checks over every scored step, M-F1,
   API-equivalent cost and its basis (`price-table` flagged), M-R1 and M-R2 within each agent and across (`m_r_across`),
   each value's `n`, and the preliminary badge below n = 3; no headline and no ▲/▼; the disclosures at its top (the
   subscription and the price table, the models' generations, the lexical checks of bug-026, S1's step 5 of bug-025).
   M-R across measures a baseline group although the other campaign pins harnesses its baseline does not use.
   **Red-first** (`comparison.feature`).
4. **A one-arm execution's landing page** says "baseline only: no harness compared" in place of the headline, and
   links its across-agents comparison. **Red-first.**
5. The catalogue holds the four executions: `81ebb2691f9c/1`, `c82a5e74885b/2` (reference), `bf3a1ac7dff5/1`
   (bridge), `4682bcc65d6b/1` (across-agents); the existing executions' pages are otherwise unchanged.
   **Characterization** (the site tests and `bench site publish`'s checks pass).

## Design

- **The specification first:** requirements 1.36 — REQ-RES-02 (the site also reads `site-content/catalog.yaml` and, for
  an across-agents comparison, the earlier execution's `aggregate.json`), REQ-RES-04 (the publish check's root index is
  the catalogue's), REQ-RES-07 (the across-agents page), REQ-RES-11 (new: the catalogue and the home), REQ-SCO-07 (M-R
  across measures a baseline group although the other execution pins harnesses it does not run); `results.feature` and
  `comparison.feature` amended; traceability (F5.5, F5.2, T14). Committed before the red tests.
- **The catalogue** is `site-content/catalog.yaml`, beside `profiles.yaml` and `contests.yaml`, the site's other
  maintainer-written inputs (the Context said `campaigns/`: `site-content/` is where the site's inputs live, and
  `campaigns/` holds what runs). Per execution `<campaign-id>/<n>`: `title`, `kind`, `release`, `agent` (a line),
  `arms` (a line), optional `notes`, `erratum` (an `https://` link: the site is published apart from the repository)
  and `compared_with` (the executions its comparison pages are against). Its schema in `core`, read by
  `src/site/profiles.ts`.
- **The home** (`rootIndex`, `src/site/profiles.ts`): the executions under `site/` grouped by kind, each group under
  its heading and one-line description; within a group, newest first by `execution.json`'s end (the date stays the
  only one on the page, REQ-RES-02 1.26); a built execution with no entry, an entry of an unknown kind, or a
  `compared_with` whose comparison is not written refuses the build and the publish check, naming it. The links'
  kind comes from each comparison's agents. `publish.ts` recomputes the same function, so its byte-for-byte check
  is unchanged in shape.
- **The across-agents page:** a comparison whose two sides' `agent.name` differ is rendered as
  `across-agents-<earlier-id>-<m>.html` in the newer execution's directory, instead of `compare-…`; the landing page
  links it under "Compared across agents". Rows: per scenario of the baseline arm, one row per model of each side, from
  the two aggregates: final public and hold-out, checks over every scored step, M-F1, API-equivalent cost with its
  basis, M-R1 and M-R2 within, then the `m_r_across` row of the group. No headline, no ▲/▼, each value's `n` and the
  preliminary badge below n = 3; the disclosures at its top come from the catalogue entry's `notes` (the subscription
  and price table, the models' generations, bug-026, bug-025), so that the page states what the maintainer recorded.
- **M-R across's pins** (`acrossNoteOf`, `src/results/campaign-compare.ts`): per group, the harness and digest pins
  of that group's arm only, so that a baseline group is compared although the other campaign pins harnesses its
  baseline does not use; caps, approver policy and rate still whole. The comparison file's version is unchanged; a
  comparison written before reads as before.
- **A one-arm landing page** (`landingContent`, `src/site/render.ts`): "Baseline only: no harness is compared in this
  execution." in place of the framing and the headlines, and its across-agents links first.
- **The data:** after the merge, the approver's `bench campaign compare 81ebb2691f9c/1 4682bcc65d6b/1` writes the
  comparison; the catalogue's four entries are in this task.
- **Out of scope:** dl-022's arm B; publishing (`bench site publish`, campaign-004 reviewed → published).

## Execution notes

- `memory add`, the body (`docs(task)`), `memory submit` (draft → pending) on main on 2026-10-25; the approver's
  pending → backlog (`dcb2ae0b`, run by the approver); `memory submit` (backlog → in-progress) on main. Declared and
  observed: one commit each.
- **Build** (on `task/task-104`): the Design (`74c9af85`); requirements 1.36 and traceability 1.6 (`11eab00b`, then
  `faaf2b38`); red (`36526276`); code (`68570af3`); `main` merged (`f67f9904`) for
  campaign-004's committed results (`3799c054` on main: REQ-RES-06's records of `4682bcc65d6b/1` and its dry runs had
  not been committed by the campaign step; committed there as campaign-002's were, `55d47017`).
- **Tests changed with the code, disclosed:** the root index's tests of task-085 (`profiles.test.ts`) now read the
  grouped home; `build.test.ts` and `comparison.feature`'s "A published link keeps showing the same values" give the
  second execution its catalogue entry and read the home's titles; the site fixture writes a catalogue entry for its
  execution and keeps earlier ones; `campaign-compare.test.ts`'s review-1 test asserts the per-arm rule, its baseline
  only that no pin blocks it (hand-built runs have nothing to measure; the acceptance scenario measures real ones).
- **A check on the real data** (in the worktree, the generated files removed after): `bench campaign compare
  81ebb2691f9c/1 4682bcc65d6b/1` matched 4 groups, the baseline's M-R across measured in each (S1 M-R1 164/165); `bench
  site build 4682bcc65d6b/1` wrote 22 pages, the across-agents page among them, and the home's "Across agents" group.
  It showed turns are not comparable across agents (Codex one a request, Claude Code one an assistant message): the
  column was removed, REQ-RES-07 1.36 says so.
- **The Design's deviations:** the catalogue's schema lives in `src/site/profiles.ts` beside the profiles' (not in
  `core`): only the site reads it.

### Review

Under dl-020; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, sandboxed; the reflog unchanged after it): red-first checked (9 tests
  red at `36526276`); every page of `81ebb2691f9c/1` byte-identical between main and the branch, `site/index.html`
  aside; the published comparisons unchanged when recomputed; the catalogue's facts checked against the campaigns.
  - **blocker:** the cost column mixed Codex's price-table means with Claude's agent-reported ones, unflagged. Fixed:
    each cost says its basis, "reported by the agent" or "price table" (from the aggregate's `cost.unpriced`).
  - **should-fix, fixed:** M-R1, M-R2 and M-R across without their n or badge; the home's comparison links built from
    `compared_with` and the kind, not the comparisons written (now a `compared_with` with no comparison file refuses
    the build, and the link's kind is the comparison's agents); a docs control measured across agents although its
    source's harness differed (now only the baseline is relieved of the other arms' harnesses; REQ-SCO-07 1.36
    restated); the Checks column summing only each check's last step, unlike campaign-004's table (now every scored
    step, aligned by run, each value with its own n); the page's cells untested (hold-out, checks, M-F1, the cost's
    basis, a non-baseline group left out, escaping, a dash); criterion 3 and the Design still naming turns, and
    criterion 1 a date (corrected; the turns' removal was the check on the real data's finding, reported to the
    approver).
  - **nits, fixed:** an M-R across entry with no value reads "not measured".
  - Red `4902fe6d`, fix `7cf90a48` (the red's check fixture lacked its second step; added in the fix, disclosed).
- **Round 2** (a new independent agent, sandboxed; the reflog unchanged after it, the fixes' diff): the fixes correct on
  the real data (every Codex value of the across-agents page matches campaign-004's table; the cost basis on every
  cell; the published comparisons byte-identical when recomputed; building 4682bcc65d6b/1 before the comparison is
  refused, naming the compare).
  - **should-fix, fixed:** REQ-RES-11 did not state the new refusal of a `compared_with` whose comparison is not
    written, nor that the link's kind comes from the comparison; now it does, with the publishing order it implies (the
    comparison run and committed before the home is built), as do `rootIndex`'s comment and the Design.
  - **nits, fixed:** a comparison file that is valid JSON but not a comparison crashed the build (now refused); the
    alignment of checks by run, a value's own n and a mixed cost basis pinned by a test (characterization: the code
    already did it); the Design's wording on REQ-SCO-07 and the badge. **Stated:** a failed rebuild in the publish
    check also lists the execution's pages as not part of a fresh build, as any failed rebuild already did.
  - Red `7830c6a8`, fix `3b017fa3`.
