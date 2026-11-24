---
id: task-178-the-external-workflow-runner-moved-to-runner-1.2.4-the-patch-its-digest-the-skipped-tests-restored-and-the-notices-opened-before-it
type: task
title: "The external workflow runner moved to runner-1.2.4: the patch, its digest, the skipped tests restored and the notices opened before it"
status: in-progress
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

**The update.** `git apply` of the runner package's `patches/from-1.2.2-to-1.2.4.patch` (package commit `e46e32d`, made
after the tag `runner-1.2.4`, `ec5c08b`): it changes six of the copied files
(`scripts/runner/{MANIFEST.sha256,VERSION,gate.mjs,lib.mjs,run.mjs,runner.test.mjs}`); no machine file has changed since
1.2.1, and the two Claude adapters and the package's config for this repository are unchanged between the tags. No key
`config/runner.yaml` sets changes meaning, and 1.2.3 and 1.2.4 add none that the config would set:
`runner-config.test.ts` stays as it is (AC3 is shown by running it on 1.2.4).

**The criteria, classified.**

| AC | Kind | How it is shown |
|---|---|---|
| 1 | characterization | `git apply --check`, then the apply; `manifest.mjs --digest sha256:3258a655…cb988` ok; the anonymity check on the six files |
| 2 | red-first | `npm run test:runner` without the skip: red on 1.2.2's files (tests 25 and 27), green on 1.2.4's |
| 3 | characterization | the config test and `workflow list` on 1.2.4; the diff of the runner's config reads between the tags |
| 4 | characterization | after the merge, from the home: each old notice closed with `run.mjs --close`, the runner's next dry run |
| 5 | characterization | the home and the line on `origin/main`; `--doctor` ok, `--dry-run` proposing task-163's step |
| 6 | characterization | the state folders listed (names and counts only, never a key read) |
| 7, 8 | process | the notes; pre-review, the docs tests, the full suites on the approver's go, an independent review |

**The state folder (AC6).** Only the old-name folder `~/.local/state/dfd-runner` exists, shared by every project on
this machine; there is no `wingfoil-runner` folder, so 1.2.3's guard (a new-name folder without a key beside an old
one with a key) does not stop the runner. `--migrate-state` moves the folder for every project at once: it is the
approver's, with the other projects, and not done here.

**The old notices (AC4).** N-001, N-002 and N-005 are the optional real-agent checks of task-127, task-177 and
task-162, opened unsigned by 1.2.2. Approving one would record a check that never ran, and `gate.mjs` has no reject
for it, so each is closed with `run.mjs --close <N-id> --how "…"`, as the runner's adoption notes say; the runner
reopens it, signed. Every done task leaves such a notice: the approver's console loop stops on a new notice, so its
filter skips the real-agent-check gates (the loop is the approver's, outside the repository; the new filter is
handed over in the notes).

## Execution notes

**The patch (AC1).** `git apply --check <runner package>/patches/from-1.2.2-to-1.2.4.patch`: applies; the apply
changes the six files the Design names, each then byte-identical to `runner-1.2.4:common/scripts/runner/<file>`
(`cmp`). `node scripts/runner/manifest.mjs --digest
sha256:3258a65539754e7d17644fe4555a88a030502d8ff5e884892f34e6f6a08cb988`: "ok: runner 1.2.4, the 16 common files
match the manifest, 1 machine file(s) left out: scripts/setup/codex-apparmor.sh", "ok: manifest sha256 …", exit 0.
The anonymity check on the patch's added lines (the folder names of the machine's workspaces, counts only): two
dictionary words; the token's lines: 0.

**Red first (AC2).** `npm run test:runner` without `--test-skip-pattern`, on 1.2.2's files: "not ok 25", "not ok
27", 93 pass, 2 fail, 1 skipped (commit `test(task-178): red …`). On 1.2.4's files: 103 pass, 0 fail, 1 skipped (the
runner's own skip: this repository binds no checks).

**The config (AC3).** `git -C <runner package> diff runner-1.2.2 runner-1.2.4` adds no `config.<key>` read in `lib.mjs`
or `run.mjs`; `gate.mjs` (1.2.3, F-10) reads `limits.lock_stale_minutes`, already set to 120, and changes neither the
Claude adapters nor the package's config for this repository. `test/unit/docs/runner-config.test.ts` and the other docs
tests on 1.2.4: 76 passed; `npx --no-install wingfoil workflow list`: no diagnostics. `scripts/pre-review.sh main`:
green.

**The state folder (AC6).** `~/.local/state/` holds only the old-name folder `dfd-runner` (5 entries, listed by
count, nothing read); no `wingfoil-runner`. 1.2.3's guard does not apply; `--migrate-state` is not run (Design).

**Before the merge, from the home (AC5, first half).** The task branch fetched into the home as a local branch
`task-178-pilot`, `paths.trusted_ref: task-178-pilot` in the home's git-ignored local file only.

| Command (from the home) | Declared | Observed |
|---|---|---|
| `run.mjs --line trunk --doctor` | the project's problems | "runner 1.2.4 · wingfoil 0.3.2", "ok: the project can run under the runner" |
| `run.mjs --line trunk --dry-run` | the next step, nothing written | `work-item.start@task:task-163-…`, agent "WingFoil Benchmark Runner", `claude-sonnet`; its prompt quotes the approver's park reason as points to address; nothing written in the home or the line |

That dry run shows a gap of this pilot: the line's clone does not yet hold task-178 (added, approved and started in
the main checkout, not pushed), so the runner reads the in-progress slot as free and would start task-163 beside it.
WingFoil's WIP limit holds per clone. The loop is stopped until the merge and the push; the rule for the pilot is
that a task worked by hand in the main checkout is pushed (or the loop kept stopped) before the runner runs again.

**For the done step (AC4, AC5).** After the merge and the approver's push: the home back on `origin/main` (its
`trusted_ref` lines removed, the local branch deleted), the line fast-forwarded; `workflow finalize --step
work-item.build@task:task-178-…` (built by hand, F-050); from the home, `run.mjs --line trunk --close N-001`, `N-002`
and `N-005`, each `--how "opened unsigned by runner-1.2.2; the runner reopens it signed (task-178)"`; the doctor and
a dry run. The console loop's filter then skips the real-agent-check gates; the new loop is handed over in chat.

### Review

- **Round 1** (an independent read-only subagent, in a temporary clone, on `main...6c17ad8e`; the main checkout's
  reflog unchanged). No blocker, no should-fix; four nits, fixed. It verified the 17 copied files against the tag by
  sha256 and mode, the digest, the red commit (93/2/1) and the green branch (103/0/1), and the new code paths against
  `work-item`: `runnerSubmits` fires only on the review step and moves the task to in-review, `resolvedRuns` lifts
  only blocked runs whose notice the approver closed, the done step's install runs before the niced tests; and that
  `run.mjs --close` on an unsigned notice is not refused and the runner reopens it signed with a new N-id.
  - The patch's source named: package commit `e46e32d`, after the tag.
  - The AC3 note names `gate.mjs`'s one new read, `limits.lock_stale_minutes`, already set.
  - rel-v0.4's point: the home must equal its trusted ref, `origin/main` outside a pilot.
  - Red first by mutation: the config test also fails on `integration.setup_command` or `install_scripts: true`,
    since 1.2.4 runs the install outside the sandbox in the done step too.
  The review closes.
- **Full suites** (`scripts/full-suites.sh`, 2026-11-24, at `f79a63fe`, worktree clean): LINT 0, TEST 0, BUILD 0,
  BIN 0, DOCKER 0, RUNNER 0 (log `.cache/full-suites/2026-11-24/task_task-178-runner-1.2.4-f79a63fe-133224.txt` in
  the main checkout; 158 test files, 2571 tests passed and 10 skipped; test:bin 22 passed; test:docker 22 passed and
  2 skipped; test:runner 103 passed and 1 skipped).
