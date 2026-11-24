# Deviations from the published packs

This repository's governance is composed from three packs of wingfoil-templates: `base` 2.0.1, `software` 1.0.0 and
`methodology/kanban` 1.0.0, run on WingFoil 0.3.2 (task-127, the approver's choices 1–7 in chat, 2026-11-23). This
file lists every place where `.wingfoil/` differs from the reference composer's output, and why. A file under
`.wingfoil/workflows/built-in/` and `.wingfoil/directives/built-in/` is the composer's output, byte for byte; every
difference lives in a `custom/` file or in `workflows.yaml`, `memory.yaml`, `roles.yaml`, `dna.yaml` and the
templates.

**The composition.** The reference composer of wingfoil-templates, at `main` (whose three packs are byte-identical to
their tags), with `base`'s required parameters and the paths and ids this repository already used, so that no element
moved. The command and the digest of its output are in task-127's Execution notes. To check the built-in files against
a new composition, run the same command and compare.

**Test.** `test/unit/docs/workflows-config.test.ts` holds the composition together: every included file exists, no
two included workflows share a name, every `include` names a loaded sub-workflow, every fallback names a step of its
own workflow, an included sub-workflow is iterated over its own element type, and no workflow names a state its
element's machine lacks, in a `where` status filter, a `set_state` or a fallback's `set_state` (WingFoil 0.3.2
reports none of the first and only some of the others, F-049).

## D1 — the Memory machines of `bug`, `decision-log` and `adr` stay this repository's

| Type | The packs | Here |
|---|---|---|
| `bug` | `software`'s: draft, open, triaged, planned, in-progress, in-review, resolved, closed | draft, pending, approved, fixed (bug-005) |
| `decision-log` | `base`'s: draft, in-discussion, ready | the default machine: draft, pending, approved |
| `adr` | `software`'s: draft, pending, accepted, superseded | the default machine: draft, pending, approved |
| `task` | `kanban`'s, with `returns` and the two WIP limits | the same, set to this repository's WIP of 1 and 1 |
| `release` | `software`'s, with no gate | this repository's two gates (D2) |
| `plan`, `tech-spec`, `release-line` | the packs' | the packs': `plan` waits at `active`, which `workflow end` finalizes |
| `campaign` | — | this repository's type, not amendable |

The other properties of the types are the packs': every pack type is `amendable` (a correction through
`memory amend`, the approver's) except `release-line`, and a task may carry `release: "n/a — <reason>"`
(`not_applicable_allowed`), as the `kanban` directive says.

**Why.** No element changes state, the traceability test and `fixes`/`fixed_by` stay as they are, and the pilot's
rollback stays a revert. The migration is weighed when the pilot ends.

**Consequence.** The composed `bug-ingest` still describes a triage that "moves it to triaged": here its approve moves
the bug pending → approved, which is the same ruling under this repository's name. `end-of-life`'s approve selects
`pending` decision-logs, where the pack selects `in-discussion` (D4).

## D2 — the release keeps its two gates

The release machine stays draft, planning (gate), in-development, releasing (gate), released, where the pack's has
the same states and no gate: both gates are the approver's. The composed type requires a `release-line` field, so the
type requires it here too, and the release-line type takes `base`'s machine (draft, planning, active, done);
`rel-v0.4` names the first release line, `rl-001` (WingFoil pads `rl-{n}`).

`delivery` is a custom copy. Its `plan-release` step takes `memory.add`, `memory.submit` (draft → planning) and
`memory.approve` (planning → in-development, the approver's), where the pack has two submits, which a gated planning
refuses (WingFoil reports `W_PHASE_EXIT_STATE_UNDETERMINED`).

## D3 — `work-item` carries the benchmark's delivery rules

`work-item` is a custom copy with the pack's five steps, so that the external workflow runner and WingFoil's engine
find their keys: `start`, `build`, `review`, `approve`, `done`. Each step carries the rules of the retired
`kanban-delivery` (version 6): the Design and the classification of the criteria in `start`; test-first in `build`;
in `review`, `scripts/pre-review.sh main`, an independent read-only review with severities and a re-review (dl-020),
the post-fix checklist and the diff under about 1 200 lines; in `approve`, the full suites at the commit offered for
approval (dl-016) and the approver's gate, with `build` as its fallback; in `done`, the `--no-ff` merge, the fixed
bugs moved to `fixed` and the wave's "Ends with" recorded. The real-agent check is a manual, optional step with the
approver's approval (dl-006); its `produces` (the release's ledger) is dropped, for the reason of D5. A task's
pending → backlog gate stays outside the flow, as in the pack. The review step also names the practice since v0.3
that is not v6's (a reviewer in a temporary directory, the reflog after each round, a final review of the last
diff), credited to task-167, which writes it down.

| `kanban-delivery` (v6) | `work-item` |
|---|---|
| `plan` | outside the flow: the task's pending → backlog gate |
| `design` | `start` |
| `build` | `build` |
| `review` | `review` |
| the approval | `approve` |
| `deliver` | `done` |
| `real-agent-check` | `real-agent-check` (manual) |

## D4 — the slots are filled by this repository's workflows

| Slot | The pack's default | Here |
|---|---|---|
| `inception` | `software`'s | `custom/inception.yaml`, from `benchmark-inception` (plan-001) |
| `specification` | `software`'s, which writes a tech-spec | `custom/specification.yaml`, from `benchmark-specification` (plan-002) |
| `release` | `software`'s `release`, which includes `release-submit` and `release-publishing` | `custom/release.yaml`: calibration, validation and the campaign, then the checks, releasing and publishing, as its own steps; `release-submit` and `release-publishing` are not included |
| `end-of-life` | `software`'s | `custom/end-of-life.yaml`, its decision-log state `pending` (D1) |

`release-cycle` retires. Its phases map to `delivery`'s `plan-release` and `release-flow`'s `work`, `release` and
`retrospective`, and their rules are carried into `plan-release` (the scope from the sequencer, the new features'
specification, the triage, the first tasks) and `release.yaml` (calibration's ledger, validation's scenario and its
tie-break, the runs from the main checkout, the README link the approver makes); plan-006 names `sw-life-cycle`,
phase `delivery`. `campaign-cycle` and `scenario-authoring` stay
this repository's main workflows: a release's campaign launches `campaign-cycle` rather than including it (dl-022).

## D5 — `retrospective` and `governance-evolution` have no `produces`

Both are custom copies with every `produces` removed. WingFoil 0.3 reads a completed step's evidence from the whole
repository (WingFoil bug-488, F-043): with `produces`, a new instance would find the evidence of an earlier release
and close its steps at once. `retrospective`'s approve selects `pending` decision-logs tagged `retrospective` (D1),
and its capture and decide steps name this repository's inputs: the WingFoil feedback inbox and the release
element's Retrospective section.
The copies go back to the pack's files once WingFoil scopes the evidence to the instance.

## D6 — `init`'s built-in directives stay

The directives `wingfoil init` wrote under `directives/built-in/` stay, with their assignments in `roles.yaml` beside
the packs'. This repository's own directives that were `init`'s stubs (`traceability`, `doc-versioning`,
`security-secrets`, `determinism`) give way to the packs' files of the same name. `code-review`, `multi-session` and
`wingfoil-cli` stay custom.

## D7 — the colliding custom workflows are removed

`sw-life-cycle`, `bug-ingest`, `decision-log-ingest` and `adr-ingest` had custom versions whose names the packs also
use, and WingFoil refuses every `workflow` command when two included workflows share a name. They are removed; their
record stays in git. The composed versions add the approver's gate to the three ingests and replace
`sw-life-cycle`'s `release-cycle` and `sunset` phases with `delivery` and `end-of-life`; what the custom
`sw-life-cycle` said about later releases' specification is carried into `plan-release` (D4). `kanban-delivery`,
`release-cycle`, `benchmark-inception` and `benchmark-specification` are removed or renamed by D3 and D4.

## D8 — the external workflow runner runs the governance (task-177)

The runner's common files at `runner-1.2.2` are copied unchanged into `scripts/runner/`, `scripts/checks/` and
`scripts/lib/` (manifest digest `sha256:8b0c1fd2…2ffbe`, checked with `node scripts/runner/manifest.mjs --digest`);
the machine file `scripts/setup/codex-apparmor.sh` and the Codex adapters are left out, as no line runs Codex.
Prettier and ESLint ignore the copied folders: the manifest is their check, and an update is the runner's patch.
`config/runner.yaml` launches only `work-item`, never `campaign-cycle` or the release slot; the real-agent check
waits for the approver as an optional step, and the manual entry guards it a second time
(`test/unit/docs/runner-config.test.ts`). The copied `scripts/checks/` run only when a step binds them
(`.wingfoil/workflows/bindings.yaml`, which this repository does not have yet). The runner signs as its own
`team.agents` identity, which cannot approve; gates stay the approver's, through `gate.mjs`. `npm run test:runner` runs the runner's own
tests, a stage of the full suites, but for two that assume one project's trunk (an agent named `claude` written,
`codex` reviewing): they are skipped by name until a runner version drops the assumption.

## Left out on purpose

- **The composer's `dna.yaml`** is not adopted: this repository's keeps its project description, stacks, paths,
  modules and team; the packs' role descriptions are not copied into it.

- **The composer's `AGENTS.region.md`**, a region meant for an `AGENTS.md`, is not written: this repository has never
  had one, and its agents read `.wingfoil/` and the directives, which say the same. Adding it is weighed when the
  pilot ends.
