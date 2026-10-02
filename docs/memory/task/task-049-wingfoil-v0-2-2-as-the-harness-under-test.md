---
id: task-049-wingfoil-v0-2-2-as-the-harness-under-test
type: task
title: "WingFoil v0.2.2 as the harness under test"
status: in-review
release: v0.1
wave: calibration
features: [F2.6, F3.6]
acceptance: [runner.feature, scenarios.feature]
requirements: [REQ-RUN-14, REQ-FMT-10, REQ-SCO-10, REQ-RES-05]
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
- The wingfoil manual's commands work against v0.2.2 (F2.7, REQ-RUN-17). **Characterization**: the fake's
  wingfoil step writes the decision-log's body, then submits and approves as the manual says; the Docker
  test reads the body in the `submit` commit. (First designed red-first on a wrong reading of v0.2.2, see
  choice 1.)

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
2. **A write refuses a target with modifications it does not own** (`write-guard.ts`, WingFoil's dl-080).
   **Corrected in the build:** this design first read it as refusing `memory submit` on an edited body.
   It does not: `memory-transition.ts` says `submit` "is entitled to carry content and is therefore not
   guarded"; only `approve`, `reject` and `deprecate` refuse. Observed on `wingfoil@0.2.2`: a body edited
   and not committed rides in `wf(decision-log): submit …`; `approve` on an edited document is refused,
   "… commit or stash these changes first". The manual's "write …, then `submit`" works as it stands, and
   its `approve` follows a reply, with nothing edited in between.

`init --template Kanban` still works with no terminal, commits by itself and writes the same files (only a
commented example in `dna.yaml` differs). `npm ci` + `npm pack` from the archive build through `prepack`;
the build side now also downloads `wingfoil@0.2.1` (a devDependency, `wingfoil-released`), which the
runner's build container fetches like any other. The `bug` and `decision-log` templates are unchanged; they
moved from `docs/self/.wingfoil/memory/templates/` to `.wingfoil/memory/templates/`.

### Changes

- **`arms/wingfoil/arm.yaml`:** the comment names v0.2.2 and the evidence; values unchanged.
- **`arms/wingfoil/manual.md`:** unchanged (choice 1, withdrawn).
- **`arms/wingfoil/setup.sh`:** choice 2, step 4 by `wingfoil dna add team.members`.
- **Fixtures that pin the WingFoil under test** (not those that use `3df305e` as a sample SHA):
  `test/fixtures/campaigns/arms.yaml` and `test/support/dry-run-fixture.ts` pin `v0.2.2`, so every Docker
  test with the clone (W3, S1–S3 and S8 in baseline-docs and wingfoil) builds and runs the tag. W3's test
  resolves `v0.2.2^{commit}`.
- **`test/fixtures/wingfoil-config/S8/` and `S8.PROJECT_RULES.md`:** refreshed as task-038 took them, from
  a dry run of S8@1.0 in baseline-docs with the fake replaying the reference, WingFoil now v0.2.2; its
  README names v0.2.2.
- **A fake step that follows the manual** (`test/fixtures/fake-script-arms.json`, the wingfoil arm's step):
  `memory add`, a line written to the decision-log's body, `submit`, and `approve` after the reply.
- **`test/unit/arms/load.test.ts`, `manuals.test.ts`:** K5's facts and "no MCP Tool" name v0.2.2.
- **Fixtures, as built:** the Docker tests pin v0.2.2 through `test/fixtures/campaigns/arms.yaml` and their
  own `WINGFOIL_UNDER_TEST`, which `withClone()` returns; `test/support/dry-run-fixture.ts` keeps `3df305e`,
  since the unit tests' doubles resolve that pin (a deviation from the list above).
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

1. **The manual and the write guard — withdrawn in the build (the approver, 2026-10-02): the manual stays as
   it is.** The build found that v0.2.2 does not refuse `submit` on an edited body (the design's reading,
   corrected above); the approver chose to leave the manual unchanged over adding a line about `approve`
   or keeping the superfluous step. What had been confirmed, on the wrong reading: in "While you work",
   the task line and the decision-log line were to read "…, commit that file, then `wingfoil memory submit
   <id>`" (`bb9ce5e`), and a red unit test for that wording was committed (`d42f334`) and then removed
   (`1c87f9f`).
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
- `npx wingfoil memory submit task-049-…` (backlog → in-progress), on the task branch in its own worktree —
  declared: moves `status` and commits the file. Observed: `d381827 wf(task): submit …`, `status: in-progress`.

### Build

Commits on `task/task-049-wingfoil-v0-2-2-as-the-harness-under-test`:

- `d42f334` (red): the Docker tests pin v0.2.2; the fake meets a write guard on `submit`; a manual test for
  "commit that file, then submit"; the setup's approver by `dna add`.
- `1c87f9f` (red, corrected): after the finding below, the manual test removed and the fake writing the body
  before `submit`; the `dna.yaml` `dna add` writes (`roles: [approver]`); the finding note naming v0.2.2.
- `6f4b9e0`: `arms/wingfoil/setup.sh` step 4 by `wingfoil dna add team.members` (the team read whole
  first, since `grep -q` closing a pipe early would fail it under `pipefail`); `arm.yaml`'s comment;
  `TEMPLATE_COMMIT` `v0.2.2 (12537b62)`.
- `35146b2`: the design corrected, choice 1 withdrawn.
- `c905c8a`: scenarios README 1.3, requirements 1.23, adr-003 amendment 1. `936b225`: T10.
- `71e9b48`: the S8 snapshot refreshed (below).

**The write guard, as observed — the design's reading was wrong.** The first Docker run (red, 09:20) failed
in the fake's step with exit 1 and no message. Reproduced on the host with `wingfoil@0.2.2` from npm, in a
project `init --template Kanban` made, the Benchmark Approver added by `dna add`:

- `memory add` of a decision-log, a line appended to its body, `memory submit` → **exit 0**, `draft → pending`;
  the commit `wf(decision-log): submit …` carries the status *and* the body line;
- the fake's second `submit` (after a `git commit` that found nothing to commit) → `illegal transition
  pending -> (none)`, exit 1: what had failed the Docker step;
- a line appended again, then `memory approve` → refused: "refusing to commit docs/memory/decision-log/…:
  it carries uncommitted modifications this transition does not own [git status ' M'] — the body. … commit or
  stash these changes first, then retry."

`memory-transition.ts` at the tag says so: `submit` "is entitled to carry content and is therefore not
guarded". The design had generalised from `write-guard.ts`'s header. Put to the approver, who withdrew
choice 1: the manual stays as it is.

**Decision 13 re-checked (adr-003).** `spikes/task-011/p6-mcp.sh` fixes `3df305e` in `lib.sh` and the
`0.1.0` tarball's name in `p2-install.sh`, so it cannot run on v0.2.2 as it stands; its six requests were
sent to `wingfoil mcp` of `wingfoil@0.2.2` in an `init`-ed project:

```
initialize: server={"name":"wingfoil","version":"0.2.2"} capabilities=resources,prompts
tools (0):  ERROR {"code":-32601,"message":"Method not found"}
prompts (7): developer-session, reviewer-session, qa-session, architect-session, product-owner-session, tech-lead-session, approver-session
resources (2): wingfoil://dna, wingfoil://workflows
resource templates (4): wingfoil://memory/{type}, wingfoil://memory/{type}/{id}, wingfoil://dna/{section}, wingfoil://workflows/{name}
```

The npm package is the CI publication of the tag (v0.2.2's changelog: trusted publishing from `wingfoil/wingfoil`);
the runner builds the tag from the clone, which the Docker tests then ran.

**The S8 snapshot**, taken as task-038 took it: a dry run of S8@1.0 in baseline-docs, the fake replaying the
reference, WingFoil v0.2.2 built from the clone, through a temporary test file deleted afterwards. Only
`S8/.wingfoil/dna.yaml` changed — `dna add` keeps `init`'s comments and flow style where the former script
re-dumped the file — and `S8.PROJECT_RULES.md` came out byte-identical; @F2.5 passes on it.

**Tests** (load average 17–56 from other repositories' sessions throughout):

- `npx vitest run -c vitest.docker.config.ts … -t "W3"`: red at 09:20 (as above), green at 09:31 (79 s): the
  run records `12537b62…`, the setup log names it, the approver's commit as the declared member,
  `wf(dna): add team.members Benchmark Approver` in the history, the body in the `submit` commit.
- `npm run test:docker`: **16/16**, 1027 s — S1, S2, S3 and S8 in baseline-docs and wingfoil with v0.2.2
  built from the tag.
- `npm run lint`: clean.

**Inbox:** N35 (v0.2.2 answers N33; the write guard's verbs worth a line in WingFoil's docs).
- `npm test` (with coverage, after the Docker suite, never beside it): **76 files, 1194 tests**, 247 s;
  coverage 98.1 % statements, 90.8 % branches, 99.02 % functions, 99.22 % lines.

### Review

**Independent review** by a fresh read-only agent on the branch against the Design, the confirmed choices,
the amendments, @F2.6 and @F3.6, and traceability (2026-10-02). No blocker; its findings and their outcome:

1. *should-fix* — K5's row still said "today `3df305e`" beside the new v0.2.2 sentence. **Fixed:** "during
   development `3df305e`; from calibration the release `v0.2.2`".
2. *should-fix* — amendment 1.3 said the capabilities were "observed in the runner's container" and
   `tools/list` "unanswered". **Fixed:** the MCP requests went to the `wingfoil@0.2.2` package; `tools/list`
   answers "Method not found"; the container shows setup, directive commands and approval.
3. *should-fix* — step 4's "already declared" branch is run by no test (every scenario configuration has
   `members: []`), and its grep relied on `dna show`'s default output. **Fixed in part:** `--format json`
   makes the format explicit. **Not covered by a repository test:** a scenario configuration declaring the
   approver would change scenario content for a test's sake. Checked on the host instead, with
   `wingfoil@0.2.2` and step 4 cut from `setup.sh`: in a project that already declares the approver it exits 0
   and commits nothing; in a fresh `init`-ed project it commits `wf(dna): add team.members Benchmark
   Approver`; run again there, it commits nothing.
4. *nit* — two loud failures of `dna add` (another member named "Benchmark Approver"; no `approver` role)
   undocumented. **Fixed:** step 4's comment names them; both fail the setup under `set -e`.
5. *nit* — the `HEAD~3` lookup ran before the history assertion. **Fixed:** `log --grep='submit dl-002' -1 -p`,
   as the approval check does.
6. *nit* — adr-003 amendment 1 recorded no review decision. **Fixed:** "pending at task-049's review".
7. *nit* — `requirements` lacked REQ-RES-05, which the task amends. **Fixed.** (F5.4 is not added to
   `features`: the task delivers no part of it, and only a unit test reads the constant.)
8. *nit* — the S8 snapshot's commit missing from the Build list. **Fixed:** `71e9b48`.
9. *nit* — two edited lines past the files' wrap width. **Fixed.**
10. *nit* — stale wording elsewhere: the experiment design's T10 in the present tense (left, as the Design
    records); "write guard" made precise as "of the memory transitions" in the amendments. **Fixed** for the
    latter.

After the fixes: `npm run lint` clean; the arms, finding and site unit tests 130/130; the W3 Docker test green
on v0.2.2 (the setup and the test it changed). The S1–S8 Docker tests were not re-run for `--format json`,
which W3's setup runs in the same script.
- `npx wingfoil memory submit task-049-…` (in-progress → in-review), on the task branch — declared: moves
  `status` and commits the file. Observed: `9b1618f wf(task): submit …`, `status: in-review`; the body
  committed first (`980ef39`).
