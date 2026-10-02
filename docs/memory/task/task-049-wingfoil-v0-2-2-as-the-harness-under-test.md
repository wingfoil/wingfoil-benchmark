---
id: task-049-wingfoil-v0-2-2-as-the-harness-under-test
type: task
title: "WingFoil v0.2.2 as the harness under test"
status: backlog
release: v0.1
wave: calibration
features: [F2.6, F3.6]
acceptance: [runner.feature, scenarios.feature]
requirements: [REQ-RUN-14, REQ-FMT-10, REQ-SCO-10]
---

## Context

The first task of plan-003 step 3, **calibration**, in release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It is not a wave: `wave: calibration` names the `release-cycle` phase it belongs to.

The reference campaign runs on **the latest released WingFoil** ([rel-v0-1](../release/rel-v0-1.md) Goal,
sequencer decision 3 as amended in 1.1). That is now **v0.2.2** (tag `v0.2.2`, 2026-09-29), 1168 commits
after the development pin `3df305e` every wave was delivered against. Calibration's dry runs price the
campaign, so the wingfoil arm must be dry-run on the WingFoil the campaign will run. A dry run on `3df305e`
would still be accepted by the estimate — a dry-run cost is keyed by scenario version, arm and model
(task-021 decision 2), not by harness — and would price the wrong harness without saying so. The approver's
choice of 2026-10-02: calibrate on v0.2.2, in two tasks, this one first, then the dry runs (task-050).

This task brings forward the items `rel-v0-1` lists as due "before the reference campaign" that depend on
the WingFoil pin, so that they hold when the first dry run starts:

- `arms/wingfoil/arm.yaml` `provides` re-assessed on v0.2.2 (W6, K5, REQ-FMT-10): `directive-delivery`
  beside the MCP probe (W3, W6), `memory-lifecycle`, `workflow-engine`, `mcp-tools`;
- the wingfoil arm's setup (`arms/wingfoil/setup.sh`) run on v0.2.2: `init --template Kanban`, the scenario
  configuration over it, the Benchmark Approver in `dna.yaml`;
- `test/fixtures/wingfoil-config/S8/` and `S8.PROJECT_RULES.md` refreshed from a run with v0.2.2 (W8);
- each place that states the pin `3df305e` as the WingFoil under test, rather than as a fixture value, read
  again: K5 in `scenarios/README.md`, T10 and `harness-gaps` in `site-content/method.md` (W11), the finding
  note's template commit (REQ-RES-05).

Scope: arm definition, setup, fixtures and the statements above; the Docker tests run with v0.2.2 as the
harness. **No real agent, no spending**: every run of this task uses the scripted fake agent.

Out of scope:

- `scenarios/dry-run.yaml`, the dry runs, the revised budget and the scenarios' registration: task-050.
- `vendor/wingfoil-0.2-pre-3df305e.tgz`, the WingFoil that manages this repository: it is not the WingFoil
  under test (`vendor/README.md`) and stays as it is.
- Unit-test fixtures that use `3df305e` as a sample SHA: a value, not the pin.

**Done** means:

- the wingfoil arm sets up on v0.2.2 in the runner's container, its `provides` stated from what v0.2.2 does,
  each with its evidence in the notes;
- `npm test` and `npm run test:docker` green with v0.2.2 as the harness, coverage above 80%, lint clean;
- each statement of the pin either names v0.2.2 or says why it keeps `3df305e`; a requirement or approved
  document that changes is an amendment with a raised version and a recorded review decision.

## Acceptance criteria

Classified in the design phase.

- `runner.feature` @F2.6 "The WingFoil under test is the version pinned by the campaign" — with a released
  version as the pin. **Red-first** in the Docker test (W3's), which pins `v0.2.2` and expects the run to
  record `12537b62…`, the tag's commit; **characterization** in the acceptance test, whose doubles resolve
  any pin (the Gherkin keeps its example `3df305e`: a value, not the pin).
- `scenarios.feature` @F3.6 — expected failures read `provides`. **Characterization**: v0.2.2 offers what
  `3df305e` offered (below), so no expected failure moves; the unit test of K5's facts names v0.2.2.
- REQ-RUN-14 — a released version resolves to a commit of the clone and builds. **Characterization**:
  `resolveCommit` already takes a tag, and REQ-FMT-03 already accepts `v0.2.2`; the Docker tests show
  the build of the tag.
- The wingfoil manual's commands work against v0.2.2 (F2.7, REQ-RUN-17). **Red-first**: a fake step that
  writes a task's body and then follows the manual is refused by v0.2.2's write guard as the manual reads
  today (choice 1).

## Design

### What v0.2.2 is, against `3df305e` (read from the tag, 2026-10-02)

Read through `git show v0.2.2:…` in the WingFoil clone; nothing written there. `v0.2.2` is
`12537b627ce0517222da762e8fa90997a1208a4b` (2026-09-29); `3df305e` is its ancestor, older than v0.2.0.

| Capability (`provides`) | `3df305e` | v0.2.2 | Evidence at the tag |
|---|---|---|---|
| `directive-delivery` | true | **true**, unchanged | the `<role>-session` MCP Prompts and `wingfoil directives list --role`; `src/mcp/prompt.ts` and `server.ts` identical |
| `memory-lifecycle` | true | **true** | `memory add/submit/approve/reject/deprecate/history/search`, same shape; `add --set` is new |
| `workflow-engine` | false | **false** | only `workflow list`; the module says "there is no workflow engine yet"; README plans it for 0.3 |
| `mcp-tools` | false | **false** | `server.ts` registers Resources and Prompts only; tool registration exists in `registrar.ts` but nothing calls it outside tests ("Tools are … v0.4 scope") |

So `arms/wingfoil/arm.yaml` keeps its four values; its comment names v0.2.2. adr-003 asks decision 13 to
be re-checked for the release pinned, **by re-running `spikes/task-011/p6-mcp.sh` against it**: the build
does that, and its output is the evidence for `mcp-tools: false`, not the source reading alone.

**What did change and touches the arm** — both new in v0.2.2, both refusals with exit 1:

1. **Approval authority is read from the `dna.yaml` committed at `HEAD`** (`approval-authority.ts`). The
   setup already commits the Benchmark Approver ("declare the Benchmark Approver"), so the agent's
   `memory approve` after "Approved. Proceed." keeps working. The Docker test shows it.
2. **A write refuses a target with modifications it does not own** (`write-guard.ts`, WingFoil's dl-080):
   `memory submit` refuses a document whose body is edited and not committed. The manual says "write what
   you did in the file it creates, then `wingfoil memory submit <id>`" — exactly the sequence v0.2.2
   refuses. That is choice 1.

`init --template Kanban` still works with no terminal, commits by itself and writes the same files (only a
commented example in `dna.yaml` differs). `npm ci` + `npm pack` from the archive build through `prepack`;
the build side now also downloads `wingfoil@0.2.1` (a devDependency, `wingfoil-released`), which the
runner's build container fetches like any other. The `bug` and `decision-log` templates are unchanged; they
moved from `docs/self/.wingfoil/memory/templates/` to `.wingfoil/memory/templates/`.

### Changes

- **`arms/wingfoil/arm.yaml`:** the comment names v0.2.2 and the evidence; values unchanged.
- **`arms/wingfoil/manual.md`:** choice 1.
- **`arms/wingfoil/setup.sh`:** choice 2, step 4 by `wingfoil dna add team.members`. Its SHA-256 changes, which is fine: no campaign execution
  exists yet, and the site refuses an execution only against a manual its runs recorded.
- **Fixtures that pin the WingFoil under test** (not those that use `3df305e` as a sample SHA):
  `test/fixtures/campaigns/arms.yaml` and `test/support/dry-run-fixture.ts` pin `v0.2.2`, so every Docker
  test with the clone (W3, S1–S3 and S8 in baseline-docs and wingfoil) builds and runs the tag. W3's test
  resolves `v0.2.2^{commit}`.
- **`test/fixtures/wingfoil-config/S8/` and `S8.PROJECT_RULES.md`:** refreshed as task-038 took them, from
  a dry run of S8@1.0 in baseline-docs with the fake replaying the reference, WingFoil now v0.2.2; its
  README names v0.2.2.
- **A fake step that follows the manual** (`test/fixtures/fake-script-arms.json`, the wingfoil arm's step):
  `memory add`, a line written to the task's body, then the manual's own sequence to `submit`, and
  `approve` after the reply. Red against today's manual, green with choice 1.
- **`test/unit/arms/load.test.ts`, `manuals.test.ts`:** K5's facts and "no MCP Tool" name v0.2.2.
- **The finding note's template commit** (`src/results/finding.ts`, REQ-RES-05): choice 3.
- **Statements of the pin** — amendments, each with a raised version and a review decision:
  - `docs/02_specification/scenarios/README.md` 1.3: K5 names v0.2.2 as the WingFoil the campaign
    runs, and that it has no workflow engine and no MCP Tools either;
  - `site-content/method.md`: T10 keeps "at design time … `3df305e`" and adds that v0.2.2, which the
    campaign runs, has no workflow engine either (its source unchanged: the threat table); `harness-gaps`
    says nothing of a pin and stays;
  - adr-003: an amendment recording decision 13 re-checked on v0.2.2.
- **Unchanged:** `vendor/` and its managing WingFoil; the Gherkin examples; unit fixtures' sample SHAs;
  `src/runner/harness.ts` (it already resolves a tag).

### Choices confirmed by the approver (2026-10-02)

1. **The manual and the write guard: the manual is corrected.** v0.2.2 refuses `submit` on a body not yet
   committed, and the manual prescribed exactly that sequence. In "While you work", both the task line and
   the decision-log line read "…, commit that file, then `wingfoil memory submit <id>`". Only the sequence
   is added, not WingFoil's reason; no commit message is prescribed; `approve` is unchanged (nothing is
   edited after the reply); the baseline manuals are untouched. Set aside: (b) leaving the manual, which
   would bill the arm for a manual known to be wrong. The approver asked for the wording first and accepted
   it as proposed.
2. **The approver member: WingFoil's own verb.** The setup declares the Benchmark Approver with
   `wingfoil dna add team.members --value "Benchmark Approver" --entry-email approver@benchmark.localhost
   --entry-roles approver`, which commits itself, still only when no member has that e-mail (a scenario's
   configuration may bring one, and v0.2.2 refuses a duplicate name). The setup then uses WingFoil's
   commands only; it depends on v0.2.2's syntax, which is the pin. The inbox records that v0.2.2 answers
   N33. Set aside: (a) keeping the script.
3. **The finding note's template commit: v0.2.2** (`12537b62`), its `.wingfoil/memory/templates/`. The
   templates are byte-identical to `3df305e`'s, so the note changes only in the commit it names.
   REQ-RES-05 is amended (requirements 1.23). Set aside: (b) keeping `3df305e`.

## Execution notes

- `npx wingfoil memory add --type task --title "WingFoil v0.2.2 as the harness under test"` — declared: creates
  the element from the template at `draft` and commits it. Observed: `1dc614b wf(task): add …`, the element
  at `draft`. The slug reads `v0-2-2`: the managing WingFoil (`3df305e`) turns a `.` into `-`; v0.2.2 keeps it
  (its changelog, task-110). Existing ids are untouched either way.
- `npx wingfoil memory submit task-049-…` (draft → pending) — declared: moves `status` and commits the file.
  Observed: `1343027 wf(task): submit …`, `status: pending`; the body had been committed first (`2176e1c`).
- The approver's `memory approve` (pending → backlog), `59869f5`: `memory history` records
  `operation: approve`, the approver and the reason.
