---
id: task-099-v0-2-errata-the-s3-m-f1-finding-withdrawn-and-the-published-texts-corrected
type: task
title: "v0.2 errata: the S3 M-F1 finding withdrawn and the published texts corrected"
status: in-progress
release: v0.2
wave: retrospective
features: []
acceptance: []
requirements: [REQ-RES-05, REQ-RES-02]
fixes: []
tags: ["errata","v0.2","retrospective"]
---

## Context

[rel-v0-2](../release/rel-v0-2.md)'s Retrospective, "What to change" 3: the published finding
`findings/81ebb2691f9c-1-s3-1.0-m-f1-baseline-docs+wingfoil.md` reads as a WingFoil regression on S3's continuity
(M-F1), and so do texts published with it. The transcripts and the scores show otherwise
([calibration v0.2](../../calibration/v0.2.md) §7.3–7.4):

- **D3:** baseline-docs failed it too, in both campaigns; the wingfoil arm's "revised" on v0.2.2 was a false
  positive of the lexical check ("unchanged" contains "changed", and the WingFoil template's comment holds
  "replace");
- **D5:** failed by the wingfoil arm on v0.2.2 and v0.3.0 alike, because the arm's manual read only approved
  decision-logs and recorded only the decisions the agent takes; not a WingFoil change.

**Done** means: the finding is annotated and not sent to WingFoil; every published text that reads it as a
regression carries an errata line; nothing else of the published results changes.

## Acceptance criteria

<!-- Documentation errata: no code. -->

1. The finding carries, under its title, a line: withdrawn, not a WingFoil regression, with the reasons and links.
2. An "Errata (2026-10-24)" line, dated and leaving the original text in place, in: `docs/calibration/v0.2.md`
   §9 (H3's row); [campaign-002](../campaign/campaign-002-v0-2-reference-campaign.md)'s Results review and Findings
   (a hand edit, W-07); `docs/releases/v0.2.md` ("on S3 it lost a decision revision that v0.2.2 recorded").
3. **The GitHub release `v0.2`**'s notes get the same errata line, **only with the approver's explicit consent in
   chat**, since it changes a public page: `gh release edit v0.2 --notes-file docs/releases/v0.2.md`.

## Design

- One commit per file group on this task's branch, then the merge; the GitHub release edited after the merge, from
  the merged notes, with consent.
- The site is unchanged: it does not cite D3.
- The errata say what was wrong and why, and point to calibration v0.2 §7; they never rewrite the original sentence.

## Execution notes

- `npx wingfoil memory add --type task --title "v0.2 errata: the S3 M-F1 finding withdrawn and the published texts
  corrected" --tags "errata,v0.2,retrospective"`, on main. Declared: the element from the template in `draft`, one
  commit. Observed: `106e9165`, `status: draft`. Matches.
- `memory approve` (pending → backlog, `e4c60d0f`): run by this session at the approver's explicit request in chat
  (2026-10-24), the reason saying so. `memory submit` (backlog → in-progress): `42c855e8`. Matches.
- **The errata** (on `task/task-099`, worktree `../WingFoil2-Benchmark-wt/task-099`): `657f5b58` the finding
  withdrawn; `73ee8fd3` calibration v0.2 §9 (H3 and H4); `f4dcc178` campaign-002 (Results review and Findings, a hand
  edit with `Approver:`/`Reason:` trailers); `6390e425` the release notes (the S3 sentence and H3/H4). Dated lines, the
  original sentences kept. The touched tests (docs, results, site, campaign) 406/406; lint 0.

### Review

The rule of dl-020: every finding with a severity; a re-review of the fix's diff after a blocker or a should-fix.

- **Round 1** (an independent read-only agent, the four commits): no blocker. Should-fix: the §9 errata gave the
  template comment as the false positive's cause where §7.4 names "unchanged", and overstated it; the finding and
  campaign-002 cited the evidence as plain text, not links. Nits: the release notes' cause, H4's wording, long first
  lines. All fixed in `e721cc48`.
- **Round 2** (`e721cc48`'s diff): one should-fix: §9's errata explained the campaign's v0.2.2 run while §9 holds the
  calibration dry runs' values (both passes rest on "unchanged"; v0.3.0's also on the template's comment). Fixed in
  `518ddd44`.
- **Round 3** (`518ddd44`'s diff): one nit (v0.3.0's template word is "replace"; the runs in column order), fixed in
  `c5345986` and closed with no new round, as dl-020 says.
