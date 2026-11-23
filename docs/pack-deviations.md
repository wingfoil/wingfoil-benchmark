# Deviations from the published packs

This repository's governance is composed from three packs of wingfoil-templates: `base` 2.0.1, `software` 1.0.0 and
`methodology/kanban` 1.0.0, run on WingFoil 0.3.2 (task-127, the approver's choices 1–7 in chat, 2026-11-23). This
file lists every place where `.wingfoil/` differs from the reference composer's output, and why. A file under
`.wingfoil/workflows/built-in/` and `.wingfoil/directives/built-in/` is the composer's output, byte for byte; every
difference lives in a `custom/` file or in `memory.yaml`, `roles.yaml` and the templates.

**The composition.** The reference composer of wingfoil-templates, at `main` (whose three packs are byte-identical to
their tags), with `base`'s required parameters and the paths and ids this repository already used, so that no element
moved. The command and the digest of its output are in task-127's Execution notes. To check the built-in files against
a new composition, run the same command and compare.

**Test.** `test/unit/docs/workflows-config.test.ts` holds the composition together: every included file exists, no
two included workflows share a name, every `include` names a loaded sub-workflow, every fallback names a step of its
own workflow, and no workflow names a state its element's machine lacks.

## D1 — the Memory machines of `bug`, `decision-log` and `adr` stay this repository's

| Type | The packs | Here |
|---|---|---|
| `bug` | `software`'s: draft, open, triaged, planned, in-progress, in-review, resolved, closed | draft, pending, approved, fixed (bug-005) |
| `decision-log` | `base`'s: draft, in-discussion, ready | the default machine: draft, pending, approved |
| `adr` | `software`'s: draft, pending, accepted, superseded | the default machine: draft, pending, approved |
| `task` | `kanban`'s, with `returns` and the two WIP limits | the same, set to this repository's WIP of 1 and 1 |
| `campaign` | — | this repository's type, unchanged |

**Why.** No element changes state, the traceability test and `fixes`/`fixed_by` stay as they are, and the pilot's
rollback stays a revert. The migration is weighed when the pilot ends.

**Consequence.** The composed `bug-ingest` still describes a triage that "moves it to triaged": here its approve moves
the bug pending → approved, which is the same ruling under this repository's name. `end-of-life`'s approve selects
`pending` decision-logs, where the pack selects `in-discussion` (D4).

## D2 — the release keeps its two gates

The release machine stays draft, planning (gate), in-development, releasing (gate), released, where the pack's has
the same states and no gate: both gates are the approver's. The composed type requires a `release-line` field, so the
type requires it here too, and the release-line type takes `base`'s machine (draft, planning, active, done);
`rel-v0.4` names the first release line, `rl-1`.

`delivery` is a custom copy. Its `plan-release` step takes `memory.add`, `memory.submit` (draft → planning) and
`memory.approve` (planning → in-development, the approver's), where the pack has two submits, which a gated planning
refuses (WingFoil reports `W_PHASE_EXIT_STATE_UNDETERMINED`).

## D3 — `work-item` carries the benchmark's delivery rules

`work-item` is a custom copy with the pack's five steps, so that the external workflow runner and WingFoil's engine
find their keys: `start`, `build`, `review`, `approve`, `done`. Each step carries the rules of the retired
`kanban-delivery` (version 6): the Design and the classification of the criteria in `start`; test-first in `build`;
in `review`, `scripts/pre-review.sh main`, an independent read-only review with severities and a re-review (dl-020),
and the full suites before in-review; in `approve`, the approver's gate, with `build` as its fallback; in `done`, the
`--no-ff` merge, the fixed bugs moved to `fixed` and the wave's "Ends with" recorded. The real-agent check is a manual,
optional step with the approver's approval (dl-006). A task's pending → backlog gate stays outside the flow, as in the
pack.

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
| `release` | `software`'s submit and publishing | `custom/release.yaml`: calibration, validation and the campaign before the submit and publishing |
| `end-of-life` | `software`'s | `custom/end-of-life.yaml`, its decision-log state `pending` (D1) |

`release-cycle` retires. Its phases map to `delivery`'s `plan-release` and `release-flow`'s `work`, `release` and
`retrospective`; plan-006 names `sw-life-cycle`, phase `delivery`. `campaign-cycle` and `scenario-authoring` stay
this repository's main workflows: a release's campaign launches `campaign-cycle` rather than including it (dl-022).

## D5 — `retrospective` and `governance-evolution` have no `produces`

Both are custom copies with every `produces` removed. WingFoil 0.3 reads a completed step's evidence from the whole
repository (WingFoil bug-488, F-043): with `produces`, a new instance would find the evidence of an earlier release
and close its steps at once. `retrospective`'s approve selects `pending` decision-logs tagged `retrospective` (D1).
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
`sw-life-cycle`'s `release-cycle` and `sunset` phases with `delivery` and `end-of-life`: nothing the custom versions
held is lost. `kanban-delivery`, `release-cycle`, `benchmark-inception` and `benchmark-specification` are removed or
renamed by D3 and D4.

## Left out on purpose

- **The composer's `AGENTS.region.md`**, a region meant for an `AGENTS.md`, is not written: this repository has never
  had one, and its agents read `.wingfoil/` and the directives, which say the same. Adding it is weighed when the
  pilot ends.
- **The external workflow runner** is not adopted here: task-177 adopts it, when a runner version names no private
  project in its common files.
