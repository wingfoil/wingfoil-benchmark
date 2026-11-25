---
id: plan-007-governance-evolution-runner-1.2.6
type: plan
title: "governance-evolution — runner-1.2.6"
status: active
workflow: governance-evolution
phase: assess
tags: ["governance","runner","v0.4"]
---

## Context

The first `governance-evolution` run of this repository. The approver chose on 2026-11-24 to route the external
workflow runner's updates through this workflow, with the run opened after the folder move
([rel-v0.4](../memory/release/rel-v0.4.md), Retrospective: "Updating the runner is done by hand"). The move is done
(2026-11-25): the runner's doctor answers `ok`, its dry run proposes task-164's build step, and the full suites are
green on `main` at `000294f4`.

### Assessment

**The change asked for.** Move the runner's common files from `runner-1.2.4` (adopted by task-178) to `runner-1.2.6`
(tag commit `0323a99`, patches commit `ee1efd6`, manifest digest
`sha256:0c22a39ed7d204fc53508fb07de5e28d63a90b92f5cb6e1ee8877485642c0157`), skipping 1.2.5. The maintainers announced
1.2.6 on 2026-11-25 and advised taking it instead of 1.2.5: 1.2.5's forbidden-command audit missed commands run
through another program (`python3 -c`, `find -exec`, `| sh`, `setsid`, `bash -c --`), which 1.2.4 caught.

**What 1.2.6 brings, from 1.2.4** (the package's CHANGELOG, entries 1.2.5 and 1.2.6):

| Item | What changes | What it means here |
| --- | --- | --- |
| 1.2.5 #1 | two lines on one branch are refused | one line, `trunk`: nothing |
| 1.2.5 #2 | `--until-idle --stop-on-notice` | could replace the approver's bash console loop |
| 1.2.5 #3-#5 | adapter permissions per role, `sources_read_only`, `read_deny` | optional keys; WingFoil 0.3.2 has no adapter fragment, so the runner's own allowlist stays |
| 1.2.5 #6, 1.2.6 G-1 | the forbidden-command audit reads commands as a shell does, readers apart | commit messages and heredoc prose no longer stop the line; the line runs Claude only, whose allowlist and denies are unchanged |
| 1.2.5 #7, 1.2.6 G-4 | an element with an open need, or blocked on one, is held by the runner | no task declares `needs`; check the dry run for held elements before the loop restarts |
| 1.2.6 G-2 | an open notice with the runner's key and no signature opens a security notice | five gates are open (N-006…N-009, N-015); the dry run must show no security notice |
| 1.2.6 G-3 | nested Memory paths; the element's own file only when unique | nothing expected |
| 1.2.6 #5 | an optional step skipped for one element, signed, through bound `checks.pre` | needs `launch.optional`, which this configuration does not set: nothing until chosen |

**The patch.** `patches/from-1.2.4-to-1.2.6.patch` of the runner package touches seven files:
`scripts/runner/{MANIFEST.sha256,VERSION,gate.mjs,lib.mjs,run.mjs,runner.test.mjs}` and
`scripts/checks/red-tests-untouched.mjs`. `git apply --check` on `main` at `000294f4` (VERSION `1.2.4`): applies. No
configuration key has to change.

**Who carries it.** As for 1.2.4, the runner cannot carry its own update: its agents cannot read the runner package
(the patch and the manifest lie outside the line's checkout and worktrees), `node scripts/runner/…` and `git apply`
are outside their allowlist, and the anonymity check of the copied files is the approver's. So the apply is a task
built in a session, with the console loop stopped until it is merged and pushed (the WIP limit holds per clone). The
loop takes over again after it: task-164 next, on 1.2.6.

**Not part of this change.** Asking the maintainers for a scripted update step run from the home (the retrospective
point weighs it): proposed in the decision-log as a separate request for the approver to rule on, not sent. Adopting
`--until-idle --stop-on-notice` in the console loop: a hand-over change, no repository file.

## Steps

| # | Phase | Role | Produces |
| --- | --- | --- | --- |
| 1 | assess | facilitator | this assessment |
| 2 | propose | facilitator | a decision-log: adopt runner-1.2.6 through one task; submitted for discussion |
| 3 | approve | approver | the ruling on the decision-log; a reject goes back to step 2 |
| 4 | apply | facilitator | the adoption task, filed for the approver's triage, then built in a session (patch, manifest check, runner tests, the home on the new trusted ref, the doctor and the dry run) and run through delivery |

## Handoff

- **The approver:** the decision-log's ruling, the adoption task's triage and review gates, the push, the home's
  update after the merge, and the console loop's restart.
- **The agent alone:** the assessment, the decision-log, the task's text and its build on a task branch.
- **Done when:** `scripts/runner/VERSION` reads `1.2.6` on `origin/main`, `manifest.mjs --check --digest` answers
  `ok`, the full suites are green, and the runner's doctor and dry run answer from the home with no security notice.
