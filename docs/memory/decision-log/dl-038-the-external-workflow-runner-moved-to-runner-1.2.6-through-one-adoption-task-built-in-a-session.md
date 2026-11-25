---
id: dl-038-the-external-workflow-runner-moved-to-runner-1.2.6-through-one-adoption-task-built-in-a-session
type: decision-log
title: "The external workflow runner moved to runner-1.2.6 through one adoption task built in a session"
status: pending
tags: ["governance","runner","v0.4"]
---

## Context

The external workflow runner governs this repository at `runner-1.2.4` (task-178; `docs/pack-deviations.md` D8). The
approver chose on 2026-11-24 to route the runner's updates through `governance-evolution`, after the folder move.
This is that run: [plan-007](../../plans/plan-007-governance-evolution-runner-1.2.6.md), whose assessment this
decision-log follows.

The runner's maintainers tagged `runner-1.2.5` and `runner-1.2.6` on 2026-11-25 and advised taking 1.2.6: 1.2.5's
forbidden-command audit missed commands run through another program, which 1.2.4 caught and 1.2.6 catches again.
1.2.6 carries 1.2.5's items: held needs, `--until-idle --stop-on-notice`, no false hits on commit messages. Its
manifest digest is `sha256:0c22a39ed7d204fc53508fb07de5e28d63a90b92f5cb6e1ee8877485642c0157`, and its
`patches/from-1.2.4-to-1.2.6.patch` touches seven files (six under `scripts/runner/`, plus
`scripts/checks/red-tests-untouched.mjs`) and applies on `main` at `000294f4`. No configuration key has to change.

**What changes in the governance.** Nothing in `.wingfoil/`, `AGENTS.md`, the roles or the Memory types. The runner's
common files move to 1.2.6, and `docs/pack-deviations.md` D8 names the new version and digest. The runner's
configuration (`config/runner.yaml`) stays as it is: every new key is optional.

## Options

1. **Adopt 1.2.6 through one task built in a session** (as task-178 did for 1.2.4). The runner's agents cannot
   read the runner package, `git apply` and `node scripts/runner/…` are outside their allowlist, and the anonymity
   check of the copied files is the approver's.
2. **Have the runner build the adoption task in its line.** This would widen the agents' allowlist (`git apply`, the
   runner's scripts) and their read scope (the package, outside the checkout) for one task. It weakens the guard the
   runner keeps on itself, and the gain is one session's work.
3. **Adopt 1.2.5 first, then 1.2.6.** That is two tasks, and an interval with the weaker audit the maintainers warned
   about.
4. **Wait for a scripted update step from the maintainers.** It does not exist, and it is not asked for yet.

## Proposal

Option 1:

- **One task, filed under plan-007's apply phase.** It applies `from-1.2.4-to-1.2.6.patch` on a task branch and
  checks `manifest.mjs --check --digest sha256:0c22a39e…0157`. It runs the anonymity check on the seven files and
  `npm run test:runner` without a skip, and it updates D8.
- **The checks before the loop restarts.** After the merge and the approver's push, the home goes on the new
  `origin/main`. The doctor must answer `ok`, and the dry run must show no security notice for the open gates
  (1.2.6 G-2) and no held element (1.2.5 #7).
- **The task is built in a session**, with the console loop stopped until it is merged and pushed, since the WIP
  limit holds per clone. The loop then resumes with task-164 on 1.2.6.
- **Two follow-ups for the approver to rule on separately, not part of this change:**
  - `--until-idle --stop-on-notice` could replace the bash console loop; that is a hand-over change only;
  - the request to the maintainers for a scripted update step run from the home. It would let a future update run
    from the runner itself, and it is not sent yet.

## Consequences

- The line runs 1.2.6, so commit messages and heredoc prose no longer stop it. A command whose argument cites a
  forbidden command, run by a program the runner does not know, stops it again, as up to 1.2.4.
- An open notice carrying the runner's key but no signature, numbered above the line's first signed notice, opens a
  security notice. The approver reads it and removes it if the runner did not open it.
- An optional step can be skipped per element only once `launch.optional` names it, which this configuration does
  not. The real-agent-check gates (N-006…N-009, N-015) keep waiting, and none is ever approved.
- Future runner updates follow the same path, a `governance-evolution` run and one task, until a scripted update
  step exists.
