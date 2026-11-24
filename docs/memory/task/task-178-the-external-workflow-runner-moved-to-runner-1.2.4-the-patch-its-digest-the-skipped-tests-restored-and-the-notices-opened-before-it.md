---
id: task-178-the-external-workflow-runner-moved-to-runner-1.2.4-the-patch-its-digest-the-skipped-tests-restored-and-the-notices-opened-before-it
type: task
title: "The external workflow runner moved to runner-1.2.4: the patch, its digest, the skipped tests restored and the notices opened before it"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02, REQ-NFR-01]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["process","runner","governance","v0.4"]
---

## Context

task-177 adopted the external workflow runner at `runner-1.2.2` as this repository's governance. On the pilot's first
task (task-162) its review step blocked: the runner's prompt told the reviewer to run `memory submit`, which the
reviewer's allowlist refuses (N7, sent to the runner's maintainers on 2026-11-24); and two of the runner's own tests
assumed one project's trunk, so `npm run test:runner` skips them by name (N6). `runner-1.2.3` answered N6 and signs
every notice; `runner-1.2.4` (tag `ec5c08b`, manifest digest
`sha256:3258a65539754e7d17644fe4555a88a030502d8ff5e884892f34e6f6a08cb988`) answers N7: after a kanban review answered
`completed`, the runner runs the step's `memory submit` itself, and a blocked run whose notice the approver closed no
longer holds the gate. The approver chose on 2026-11-24 to adopt 1.2.4 directly, after task-162, by hand rather than
through the runner, since it changes the files the runner runs; task-163 was parked to free the in-progress slot.

**Done** means: the trunk runs `runner-1.2.4`, its doctor and dry run are clean, and the runner can resume task-163,
whose review is the first real kanban review on 1.2.4 the maintainers asked to hear about.

## Acceptance criteria

1. The runner's common files at `runner-1.2.4`: `patches/from-1.2.2-to-1.2.4.patch` applied with `git apply` (no
   machine patch since 1.2.1), `manifest.mjs --digest sha256:3258a655…cb988` answering `ok`, and the anonymity check
   on the changed files, counts only.
2. `npm run test:runner` without `--test-skip-pattern`: every runner test passes on this repository's configuration;
   `docs/pack-deviations.md` D8 no longer names the skip.
3. `test/unit/docs/runner-config.test.ts` and `config/runner.yaml` still hold on 1.2.4 (new keys read, none
   dropped); any new key that can launch or start work is guarded by the test, red first.
4. The notices opened before the update (N-001, N-002, N-005, the optional real-agent checks of task-127, task-177
   and task-162) handled as the runner's adoption notes say: closed and left for the runner to reopen signed, never
   approved, since no real-agent check ran.
5. The home and the line on `origin/main` after the merge and the approver's push; `run.mjs --line trunk --doctor`
   answers `ok`, and `--dry-run` proposes task-163's next step.
6. The state folder checked against 1.2.3's guard (a new-name folder without a key beside an old one with a key);
   `--migrate-state` only with the approver's go.
7. Every runner and `wingfoil` command declared against observed behaviour in the notes; friction as feedback notes.
8. Checks: `scripts/pre-review.sh main`, the docs tests, the full suites on the approver's go; an independent review
   (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
