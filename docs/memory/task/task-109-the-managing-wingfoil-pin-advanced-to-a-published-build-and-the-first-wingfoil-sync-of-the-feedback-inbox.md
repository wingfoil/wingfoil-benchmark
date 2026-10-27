---
id: task-109-the-managing-wingfoil-pin-advanced-to-a-published-build-and-the-first-wingfoil-sync-of-the-feedback-inbox
type: task
title: "The managing WingFoil pin advanced to a published build, and the first wingfoil-sync of the feedback inbox"
status: in-progress
release: v0.3
wave: W15
features: []
acceptance: []
requirements: [REQ-NFR-02]
fixes: []
tags: ["v0.3","wingfoil","governance"]
---

## Context

The WingFoil build that **manages this repository** (its Memory, workflows and directives; not the builds the arms run
inside their containers, `wingfoil-cli` rule 9) is still the unpublished development tarball
`vendor/wingfoil-0.2-pre-3df305e.tgz`, a `file:` devDependency that prints `0.1.0` for `--version` (F-005).
[plan-005](../../plans/plan-005-release-v0-3.md) puts **the first `wingfoil-sync` of the feedback inbox together with
advancing that pin**, in one task, in W15 after the Codex campaign started (the approver's decision of 2026-10-24).
The inbox (`docs/wingfoil-feedback/`, 42 notes F-001 to F-042, WingFoil dl-163) has never been synced
("**Last sync:** none").

WingFoil now documents both halves (its bug-408, fixed on `release/0.3` for 0.3.1): `COLLABORATION.md` §"Contributor
setup" (a published build pinned as `npm:wingfoil@<version>`, moved forward only, one commit per switch) and §"The
sync points" / §"The sync procedure" (read the newest retrospective's `## Consumer feedback` table and its triage
record, find every element citing `svc-020…/F-<nnn>`, update each note's `status` and `answered_by` by the published
mapping, commit). On 2026-10-27 npm publishes `0.2.1`, `0.2.2` and `0.3.0` (`latest`); 0.3.1 is not yet published.

**No real-agent session. Spending: 0 €.**

**Done** means: the managing build is a published WingFoil version, every Memory, workflow and directive operation
this repository uses checked on it; every note of the inbox synced against WingFoil's published answers, the sync
recorded; the `wingfoil-cli` directive re-checked against the new pin.

## Acceptance criteria

1. **The pin:** `package.json`'s devDependency becomes the newest published version at the task's start
   (`npm:wingfoil@0.3.0` today; `0.3.1` if it is published by then), the vendored tarball removed, `npm ci` and
   `npm run -s wingfoil -- --version` printing that version. **Characterization.**
2. **This repository on it:** `memory search`, `add`, `submit`, `approve`, `reject`, `deprecate` (on throwaway
   elements in a scratch clone, never on main's Memory), `workflow list` and the custom workflows
   (`campaign-cycle`, kanban-delivery v6) and directives read; each difference from 0.2-pre recorded declared against
   observed; anything that breaks fixed, or the pin held back and the reason recorded. **Spike.**
3. **`bench finding`'s templates** (`src/results/finding.ts`: WingFoil's `bug` and `decision-log` templates "of the
   development pin `3df305e`, byte for byte") re-checked against the new pin, and updated with their test if they
   differ. **Red-first** if they differ, **characterization** otherwise.
4. **The sync**, by `COLLABORATION.md`'s procedure: WingFoil fetched with its tags; the `## Consumer feedback` table of
   `retro-v0.3.md` and its triage record read at a named commit; every element citing `svc-020…/F-` listed; each of
   F-001 to F-042 given its `status` and `answered_by` by the published mapping only, never by judgement (rule 6);
   the notes WingFoil did not read left `open`. **Characterization** (documents).
5. **F-011's evidence:** the spurious `illegal transition …` that `memory approve` printed after a correct transition
   during v0.3 (task-100, campaign-004's gates) added to F-011, or the note answered if the new pin no longer prints
   it. **Characterization.**
6. **The record:** `docs/wingfoil-feedback/README.md`'s "**Last sync:**" and ledger; the `wingfoil-cli` directive's
   rules 5 and 8 rewritten for a published pin, its version and *Checked against* bumped. **Characterization.**

## Design

- **The pin's target:** the newest published version when the task starts; 0.3.1 if published, since it carries
  bug-408's documentation and bug-400's scaffold. If 0.3.1 is published during the task, a second, one-commit bump
  follows, with a second sync (WingFoil's rule: one commit per switch, a sync at every pin bump).
- **The scratch clone** for criterion 2: `git clone` of this repository into a `mktemp` directory, so that no test
  element ever lands on main; the worktree's own Memory is touched only by the task's real elements.
- **The sync is mechanical:** a script reads the retrospective's table and the `git grep` of citations, and prints the
  status each note gets by the mapping; the note files are edited from that output, never by hand-reading.
- **Not in this task:** the arms' WingFoil builds (v0.3.0 for the arms, step A's 0.3.1 in task-107), and any new
  note's content beyond what criterion 2 finds.

## Execution notes

- Drafted and submitted on main (2026-10-27); pending → backlog by the approver. **The approver's decision in chat
  (2026-10-27): the task starts only once WingFoil `v0.3.1` is tagged**, so that the pin goes straight to 0.3.1 (with
  bug-408's `COLLABORATION.md` and bug-400's scaffold) and one bump and one sync suffice.
