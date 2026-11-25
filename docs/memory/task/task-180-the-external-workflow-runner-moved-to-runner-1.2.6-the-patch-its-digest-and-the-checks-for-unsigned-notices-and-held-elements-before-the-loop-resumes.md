---
id: task-180-the-external-workflow-runner-moved-to-runner-1.2.6-the-patch-its-digest-and-the-checks-for-unsigned-notices-and-held-elements-before-the-loop-resumes
type: task
title: "The external workflow runner moved to runner-1.2.6: the patch, its digest, and the checks for unsigned notices and held elements before the loop resumes"
status: pending
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02, REQ-NFR-01]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["process","runner","governance","v0.4"]
---

## Context

The external workflow runner governs this repository at `runner-1.2.4` (task-178; `docs/pack-deviations.md` D8). Its
maintainers tagged `runner-1.2.6` on 2026-11-25 (tag commit `0323a99`, patches commit `ee1efd6`, manifest digest
`sha256:0c22a39ed7d204fc53508fb07de5e28d63a90b92f5cb6e1ee8877485642c0157`) and advised taking it instead of 1.2.5,
whose forbidden-command audit missed commands run through another program. 1.2.6 carries 1.2.5's items: held needs,
`--until-idle --stop-on-notice`, no false hits on commit messages. It also opens a security notice for an unsigned
block carrying the runner's key, and recognises nested Memory paths. No configuration key has to change.

The approver approved dl-038 on 2026-11-25, in plan-007's `governance-evolution` run: the update is one task built in
a session, since the runner's agents cannot read the runner package or run `git apply` and the runner's scripts. The
console loop stays stopped until this task is merged and pushed (the WIP limit holds per clone), and task-164 goes
back to backlog to free the in-progress slot.

**Done** means: the trunk runs `runner-1.2.6`, its doctor and dry run are clean with no security notice and no held
element, and the console loop can resume with task-164.

## Acceptance criteria

1. The runner's common files at `runner-1.2.6`: the package's `patches/from-1.2.4-to-1.2.6.patch` applied with
   `git apply` (seven files: six under `scripts/runner/`, plus `scripts/checks/red-tests-untouched.mjs`),
   `manifest.mjs --check --digest sha256:0c22a39e…0157` answering `ok`, and the anonymity check on the changed files,
   counts only. (characterization)
2. `npm run test:runner` passes on this repository's configuration, with no skip beyond the one for the missing
   `bindings.yaml`; `docs/pack-deviations.md` D8 names 1.2.6 and its digest. (characterization)
3. `test/unit/docs/runner-config.test.ts` and `config/runner.yaml` still hold on 1.2.6: the new optional keys
   (`launch.optional`, `permissions.sources_read_only`, `permissions.read_deny`, `needs.open_states`) stay unset,
   and any new key that can launch or skip work is guarded by the test, red first. (red-first where a guard is added)
4. Before the merge, from the home on the task branch as its trusted ref: `--doctor` answers `ok`, and `--dry-run`
   opens no security notice for the open gates (N-006…N-009, N-015) and holds no element. A security notice is read,
   reported, and never closed without the approver. (characterization)
5. The home and the line on `origin/main` after the merge and the approver's push; `--doctor` `ok`, `--dry-run`
   proposing task-164's next step. (characterization)
6. Every runner and `wingfoil` command declared against observed behaviour in the notes; friction as feedback
   notes. (characterization)
7. Checks: `scripts/pre-review.sh main`, the docs tests, the full suites on the approver's go; an independent review
   (dl-020). (characterization)

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
