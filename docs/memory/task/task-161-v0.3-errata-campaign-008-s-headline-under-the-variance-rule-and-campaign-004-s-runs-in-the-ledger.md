---
id: task-161-v0.3-errata-campaign-008-s-headline-under-the-variance-rule-and-campaign-004-s-runs-in-the-ledger
type: task
title: "v0.3 errata: campaign-008's headline under the variance rule, and campaign-004's runs in the ledger"
status: in-progress
release: v0.3
wave: retrospective
features: []
acceptance: []
requirements: [REQ-RES-03]
fixes: []
tags: ["errata","v0.3","retrospective"]
---

## Context

[rel-v0-3](../release/rel-v0-3.md)'s Retrospective, "What to change" 1 and 6, and the approver's decisions of
2026-11-22:

- **campaign-008's headline changed without a note.** Its element's Publication records the headline of the site
  built on 2026-11-01: against the baseline, wingfoil better in 4, worse in 2 of 6 comparisons across categories C–F;
  baseline-docs better in 2, worse in 4. When the site was rebuilt for campaign-009, bug-030's rule (task-129,
  requirements 1.49, REQ-RES-03: better or worse only beyond the variance) was applied to every execution, and the
  published page of `33b54dd89e8b/1` now reads, for both arms, better in 1, worse in 1, within the variance in 4 of 6.
  Only the method page's `#headline` says that pages built before 1.49 counted any difference of the means. No rerun:
  the runs are unchanged, only the reading.
- **campaign-004's runs are missing from the spending ledger.** `docs/calibration/v0.3-ledger.md` holds its dry runs
  but none of its campaign runs (6.11 USD API-equivalent, 0 € spent: ChatGPT Plus, dl-024), so the retrospective's
  Codex figure (68.60 USD) leaves them out.

**Done** means: every published or recorded text that states campaign-008's old counts carries a dated erratum, the
original text left in place; the ledger holds one line per campaign-004 run; nothing else of the published results
changes.

## Acceptance criteria

<!-- Documentation errata: no code, so no red-first test. -->

1. [campaign-008](../campaign/campaign-008-claude-code-step-a-campaign-on-haiku-5.5-and-sonnet-5.5-every-scenario-on-approver-policy-v5.md)'s
   Publication gets a dated "Erratum" line under the headline: the counts under requirements 1.49, the
   reason (bug-030, task-129) and a link to the method page's `#headline`; the original sentence stays (a hand edit,
   W-07).
2. The catalogue entry `33b54dd89e8b/1` in `site-content/catalog.yaml` gets an erratum note in the same words, in the
   form of the existing "Erratum (bug-026)" notes; the site is rebuilt and the page shows it.
3. `docs/releases/v0.3.md` gets the same erratum line where it lists campaign-008. **The GitHub release `v0.3`**'s
   notes and the published site (`gh-pages`) are updated **only with the approver's explicit consent in chat**,
   since both are public: the commands are handed over (`gh release edit v0.3 --notes-file docs/releases/v0.3.md`,
   the site's publish).
4. `docs/calibration/v0.3-ledger.md` gets one line per campaign-004 run, in its columns, generated from the runs'
   stored records (`results/4682bcc65d6b/`), never typed; the lines' sum is stated in the task's notes and checked
   against 6.11 USD; the retrospective's spending row is corrected if the sum differs.

## Design

- The ledger lines come from a script: `scripts/ledger-lines.mjs` gains a `campaign <results-dir>` mode if the
  existing modes cannot read a campaign's runs, with a unit test (red first) for that mode; otherwise a one-off
  command recorded in the notes.
- One commit per file group on this task's branch, then the merge; the public pages changed after the merge, from
  the merged files, with consent.
- The errata say what changed and why; they never rewrite the original sentence or the scores.

## Execution notes

- **Started** on 2026-11-22: branch `task/task-161-…` in `../WingFoil2-Benchmark-wt/t161`, `memory submit task-161`
  backlog → in-progress (`6c91d73f`); declared and observed alike.
- **The ledger's mode.** The existing modes read only configuring records and dry runs, so `scripts/ledger-lines.mjs`
  gained `campaign <root> --execution <id>/<n>` (Design's first branch), red first (`test(scripts)` commits before
  each `feat(scripts)`). The dry-run and campaign lines share one function, `runRow`. Codex transcripts record no
  timestamp, so a campaign run without one takes its execution's `started` (a second red-first test).
- **campaign-004's lines**, generated from the main checkout (read only, where the git-ignored transcripts live) with
  the token file passed as a path: 18 lines, all dated 2026-10-25, every secret scan clean, inserted after
  `dry-runs/77`, before campaign-004's run. Their sum, computed from the lines: 6.1067 USD (5.4453 €), the 6.11 USD of
  `3799c054`. The Codex total over the ledger's lines is now 74.71 USD (151 lines); rel-v0-3's spending row and the
  release notes say so (the release notes with a dated erratum, the original row kept).
- **campaign-008's erratum**, dated 2026-11-22, in its element's Publication (under the original headline, a hand
  edit, W-07), in the catalogue's notes of `33b54dd89e8b/1` and in `docs/releases/v0.3.md` after the campaigns' table.
  The new counts are those of the page the site build prints today. Prettier also requoted one existing note of
  `1f70fcaf2ec2/1` in `site-content/catalog.yaml` (the file was not formatted on main).
- **The site**, built in this worktree (`bench site build 33b54dd89e8b/1`, then `1f70fcaf2ec2/1` so that the root
  leads to the reference): the erratum shows on `site/33b54dd89e8b/1/index.html`. Publishing it (`gh-pages`) and
  editing the GitHub release `v0.3` wait for the approver's consent in chat, after the merge.
- `scripts/pre-review.sh main`: green (eslint, tsc, 44 tests in 3 files).

### Review
