---
id: task-180-the-external-workflow-runner-moved-to-runner-1.2.6-the-patch-its-digest-and-the-checks-for-unsigned-notices-and-held-elements-before-the-loop-resumes
type: task
title: "The external workflow runner moved to runner-1.2.6: the patch, its digest, and the checks for unsigned notices and held elements before the loop resumes"
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

**The update.** `git apply` of the runner package's `patches/from-1.2.4-to-1.2.6.patch` (package commit `ee1efd6`,
made after the tag `runner-1.2.6`, `0323a99`). It changes seven of the copied files:
`scripts/runner/{MANIFEST.sha256,VERSION,gate.mjs,lib.mjs,run.mjs,runner.test.mjs}` and
`scripts/checks/red-tests-untouched.mjs`. Between the two tags the package changes no machine file, no Claude adapter
and not its config for this repository (only WingFoil's own config changes). No key that `config/runner.yaml` sets
changes meaning. The new keys stay unset: `launch.optional`, `permissions.sources_read_only` (default
`[reviewer, qa]`), `permissions.read_deny` and `needs.open_states`. A step can be skipped only if `launch.optional`
names it, and `launch.allow` still names `work-item` alone.

**The criteria, classified.**

| AC | Kind | How it is shown |
|---|---|---|
| 1 | characterization | `git apply --check`, then the apply; `manifest.mjs --check --digest sha256:0c22a39e…0157` ok; the anonymity check on the seven files |
| 2 | characterization | `npm run test:runner` on 1.2.6's files; D8's text |
| 3 | characterization, red-first for any new guard | the config test on 1.2.6; the new keys read against `runner-config.test.ts` |
| 4 | characterization | from the home on the task branch as its trusted ref: `--doctor`, `--dry-run`, nothing written |
| 5 | characterization | the home and the line on `origin/main`; `--doctor` ok, `--dry-run` proposing task-164's step |
| 6, 7 | process | the notes; pre-review, the docs tests, the full suites on the approver's go, an independent review |

**The open gates (AC4).** N-006…N-009 and N-015 were opened by 1.2.4, which signs every notice (since 1.2.3), so
1.2.6's check for unsigned blocks carrying the runner's key should find none. If it opens a security notice, the
notice is read and reported to the approver, and nothing is closed on the agent's own initiative.

**Held elements (AC4).** No task declares `needs`. A run that answered blocked on a raised or needed id would hold its
element too: the dry run shows whether any element is held.

## Execution notes

Built by hand in a session (dl-038), on `task/task-180-runner-1.2.6` in a worktree, with the console loop stopped.
task-164 went back to backlog first (`memory park`, in-progress limit 1); its build step had not run.

**The patch (AC1).** `git apply --check <runner package>/patches/from-1.2.4-to-1.2.6.patch` on `main`: applies; the
apply changes the seven files of the Design, each equal to the tag's `common/` copy (`cmp` against `git show
runner-1.2.6:common/<file>`). `node scripts/runner/manifest.mjs --check --digest
sha256:0c22a39ed7d204fc53508fb07de5e28d63a90b92f5cb6e1ee8877485642c0157`: "ok: runner 1.2.6, the 16 common files match
the manifest, 1 machine file(s) left out: scripts/setup/codex-apparmor.sh", "ok: manifest sha256 …", exit 0. The
anonymity check on the diff (the names of the local folders as candidates, counts only): 171 candidates, 25 words
hit, 24 generic, and one flagged word, which is the line's name `trunk`, already in 18 pushed files.

**The tests (AC2, AC3).** `npm run test:runner` on 1.2.6: 112 tests, 111 passed, 0 failed, 1 skipped (test 36, "this
project has no .wingfoil/workflows/bindings.yaml", as on 1.2.4). `runner-config.test.ts`: 10 passed. Its launch test
already counts `launch.optional` as launched work (the key 1.2.6 needs to skip a step), so no new guard is needed.
`permissions.sources_read_only`, `permissions.read_deny` and `needs.open_states` neither launch nor skip work, and
all four stay unset in `config/runner.yaml`. D8 names 1.2.6, dl-038 and the new digest.

**From the home on the task branch (AC4).** The branch was fetched into the home as a local branch `task-180-pilot`,
with `paths.trusted_ref: task-180-pilot` in the home's git-ignored local file only; afterwards the home went back to
`main` and the local file to its saved copy, and the branch was deleted.

| Command (from the home) | Declared | Observed |
|---|---|---|
| `run.mjs --line trunk --doctor` | the project's problems | "runner 1.2.6 · wingfoil 0.3.2", "ok: the project can run under the runner" |
| `run.mjs --line trunk --dry-run` | the next step, nothing written | `work-item.build@task:task-164-…`, `claude-sonnet`; N-006…N-009 and N-015 listed as open gates; N-016 (task-163's real-agent check) would be opened; no security notice, no held element; `docs/notices.md` unchanged (md5), the line and the state folder untouched |

The dry run still proposes task-164's build because the line's clone does not hold the park or task-180 yet (not
pushed): the WIP limit holds per clone, as task-178 recorded. The loop stays stopped until the merge and the push.

**Checks (AC7).** `scripts/pre-review.sh main` on the branch: markdown, prettier, eslint, tsc, tests (2 files, 35
tests), tests-related; test:bin skipped (no change under src/cli, src/site or test/bin); "pre-review: green".

**`wingfoil` commands, declared vs observed (AC6).**

| Command | Declared | Observed |
|---|---|---|
| `workflow start governance-evolution --title …` | record the plan, print the first step | added `plan-007-…` as draft, then "error: … added but not submitted", since `workflow` and `phase` are required on submit; filled by hand, then `memory submit`: draft → active |
| `workflow finalize --step governance-evolution.assess` | record the step | an empty commit with the phase record |
| `memory submit dl-038-…` | draft → its next state | draft → pending, and the run's next step became the approver's `approve` |
| `memory park task-164 --reason …` | in-progress → backlog | in-progress → backlog, the reason in the commit |
| `memory submit task-180-…` | backlog → in-progress | backlog → in-progress |

**The full suites (AC7),** on the approver's go, `scripts/full-suites.sh task/task-180-runner-1.2.6` at `d40520c9`:
LINT 0, TEST 0 (160 files, 2616 tests: main's 2615 and the new config guard), BUILD 0, BIN 0 (22 tests), DOCKER 0 (24
tests, none skipped), RUNNER 0 (111 of 112, the one expected skip).

### Review

Round 1, an independent read-only agent in a temporary clone (dl-020), on `42f85d6c…75d55fd8`: **accept with nits**,
no must-fix. It confirmed the seven files equal the tag's `common/` copy (17 of 17 compared, the machine file left
out by D8), the manifest check, `test:runner` 111 of 112 with the one expected skip, the docs tests 39 of 39, D8
within 120 characters, and no private path in the diff. The findings and what was done:

- **should-fix, the config test guards only `launch.optional`.** Done: a test that `permissions.sources_read_only`,
  `permissions.read_deny` and `needs.open_states` stay unset, and that no adapter declares a
  `launch.headless.permissions` fragment. It is red when `needs.open_states` is set (checked, then reverted); 11
  tests pass.
- **should-fix, the notes missing.** The reviewer read the branch before the notes were committed (`45a7dd4a`).
- **nit, campaign states.** 1.2.6's default open states leave out the campaign states `running`, `scored` and
  `reviewed`, so a need on a running campaign would count as closed. No element declares `needs`; this is for the
  approver to rule on as a feedback note, not done here.
- **nit, two commits with one subject** (the D8 reflow). Left as they are: the history is not rewritten.
- **nit, "optional" in D8 and the runner config's comment.** Left as they are: the wording is accurate, and the
  config's comment is the home's file.

**For the done step (AC5).** After the merge and the approver's push: the home and the line on `origin/main`;
`workflow finalize --step work-item.build@task:task-180-…` (built by hand, F-050); from the home, the doctor and a
dry run proposing task-164's next step; then the console loop restarts.
