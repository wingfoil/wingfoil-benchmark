---
id: task-133-the-s1-m-k1-finding-annotated-the-manual-s-process-not-the-engine
type: task
title: "The S1 M-K1 finding annotated: the manual's process, not the engine"
status: in-progress
release: v0.3
wave: W16
features: [F5.4]
acceptance: []
requirements: [REQ-RES-05]
fixes: []
tags: ["v0.3","findings","w16"]
---

## Context

The fifth W16 task of [plan-005](../../plans/plan-005-release-v0-3.md), its triage item 4: the S1 M-K1 finding of
`81ebb2691f9c/1` ([findings/81ebb2691f9c-1-s1-1.0-m-k1-baseline+wingfoil.md](../../../findings/81ebb2691f9c-1-s1-1.0-m-k1-baseline+wingfoil.md),
campaign-002's Findings: the wingfoil arm on WingFoil v0.3.0 at 1.70 times the baseline on S1, n = 3) gets its
one-line annotation — the arm's manual imposed WingFoil's process on every step, and the workflow engine never started
([task-095](task-095-wingfoil-v0-3-0-admitted-to-the-wingfoil-arm-the-bridge-s-arm-read-by-its-pinned-digest.md)) —
and is then filed in WingFoil under [dl-009](../decision-log/dl-009-benchmark-findings-linked-to-wingfoil-both-ways-and-verified-by-the-next-campaign.md)
with the approver's consent. The note was exported before
[task-130](task-130-the-cited-template-and-an-interrupted-step-s-cost-bug-031-bug-032.md), and cites v0.2.2's template
(bug-031). A documentation task: no real-agent session, no spending; nothing written into WingFoil by the agent
(dl-009's Consequences) unless the approver asks (criterion 4).

## Acceptance criteria

1. **The note re-exported** with `bench finding 81ebb2691f9c/1 --scenario S1@1.0 --metric M-K1 --arms baseline,wingfoil
   --as decision-log`, so that it cites the template of the WingFoil its wingfoil runs ran (task-130); the diff against
   the committed note is that line alone, every figure unchanged.
2. **The annotation**, one hand-written line, said so in the commit (dl-009 point 2's rule for hand-written lines, here
   extended to a second line): in the note under its title and in its WingFoil block's Context, so that it travels with
   the filing. Its wording, the approver's (chat, 2026-11-04, after review round 1 found "approval requests at every
   step" an overclaim): "Reading: the wingfoil arm's manual had the agent itself carry WingFoil's sequence of commands
   at every step, inside its own session: read its role's rules and the approved decisions, add each request as a task
   and each design decision as a decision-log, submit every one, and ask for an approval when its work needed one (1
   step of 15). WingFoil 0.3.0's workflow engine was never started (task-095). The 1.70× the baseline's mean cost per
   run (n = 3) is the cost of that process carried by hand, as the manual set it, not of the process run as WingFoil
   commands, where an agent would execute each step and a person give only the approvals." Its figures recomputed by
   a script.
3. **campaign-002's Findings** carry the same reading beside the note.
4. **The filing** (dl-009): the decision-log text to paste, from the note's WingFoil block with the annotation, handed
   to the approver with the `wingfoil memory add` command for the WingFoil repository; filed only with the approver's
   consent, by the approver unless the approver asks the agent in chat; once filed, its id written back under the
   note's title and in campaign-002's Findings (dl-009 point 2).
5. Checks: prettier, `scripts/pre-review.sh main`; an independent review (dl-020).

## Design

- `findings/81ebb2691f9c-1-s1-1.0-m-k1-baseline+wingfoil.md`: re-exported, then the annotation added in its two places.
- `docs/memory/campaign/campaign-002-v0-2-reference-campaign.md`: the reading beside the note in Findings.
- The ratio from `results/81ebb2691f9c/1/aggregate.json` (the S1@1.0 groups' mean M-K1), by an inline Node command
  quoted in the Execution notes.
- No code changes; the full suites only if the approver asks (documentation alone).

## Execution notes

- **Re-export:** `bench finding` never overwrites a note, so the committed one was removed first and the command run
  again; `git diff` showed the template line alone ("WingFoil v0.2.2 (12537b62)" → "WingFoil v0.3.0 (cc31d7a8)"),
  every figure unchanged. Its own commit (`f6841ae3`).
- **The ratio**, from `results/81ebb2691f9c/1/aggregate.json` by an inline Node command (the S1@1.0 groups' cost per
  run): baseline mean 0.3454 EUR, n 3; wingfoil mean 0.5857 EUR, n 3; ratio 1.70.
- **The reading**, the note's one hand-written line, in its own commit said so: under the title and as "### The
  reading" in the WingFoil block's Context; campaign-002's Findings carry it.
- **Deviation, `scripts/pre-review.sh`:** its Markdown check flagged the note's re-exported template line (236
  characters, one line as `bench finding` writes it). The generated notes under `findings/` are now left out, as
  `results/` is (bug-040), red first in `test/unit/scripts/pre-review.test.ts`; the note's hand-written reading is
  wrapped at 120 by hand.
- **The reading reworded** (the approver, chat 2026-11-04): round 1 counted the 15 wingfoil S1 steps — a task added
  and submitted in 15, a decision-log in 12, an approval asked in 1 (the agent's own count, from `run.json`'s
  interventions and `commits.json`, agrees) — and the approver chose the command-sequence wording above, in the note's
  two places and in campaign-002, which adds baseline-docs' 1.33× the baseline (n = 3; wingfoil 1.27× baseline-docs).
- **WingFoil feedback F-047** (the approver's choice, chat 2026-11-04): "An agent that carries the process by hand pays
  for it in its own context", the approver's reading of WingFoil's work as a near-deterministic sequence of commands,
  stated generically, with its ledger row; the method page, dl-021 and H1's verification left as they are.
- **dl-009's one hand-written line** is extended here to two (this reading, then "Filed in WingFoil as …" once filed):
  said so to the approver with the filing.
- **The filing** (criterion 4; the approver asked the agent, chat 2026-11-04, and declined the full suites): in the
  WingFoil repository, on its `main` (four uncommitted changes there, not this task's, left alone), with its own CLI
  (`node dist/cli.js`, WingFoil 0.3.2): `memory add --type decision-log` made `dl-207-…` (`ae38906b9`); its body is
  the note's WingFoil block, the reading included, with Decision, Rationale and Actions left to fill and a Relations
  section (dl-147's Action 2 verified as missed); committed `bdf890c11` with WingFoil's own trailers
  (`Co-Authored-By: Claude`, `AI-Model`); left `draft`, not submitted, not pushed. The way back (dl-009 point 2): the
  "Filed in WingFoil as" line under the note's title (`3877e70e`), and campaign-002's Findings.
- **Deviation from dl-009's Consequences** ("nothing is written into the WingFoil repository by the benchmark or its
  agent"), at the approver's request in chat (2026-11-04), which criterion 4 allows: the agent wrote dl-207 there. At
  review round 5, dl-207's Relations reworded in WingFoil (`1be558880`): dl-147's Action 2 is re-measured, not
  "missed", since it asked for the engine and the engine never ran; the benchmark's private names left out. The
  note's path stands for its permalink until the benchmark's v0.3 tag (dl-009 point 1).
- `wingfoil memory add`, `submit` (draft → pending, backlog → in-progress): as declared.

### Review

**Round 1** (2026-11-04, a fresh read-only agent in `/tmp/claude-1000/review1-133-OS9I`, a clone of `40ffdf76`; no
command in either checkout). The re-export reproduces the note but for the reading; the figures and the arm's manual
(its digest recomputed) confirmed; no workflow commit and nothing under `.wingfoil/` in the runs. One should-fix,
five nits:

| # | Finding | Outcome |
|---|---|---|
| S1 | "approval requests at every step" overstates (1 of 15) and leaves out the rules' and decisions' reading | fixed: the approver's wording (chat 2026-11-04), in the three places |
| N1 | "1.70×" without saying of what | fixed: "the baseline's mean cost per run (n = 3)" |
| N2 | baseline-docs' 1.33× worth a clause in campaign-002 | fixed |
| N3 | `pre-review.sh`'s new comment line 121 characters | fixed |
| N4 | dl-009 allows one hand-written line | fixed: stated as an extension, here and with the filing |
| N5 | red-first only claimed in one commit | kept: the reviewer confirmed it against main's script |

**Round 2** (2026-11-04, a fresh read-only agent in `/tmp/claude-1000/review2-133-SIBm`, a clone of `635a2200`; no
command in either checkout). The reading identical in its three places and its facts confirmed (15 steps, 15 tasks,
12 decision-logs, 1 approval, no workflow command; 1.70×, 1.33×, 1.27×, n = 3); the note re-exports but for it. Two
should-fix in F-047, both fixed: the agent's instruction is said to go beyond WingFoil's guide (which sets no level of
process), lest the cost read as the guide's; and the sequence is named command by command, as the inbox's rule asks
(reproducible with WingFoil alone). Nits fixed: `init --template Kanban`; no `workflow start` and no `agent execute`
run, F-041 cited; Expected's request first; baseline-docs' rules "as a Markdown file"; the script comment's wrap.

**Round 3** (2026-11-04, a fresh read-only agent in `/tmp/claude-1000/review3-133-tYDZ`, a clone of `a8c32cd4`; no
command in either checkout). Round 2's items confirmed against the campaign's manual and setup (`77b4fea0`). No
blocker; one should-fix, fixed: F-047's Expected named branches ("an agent is blocked or a plan is paused") WingFoil
0.3.0 does not have; it now says the branches belong to the approver's reading, not to what 0.3.0 implements. Nits
fixed: the approvals' list reworded; `approve` with `--reason` and an identity holding the approver role; "mean cost
per run"; "inside that request's session".

**Round 4** (2026-11-04, a fresh read-only agent in `/tmp/claude-1000/review4-133-9rgm`, a clone of `7419f3ce`; no
command in either checkout). Round 3's items confirmed against the campaign's manual and setup. No blocker, no
should-fix; its one nit, fixed: the files and the judgement said to be what the sequence holds, not a fourth step.

**Round 5** (2026-11-04, a fresh read-only agent in `/tmp/claude-1000/review5-133-9NvH`, a clone of `a9000f94`; it
read dl-207 and dl-147 by path; it ran one read-only `git -C <main checkout> reflog -0`, against its brief, which
printed and wrote nothing, main's HEAD and reflog checked unchanged after). dl-207's Context equals the note's block;
the re-export holds but for the hand-written lines. Two should-fix, both fixed: the Execution notes' stale filing line
and Context, and the deviation from dl-009 recorded; "dl-147's Action 2, missed" overclaimed (the engine never ran),
reworded in dl-207 and campaign-002. Nits fixed: the private names left out of dl-207; its permalink to come with the
tag; the note's Filed line wrapped.
