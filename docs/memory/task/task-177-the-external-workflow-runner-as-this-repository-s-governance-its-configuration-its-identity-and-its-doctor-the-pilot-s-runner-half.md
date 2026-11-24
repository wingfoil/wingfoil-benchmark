---
id: task-177-the-external-workflow-runner-as-this-repository-s-governance-its-configuration-its-identity-and-its-doctor-the-pilot-s-runner-half
type: task
title: "The external workflow runner as this repository's governance: its configuration, its identity and its doctor, the pilot's runner half"
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

1. The runner's common files at its tag copied unchanged, their manifest checked (`manifest.mjs --digest`), and none
   of them naming a private project (the anonymity check, counts only, run on the copied tree).
2. `config/runner.yaml`: one `trunk` line, its checkout and worktrees outside the main checkout, in a git-ignored
   `config/runner.local.yaml`; `launch.allow: [work-item]`; `launch.manual` naming `work-item.real-agent-check`;
   `phases.integrate: [work-item.done]`; `integration.task_branch: task/{id}`, `merge: no-ff`; Claude as the
   reviewer too, in another session; `paths.runs: [docs/runs/]`; `weekly_token_budget` set after the pilot's first
   task.
3. Red first: a test fails when `config/runner.yaml` allows `campaign-cycle`, the release slot, `*` or any step that
   spends, or when the runner's identity can approve.
4. **The runner's identity** (the approver, 2026-11-23): a `team.agents` entry "WingFoil Benchmark Runner"
   (`runner@wingfoil-benchmark.invalid`), `approval_authority: false`, named as the trunk line's `agent`; the
   launched model credited by `Co-Authored-By`; gates ruled only by the approver through `gate.mjs`.
5. The adapters in `.wingfoil/agents/custom/`; `docs/notices.md` with its markers; the runner's home and the line's
   clone prepared outside every working checkout; `run.mjs --line trunk --doctor` answers `ok` and `--dry-run`
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

**The home and the line, outside every working checkout.** The home: a clone of `origin` under
`~/Workspaces/runner-homes/`, `npm ci`, no agent working in it; the line: a clone under `~/Workspaces/runner-lines/`
with its worktrees beside it, `npm ci`. Neither path is written in a tracked file. With `push: false`, the line's
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

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
