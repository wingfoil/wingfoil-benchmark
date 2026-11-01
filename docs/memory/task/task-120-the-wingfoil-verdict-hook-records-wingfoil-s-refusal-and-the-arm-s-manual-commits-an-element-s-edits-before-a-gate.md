---
id: task-120-the-wingfoil-verdict-hook-records-wingfoil-s-refusal-and-the-arm-s-manual-commits-an-element-s-edits-before-a-gate
type: task
title: "The wingfoil verdict hook records WingFoil's refusal, and the arm's manual commits an element's edits before a gate"
status: in-review
release: v0.3
wave: W17
features: [F2.7]
acceptance: []
requirements: [REQ-FMT-05]
fixes: [bug-041-the-wingfoil-arm-s-verdict-hook-discards-wingfoil-s-error-so-a-refused-verdict-carries-no-reason, bug-042-the-wingfoil-arm-s-manual-does-not-say-to-commit-an-element-s-edits-before-stopping-at-a-gate-so-the-approver-s-verdict-is-refused]
tags: ["v0.3","wingfoil","s10"]
---

## Context

Two defects found reading [campaign-008](../campaign/campaign-008-claude-code-step-a-campaign-on-haiku-5.5-and-sonnet-5.5-every-scenario-on-approver-policy-v5.md)'s results (S10, wingfoil, Haiku 5.5, r2): the verdict hook loses
WingFoil's reason when a verb is refused ([bug-041](../bug/bug-041-the-wingfoil-arm-s-verdict-hook-discards-wingfoil-s-error-so-a-refused-verdict-carries-no-reason.md)), and the arm's manual lets the agent leave a
submitted document's edits uncommitted at a gate, so the approver's verdict is refused
([bug-042](../bug/bug-042-the-wingfoil-arm-s-manual-does-not-say-to-commit-an-element-s-edits-before-stopping-at-a-gate-so-the-approver-s-verdict-is-refused.md)). The approver asked for the bugs and their task in chat (2026-11-01). Placed in
v0.3, W17, after the campaign. No real-agent spending; campaign-008 keeps its results, with a note on r2 (campaigns
are preliminary).

## Acceptance criteria

1. **Red-first:** `arms/wingfoil/verdict.sh`, run against a workspace whose one pending task carries an uncommitted
   edit of its body, answers `refused` with a `detail` holding WingFoil's `error:` line (bounded in length); a search
   that fails answers `search-failed` with its `detail`; `done`, `no-target` and `ambiguous` unchanged.
2. **Red-first:** the runner records the hook's `detail` in `verdicts.json`'s `carried_out`, and the scoring's ledger
   schema accepts it (a ledger without it, as campaign-008's, still scores the same).
3. **Red-first (a test of the manual's text):** the wingfoil manual's gate rule says to commit every change, code and
   documents, before asking for an approval, because the verdict is carried out on what is committed; within 120
   columns; the arm's new digest recorded here, the old one (`cc009b5a52a9`) kept by the profiles of the runs that
   used it.
4. A note on r2 in campaign-008's Results review, citing both bugs.
5. Checks: prettier, `tsc`, eslint, `scripts/pre-review.sh main`; the full suites through the load watcher; an
   independent review (dl-020).

## Design

- **The hook** (`arms/wingfoil/verdict.sh`): WingFoil's stderr goes to a temporary file instead of `/dev/null`; on
  `refused` and `search-failed` the JSON line gains `detail`, WingFoil's last `error:` line (else its last non-blank
  line), when WingFoil printed one, cut at 500 characters by the node helper that writes the line (not by bash, which
  would cut bytes in the run image's C locale); `done`, `no-target`, `ambiguous` and `unknown-verdict` are unchanged.
  With no temporary file (`mktemp` failing) the hook works as before, its refusals with no detail. A search whose JSON
  does not parse answers `search-failed` with no detail, as before. The approver's identity still reaches only
  WingFoil's command.
- **The runner** (`src/runner/run.ts`, `deliver`/`hookAnswer`): reads `detail` when it is a string and records it in
  `carried_out`; other fields of the answer are still dropped.
- **The scoring** (`src/scoring/governance.ts`): the ledger schema names `detail` as optional; it was already
  accepted (zod drops unknown keys), so its test is a characterization: a ledger with it scores as one without.
- **The manual** (`arms/wingfoil/manual.md`, *At a gate*): one sentence, commit every change before asking, since the
  verdict is carried out while the agent waits and WingFoil refuses to move a document with uncommitted edits. Not "do
  not edit a submitted document": the manual asks to submit the task before building and to record the outcome in
  it, so the edit after the submit is the expected path; leaving it uncommitted is the defect. The shared preamble
  ("committed for you when the request ends") is every arm's and stays. baseline and baseline-docs are unchanged
  (no hook, no gate verbs): digests `964b1354526c` and `64e37c838830`.
- **The arm's digest:** `cc009b5a52a9` → `99ea463d1b37`. No profile is changed: `claude-step-a*.yaml` and
  `s10-calibration.dry-run.yaml` describe runs already made; the next campaign's file pins the new digest.

## Execution notes

- The hook's test runs WingFoil 0.3.1 from `node_modules` (the arm's harness release) in a scratch Kanban project with
  a developer and Dana as the approver, as the setup declares them: a pending task with an uncommitted body edit is
  refused with `error: refusing to commit …: it carries uncommitted modifications…`, as campaign-008's r2 was; about
  one second a case. The failing search uses a stub on the hook's PATH.
- Red first: the hook's two new cases and the runner's failed before the change; the manual's failed before its
  sentence; the scoring's passed (characterization, above).
- **Deviation, for the approver:** criterion 3 was rewritten in the implementation commit, after the task's approval:
  bug-042's fix as filed also said "not to edit a submitted document afterwards"; the manual asks to submit the task
  before building and to record the outcome in it, so that clause would contradict it, and only the commit before
  asking is implemented. bug-042 carries the same note. Criterion 3's digest clause changed too, from "recorded
  where the profiles pin it" to "recorded here": no profile pins the new digest, since the existing ones describe runs
  already made; the next campaign's file will. Two wording changes add to the criterion and weaken nothing: the
  rule's reason ("because the verdict is carried out on what is committed") and the old digest's id. The approver
  accepts the changes or restores them at the gate. **Accepted by the approver in chat (2026-11-01, "accetto il criterio 3").**
- **Not in this task, proposed:** when the hook exits non-zero the runner records `failed (exit N)` and drops its
  stderr (`src/runner/run.ts`, `deliver`): the same loss one level up, never observed in a run (round 1's nit).

### Review

**Round 1** (2026-11-01, a fresh read-only agent in `/tmp/claude-1000/review-120-q0RW`, a clone of `ba091f79`; both
checkouts' HEAD, reflog and status checked unchanged after it). It reran the four test files (123 passed) and the
red-first claims (4 red on main's code, the schema's characterization green), and confirmed the digests. No blocker;
four should-fix and seven nits:

| # | Finding | Outcome |
|---|---|---|
| S1 | bug-042's "not to edit a submitted document" dropped, criterion 3 rewritten after approval | to the approver at the gate; noted in bug-042 and above (round 2: both of criterion 3's changes named) |
| S2 | the hook's tests miss `no-target`, `ambiguous`, `unknown-verdict` on the real script | fixed: three real-WingFoil cases, no detail |
| S3 | the scratch project inherits the user's git configuration and `GIT_*` variables | fixed: own `HOME`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM`, `GIT_*` cleared |
| S4 | REQ-FMT-05 still says `{outcome, target?}` | fixed: amendment 1.46 |
| N1 | `mktemp` failing breaks every search | fixed: falls back to no detail |
| N2 | bash cuts 500 bytes in the run image's C locale | fixed: node cuts 500 characters; the test uses multibyte text |
| N3 | `search-failed` with no detail when the JSON does not parse | the Design says so |
| N4 | the runner drops a non-zero hook's stderr | out of scope, proposed above |
| N5 | the runner test ran the campaign twice | fixed |
| N6 | the test's wrappers did not quote their paths | fixed |
| N7 | S10.md §11 could list the refused verdict as a threat; the manual's wording repeats "before you ask" | kept: the threat is the agent's, bounded by bug-042's fix; the wording kept for the test's anchor |

**Round 2** (2026-11-01, a fresh read-only agent in `/tmp/claude-1000/review2-120-b8yg`, a clone of `e9a6a299`; both
checkouts checked unchanged after it), on the fix's diff `ba091f79..e9a6a299`. It reran the four files (126 passed;
the hook's file twice more, deterministic), `tsc` and eslint, recomputed the digest (`99ea463d1b37`, no stale copy),
and mutated the script in its clone: the three new cases went red. Round 1 resolved in the code. One should-fix: the
deviation note named only one of criterion 3's two changes after approval; fixed above. Two nits in requirements 1.46
("last non-blank line"; REQ-FMT-06 in the amendment's list): fixed.

**Round 3** (2026-11-01, a fresh read-only agent, nothing run; both checkouts unchanged), on `8363913a`: round 2's
should-fix and nits resolved. One nit: criterion 3 also had two wording changes the note did not list; listed above.
