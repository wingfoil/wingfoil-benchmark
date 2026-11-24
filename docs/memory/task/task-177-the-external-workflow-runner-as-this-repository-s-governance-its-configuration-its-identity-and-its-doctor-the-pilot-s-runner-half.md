---
id: task-177-the-external-workflow-runner-as-this-repository-s-governance-its-configuration-its-identity-and-its-doctor-the-pilot-s-runner-half
type: task
title: "The external workflow runner as this repository's governance: its configuration, its identity and its doctor, the pilot's runner half"
status: approved
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02, REQ-NFR-01]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["process","runner","governance","v0.4"]
---

## Context

The approver's rulings of 2026-11-22 and 2026-11-23 ([dl-037](../decision-log/dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota.md), plan-006): this repository's governance is
run by the external workflow runner, as WingFoil's other projects run theirs, with one pilot on W20 whose exit and
rollback criteria are written apart for the methodology and for the runner ([task-127](task-127-adopt-methodology-kanban-1.0.0-with-base-2-and-software-1-keeping-the-benchmark-s-delivery-rules-bug-046.md)'s Design). task-127
adopts the methodology; the runner's half moved here on 2026-11-23, because at `runner-1.2.0` a test file in the
runner's manifest names private projects, so its common files can be neither copied into this public repository nor
packed in a campaign's harnesses. The fix was asked of the runner's maintainers the same day. **This task starts
only when a runner version whose common files and adapters name no private project is tagged.**

The governance pin stays WingFoil 0.3.2. The runner's use as step B's arm (task-172, task-173) is separate, in
versions and pins.

**Done** means: the runner's doctor and dry run are clean on the trunk line, the timer is installed disabled, and the
approver can enable it to carry the next W20 tasks through `work-item`.

## Acceptance criteria

1. The runner's common files at its tag copied unchanged, their manifest checked (`manifest.mjs --digest`), and none of
   them naming a private project (the anonymity check, counts only, run on the copied tree).
2. `config/runner.yaml`: one `trunk` line, its checkout and worktrees outside the main checkout, in a git-ignored
   `config/runner.local.yaml`; `launch.allow: [work-item]`; `launch.manual` naming `work-item.real-agent-check`;
   `phases.integrate: [work-item.done]`; `integration.task_branch: task/{id}`, `merge: no-ff`; Claude as the reviewer
   too, in another session; `paths.runs: [docs/runs/]`; `weekly_token_budget` provisional (20000000) until the pilot's
   first task sets it.
3. Red first: a test fails when `config/runner.yaml` allows `campaign-cycle`, the release slot, `*` or any step that
   spends, or when the runner's identity can approve.
4. **The runner's identity** (the approver, 2026-11-23): a `team.agents` entry "WingFoil Benchmark Runner"
   (`runner@wingfoil.github.io`, the approver's choice of 2026-11-24: WingFoil 0.3.2 refuses a reserved domain),
   `approval_authority: false`, named as the trunk line's `agent`; the launched model credited by `Co-Authored-By`;
   gates ruled only by the approver through `gate.mjs`.
5. The Claude adapters in `.wingfoil/agents/custom/`; `docs/notices.md` with its markers; the runner's home and the
   line's clone prepared outside every working checkout; `run.mjs --line trunk --doctor` answers `ok` and `--dry-run`
   proposes a `work-item` step.
6. The systemd timer written disabled; the approver alone enables it. No real-agent session is started by this task.
7. Every `wingfoil` and runner command declared against observed behaviour in the notes; friction as feedback notes.
8. Checks: `scripts/pre-review.sh main`, the docs tests, the full suites on the approver's go; an independent review
   (dl-020).

## Design

**The version.** `runner-1.2.2` (`ac98a68`), tagged on 2026-11-23 and told to this repository the same day with the
approver's OK; its manifest digest `sha256:8b0c1fd20fd6191d1e4e14725911fe6431237f17ac15a5174cd45e945b12ffbe`,
verified on a `git archive` of the tag (`manifest.mjs --digest`: ok, 17 common files). The approver ruled on
2026-11-23 that this task waits for 1.2.2, not 1.2.1. Its common files name no private project (a test of the
runner's own reads every manifest file); the anonymity check runs again on the copied tree (AC1).

**The criteria, classified.**

| AC | Kind | How it is shown |
|---|---|---|
| 1 | characterization | `manifest.mjs --digest sha256:…` ok in the worktree; the anonymity check on the copied tree, counts only |
| 2 | red-first, with 3 | the config test below reads `config/runner.yaml`; the rest is read from the file in review |
| 3 | red-first | `test/unit/docs/runner-config.test.ts`, red before `config/runner.yaml` exists, then by mutation |
| 4 | red-first, with 3 | the same test: the trunk's `agent` is a `team.agents` entry with an email, `approval_authority: false`, not a member |
| 5 | characterization | `run.mjs --line trunk --doctor` and `--dry-run`, run from the home, their output quoted in the notes |
| 6 | characterization | `install-schedule.sh` from the home; `systemctl --user is-enabled` answers `disabled` |
| 7, 8 | process | the notes; pre-review, the docs tests, the full suites on the approver's go, an independent review |

**What is copied, and how it stays unchanged.**

- `common/` at the tag, extracted at the root (`git archive runner-1.2.2 common | tar -x --strip-components=1`):
  `scripts/runner/`, `scripts/checks/`, `scripts/lib/`, and of the machine files the systemd units and
  `install-schedule.sh` (AC6). `scripts/setup/codex-apparmor.sh` is left out: no line runs Codex (the subscription
  ended), and a missing machine file does not change the digest.
- The copied files are never reformatted: `.prettierignore` and ESLint's ignores name the four folders, and the
  manifest is their check. An update is `git apply` of the runner's patch and the digest again (ADOPTION.md).
- `runner.test.mjs` is the runner's own `node --test` suite. `npm run test:runner` runs it, and the full suites gain
  a `RUNNER` stage, so the copy is tested at every approval.
- The scripts `require('js-yaml')`, which this repository has only through `wingfoil`: it becomes a devDependency at
  the same version (4.3.2), so that a WingFoil update cannot remove it.
- The adapters `claude-opus.yaml` and `claude-sonnet.yaml` go to `.wingfoil/agents/custom/`; the two Codex adapters
  are not copied, for the same reason as `codex-apparmor.sh` (a deviation from AC5's "the adapters").

**`config/runner.yaml`**, from the package's `config/wingfoil-benchmark.runner.yaml` at the tag, checked against
the composed workflows: `push: false`; `launch.allow: [work-item]`, `launch.manual: [work-item.real-agent-check]`,
`phases.integrate: [work-item.done]`; `integration: { merge: no-ff, update: merge, task_branch: task/{id} }`; every
role of `dna.yaml` but the approver with a tier; one `trunk` line on `main`, `release_line: rl-001` (the runner
otherwise expects `rl-trunk`), its `agent` the runner's identity, tiers `high: claude-opus`,
`intermediate: claude-sonnet`, no `reviewer_agent`; `notices.paths: relative`; no Codex `adapter_extra_args`. The
machine's paths (the line's checkout and worktrees, `paths.runner`) live in `config/runner.local.yaml`, git-ignored.
`dna.yaml` gains the runner's `team.agents` entry and `paths.runs: [docs/runs/]`; `docs/notices.md` holds the two
markers.

**The test (AC3, AC4).** It fails when `launch.allow` or `phases.integrate` matches a step that spends or that the
release owns — `campaign-cycle`, the `release` slot, `release-flow`'s release phases, `*`, or
`work-item.real-agent-check` unless `launch.manual` holds it — and when the trunk's `agent` can approve (no
`team.agents` entry, `approval_authority` not false, or a name in `team.members`). The step list is read with the
runner's own matcher semantics (`workflow`, `workflow.phase`, `*`).

**The home and the line, outside every working checkout.** The home: a clone of `origin` in a folder of runner
homes beside the workspace's checkouts, `npm ci`, no agent working in it; the line: a clone in a folder of runner
lines, with its worktrees beside it, `npm ci`. Neither path is written in a tracked file. With `push: false`, the line's
work reaches `origin` by the approver's push from the home (ADOPTION.md 5a), and the main checkout fetches it.
While this task is unmerged, the home's `trusted_ref` is the task branch, set only in the home's
`config/runner.local.yaml` (which the drift check does not read); after the merge and the push it falls back to
`origin/main`, and the doctor runs again (the done step's note).

**What this task does not do.** It starts no real-agent session and enables no timer (AC6). The runner's directive
of ADOPTION.md step 8 is not written: `.wingfoil/` and `config/runner.yaml` say what it would, and the pilot's
first task shows what an agent misses. The rl-1 example in the comments of `memory.yaml` and the release template
becomes rl-001 (task-127 named the line before WingFoil gave it its id). plan-006 and `docs/pack-deviations.md`
name `runner-1.2.2`.

**Open for the approver: `weekly_token_budget`.** AC2 sets it after the pilot's first task, but the doctor refuses a
line without a positive integer, so AC5's `ok` needs a value first. Either a provisional budget the approver names
now, replaced after the first task, or AC5's `ok` read as "ok but for the budget" until then.

## Execution notes

**The copy (AC1).** `git -C <runner package> archive runner-1.2.2 common | tar -x --strip-components=1
--exclude=common/scripts/setup`, and `adapters/claude-opus.yaml`, `adapters/claude-sonnet.yaml` to
`.wingfoil/agents/custom/`. In the worktree, `node scripts/runner/manifest.mjs --digest
sha256:8b0c1fd20fd6191d1e4e14725911fe6431237f17ac15a5174cd45e945b12ffbe`: "ok: runner 1.2.2, the 16 common files
match the manifest, 1 machine file(s) left out: scripts/setup/codex-apparmor.sh", "ok: manifest sha256 …", exit 0.
The anonymity check on the copied files (the folder names of the machine's workspaces, counts only): two hits, both
dictionary words already common in the published tree; the `DFD_`/`dfd-` strings are the runner's aliases of its
1.2.1 names (its ADOPTION.md, "Nomi del runner"), no project's name.

**Red first (AC3, AC4).** `test/unit/docs/runner-config.test.ts`: 5 of 5 red before `config/runner.yaml` existed
(`e7b51326`), green after. By mutation, each one red alone: allowing `campaign-cycle`, `"*"`, `release-flow`,
`delivery`, `release.calibration`; integrating `release-flow.release`; `work-item.real-agent-check` not manual; the
runner's `approval_authority: true`; the approver as the line's agent. Allowing `bug-ingest` stays green. Two more
red-first cases came from WingFoil's refusals below (`b4b5912c`, the next one). The full suites' sixth stage:
`test/unit/scripts/full-suites.test.ts` red first (`923067da`), then `RUNNER` in `scripts/full-suites.sh`.

**The identity (AC4), as built.** AC4's `runner@wingfoil-benchmark.invalid` is refused by WingFoil 0.3.2:
`workflow list` fails, "an agent email may not be on a reserved top-level domain (.test, .example, .invalid,
.localhost …, bug-261)". The approver chose a GitHub noreply address (2026-11-24); WingFoil refuses that too, "a
GitHub noreply agent email must be id-qualified, <id>+<login>@users.noreply.github.com", and the runner has no
account. The approver then chose `runner@wingfoil.github.io` (2026-11-24). The runner's doctor also wants every
`team.agents` entry with an email ("agent Claude Code has no email"): Claude Code gets `noreply@anthropic.com`, the
address of its `Co-Authored-By` trailer. AC4's address needs the approver's amend of this task.

**The budget (AC2).** The doctor refuses a line with no positive `weekly_token_budget` ("set it from a pilot task").
The approver chose a provisional 20000000 (2026-11-24), to be replaced after the pilot's first task.

**The runner's own tests.** `node --test scripts/runner/runner.test.mjs`: 92 pass, 3 fail, 1 skipped as shipped.
Test 26 (every line's agent in `team.agents` with an email) passed once `dna.yaml` had the entry. Tests 25 and 27
assume one project's trunk: the line's agent named `claude` or `codex` from its adapter's command, and a trunk
written by `claude` and reviewed by `codex`. They contradict the maintainers' answer that a line's `agent` is an
identity only. `npm run test:runner` skips them by name (`--test-skip-pattern`): 93 pass. Sent to the coordination
session for the maintainers on 2026-11-24, with the approver's OK, asking for a 1.2.3.

**The home and the line (AC5).** The home: a clone of `origin` in a folder of runner homes, `npm ci`. The line: a
clone in a folder of runner lines, worktrees beside it, `npm ci`. Their paths are only in the home's
`config/runner.local.yaml` (git-ignored; `config/runner.local.example.yaml` is committed with placeholders). While
this task is unmerged, the task branch is fetched into both (`git fetch <worktree> <branch>`, `merge --ff-only`): the
home's `paths.trusted_ref` is a local branch `task-177-pilot`, the line's `main` is the task branch, never pushed.

| Command (from the home) | Declared | Observed |
|---|---|---|
| `run.mjs --line trunk --doctor`, line on `origin/main` | the project's problems | 5 FAIL: the runner's agent, `paths.runs`, the budget, `docs/notices.md`, Claude Code's email (the line had none of this task's files) |
| the same, line on the task branch | `ok` | first `workflow list` failing (the emails above), then the budget; after both, "ok: the project can run under the runner", exit 0 |
| `run.mjs --line trunk --dry-run` | the step it would launch, nothing written | `work-item.build@task:task-127-…`, a task already done (F-050); nothing written in the home or the line |
| `wingfoil workflow finalize plan-006-release-v0.4 --step work-item.build@task:task-127-… --reason …` | the step recorded complete, an empty commit | `50f7c651`; the frontier then shows task-127's `real-agent-check` as "human needed", routed to the approver |
| `run.mjs --line trunk --dry-run`, again | the next step | `work-item.build@task:task-177-…`, agent "WingFoil Benchmark Runner", adapter `claude-sonnet`, model `claude-sonnet-5-5`, in the line's worktrees; notice N-001 for task-127's real-agent check (not written in a dry run); task-168's start "held by a WIP limit" |
| `scripts/runner/install-schedule.sh` | the units written, every timer disabled | `wingfoil-benchmark-runner@.service` and `.timer` in `~/.config/systemd/user`; `is-enabled`: disabled, `is-active`: inactive; a warning that `scripts/setup/codex-apparmor.sh` is missing (no Codex step runs) |

**For the done step.** After the merge and the approver's push: the home back on `origin/main` (its local
`trusted_ref` line removed), the line's `main` fast-forwarded to `origin/main`, the doctor again;
`workflow finalize --step work-item.build@task:task-177-…`, since this task too is built by hand. Then the
approver may enable the timer: `systemctl --user enable --now wingfoil-benchmark-runner@trunk.timer`.

**Not in this task.** The governance ruling of 2026-11-23 has the runner also run `campaign-cycle`'s agent steps,
the paid launch a manual step; AC3 keeps `campaign-cycle` out of `launch.allow`. Allowing its agent steps is a
change of its own, with the test changed first. Every `wingfoil` command above ran as `npx --no-install wingfoil`
(0.3.2): the `wingfoil` on the machine's PATH is an older global install.

### Review

- **Round 1** (an independent read-only subagent, in a temporary clone, on `main...1e9143f8`; the main checkout's
  reflog unchanged after it). No blocker; seven should-fix and nine nits. It verified the copy blob by blob against
  the tag, every key of `config/runner.yaml` against the runner's code, the test's matcher against `stepMatches`, the
  skip pattern (exactly tests 25 and 27), the finalize commit and the docs.
  - S1, fixed: the runner's `executes_as` named product-owner and tech-lead, which made WingFoil treat those steps as
    agent work for every client; it is now developer, reviewer, qa, architect.
  - S2, fixed: this element named the machine's folders of runner homes and lines; they are described, not named.
  - S3, fixed: the package's `role_scope` (a reviewer writes only `docs/`, a qa outside its paths reported) restored.
  - S4, fixed: `integration.test_command` was the default `npm test`; it is now niced with two workers.
  - S5, fixed red-first: the full suites' runner stage failed every branch from before this task; such a branch's
    stage is now `-`, and nothing runs for it.
  - S6, fixed red-first by mutation: the config test now also fails on `weekly_mains`, `live_checks` or
    `life_cycle_start`, on a local file holding more than the lines' checkout and worktrees and `paths`, on an owned
    workflow that includes an allowed one, on an owned name no workflow has, and on a role with no tier or a tier
    whose adapter is missing or names no model (what the skipped test 25 also checked, N6). Each mutation red alone;
    a local file with paths only stays green.
  - S7, open for the approver: AC4's email is amended by the approver before done.
  - Nits fixed: the config's comments (the test's place, the real-agent check held first as an optional step that
    awaits the approver, no `distinct_from` enforced, the trailers carrying the identity's email with the model's
    name and `AI-Model`); F-050's notice was announced by a dry run, not written; D8 back among the deviations, and
    the copied checks run only once a step binds them. Left as is: `scripts/setup/` in the ignore lists, harmless and
    ready for the machine file if a Codex line comes.
- **Round 2, the re-review of the fixes** (an independent read-only subagent, in a temporary clone, on
  `1e9143f8..06a9badf`; the main checkout's reflog unchanged). Every fix of round 1 confirmed against the runner's
  and WingFoil's code (S1: work-item's developer and reviewer steps still launch, the approver's stays human; S3: a
  review step writes only under `docs/`; S4: the argv runs with no shell, and Claude Code strips `nice` before
  matching its allowlist); each new assertion red alone by mutation. No blocker, no should-fix; five nits, fixed:
  the trunk's comment wrapped; `dna.yaml`'s comment states that WingFoil takes any agent's roles; the local-file
  check also reads the committed example, so it checks something where the suites run, and allows only `runner`,
  `setup` and `trusted_ref` under `paths`; the full suites' header names `-`; a double blank line. A wildcard in
  `launch.allow` (its N-d) is already refused by the launch test. The review closes.
- **Full suites** (`scripts/full-suites.sh` from the main checkout, 2026-11-24, at `dd09c4b3`, worktree clean): LINT 0,
  TEST 0, BUILD 0, BIN 0, DOCKER 0 (log `.cache/full-suites/2026-11-24/task_task-177-…-dd09c4b3-100134.txt` in the
  main checkout; 158 test files, 2571 tests passed and 10 skipped; test:bin 22 passed; test:docker 22 passed and 2
  skipped). The main checkout's script predates this branch's RUNNER stage, so `npm run test:runner` ran apart at the
  same commit: 94 tests, 93 passed, 1 skipped, exit 0.
