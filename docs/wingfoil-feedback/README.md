# WingFoil feedback inbox

Notes about WingFoil — defects, gaps and requests — found while working in this repository. WingFoil
reads this inbox at its retrospective and answers in its own repository (WingFoil dl-163); this
repository pulls the answer at its own sync.

## Rules

- One file per note, `F-<nnn>-<slug>.md`, never deleted and never renumbered; the format is WingFoil
  dl-163 R4: the frontmatter fields `id`, `title`, `kind` (`defect | gap | request`), `status`
  (`open | needs-info | captured | resolved | declined | duplicate`), `wingfoil_version` and
  `answered_by`, and a body stating what was observed and what was expected, reproducible with
  WingFoil alone (command, output, version).
- A note's first body line is `Formerly N<n>.` for a note migrated from the old inbox, or
  `New note (task-<n>).` for a note written since, naming the task or element that wrote it.
- This repository writes `open`; `answered_by` and every other status are set only by the sync, from
  what WingFoil published.
- How notes are written, when the sync runs and what WingFoil cites are the rules of the
  `wingfoil-cli` directive (`.wingfoil/directives/custom/wingfoil-cli.md`).
- If WingFoil's `COLLABORATION.md` refines the format, the next sync follows it.

**Source key:** to be set — the `svc-NNN` id WingFoil assigns when it registers this repository as a
feedback source (WingFoil task-269). WingFoil cites a note as `<source key>/F-<nnn>@<sha>`.

**Last sync:** none.

## Ledger

| Note | Title | Kind | Status | Answered by |
|---|---|---|---|---|
| [F-001](F-001-init-kanban-scaffolds-a-life-cycle-that-cannot-run.md) | init's Kanban template scaffolds a life cycle with empty phases, no plan type and ingest workflows with no actions | gap | open | |
| [F-002](F-002-dna-scaffold-does-not-show-that-a-technology-needs-a-category.md) | The scaffolded dna.yaml does not show that a technology needs a category | defect | open | |
| [F-003](F-003-default-console-format-prints-json.md) | The default console output format prints JSON | defect | open | |
| [F-004](F-004-no-documented-way-to-use-an-unpublished-build.md) | No documented way to use an unpublished build pinned to a commit | gap | open | |
| [F-005](F-005-package-version-not-bumped-on-later-verbs.md) | The package version is not bumped: a 0.1.0 build ships later verbs | defect | open | |
| [F-006](F-006-memory-history-follows-the-template-copy.md) | memory history follows the template copy into unrelated commits | defect | open | |
| [F-007](F-007-hand-written-finalize-commit-is-not-a-history-operation.md) | A hand-written finalize commit is not a recognized history operation | gap | open | |
| [F-008](F-008-submit-commit-subjects-carry-no-transition.md) | submit commit subjects carry no transition | request | open | |
| [F-009](F-009-no-verb-closes-a-plan-with-an-approval-record.md) | No verb closes a plan with an approval record | gap | open | |
| [F-010](F-010-slugs-drop-dots-and-id-pattern-has-no-version-token.md) | Slugs drop dots, and id_pattern has no {version} token | request | open | |
| [F-011](F-011-illegal-transition-names-a-target-the-verb-never-reaches.md) | "illegal transition" names a target the verb would never reach | defect | open | |
| [F-012](F-012-submit-commits-uncommitted-edits-under-a-state-only-subject.md) | submit commits uncommitted edits under a state-only subject | defect | open | |
| [F-013](F-013-dna-set-writes-scalars-only.md) | dna set writes scalars only, so lists (modules, paths, members) are hand edits | gap | open | |
| [F-014](F-014-templates-say-submit-fills-the-placeholders.md) | Scaffolded templates say submit fills the placeholders; it does not | defect | open | |
| [F-015](F-015-no-verb-amends-an-approved-element.md) | No verb amends an approved element | gap | open | |
| [F-016](F-016-a-required-field-cannot-be-empty-or-not-applicable.md) | A required field cannot be empty or say "not applicable" | gap | open | |
| [F-017](F-017-phase-include-is-never-resolved.md) | A phase include is never resolved: a path where a name belongs passes in silence | defect | open | |
| [F-018](F-018-directive-global-scope-declared-in-two-places.md) | A directive's global scope is declared in two places nothing reconciles | gap | open | |
| [F-019](F-019-kind-decides-both-startable-and-includable.md) | kind decides both startable and includable | request | open | |
| [F-020](F-020-no-verb-parks-a-started-task.md) | No verb parks a started task | gap | open | |
| [F-021](F-021-a-transition-records-a-git-identity-not-the-actor.md) | A transition records a git identity, not who performed it | gap | open | |
| [F-022](F-022-workflow-list-accepts-unknown-types-and-roles.md) | workflow list accepts actions on unknown types and roles nobody has | defect | open | |
| [F-023](F-023-elements-cannot-be-linked-and-a-bug-never-closes.md) | Elements cannot be linked, and a bug's machine never closes | gap | open | |
| [F-024](F-024-init-help-does-not-list-the-templates.md) | init --help and the missing-template error do not list the templates | defect | open | |
| [F-025](F-025-mcp-tools-list-answers-method-not-found.md) | The MCP server answers tools/list with "Method not found" | defect | open | |
| [F-026](F-026-identity-check-reads-git-config-not-the-environment.md) | The identity check reads git config, while git takes the author from the environment | defect | open | |
| [F-027](F-027-a-gate-reason-is-committed-with-no-echo.md) | A gate's --reason is committed with no echo and cannot be corrected | request | open | |
| [F-028](F-028-no-verb-validates-an-element-before-submit.md) | No verb validates an element before submit | gap | open | |
| [F-029](F-029-memory-add-takes-no-field-values.md) | memory add takes no field values | gap | open | |
| [F-030](F-030-an-approver-decision-without-a-transition-has-no-record.md) | An approver's decision that moves no element has no record | gap | open | |
| [F-031](F-031-a-gate-commits-on-whatever-branch-is-checked-out.md) | A gate commits on whatever branch is checked out | gap | open | |
| [F-032](F-032-role-context-not-delivered-at-session-start.md) | A role's context is not delivered when an agent's session starts | request | open | |
| [F-033](F-033-agents-guide-sets-no-level-of-process.md) | The agents' guide sets rules but no level of process, and no place for an automated approver | request | open | |
| [F-034](F-034-packed-tarball-installs-without-bin-or-lockfile.md) | The packed tarball installs with no executable bin and no lockfile | defect | open | |
| [F-035](F-035-copied-records-lose-their-approval-provenance.md) | Records copied into a repository lose their approval provenance | gap | open | |
| [F-036](F-036-init-commit-subject-carries-an-internal-plan-id.md) | init's commit subject carries an internal plan id | defect | open | |
| [F-037](F-037-approve-accepts-a-placeholder-reason.md) | approve --reason accepts a placeholder as the recorded reason | request | open | |
| [F-038](F-038-submit-takes-no-reason.md) | submit takes no --reason | request | open | |

## Context

These notes were first kept in one file, `X_wingfoil-usage-notes.md`, untracked until task-076
versioned it unchanged and split here in task-077. Its notes N1–N51 are F-001–F-038 and the positive
observations below: each note's first line names the N it comes from, and notes that said the same
thing were merged (N12, N48 and N49; N14 and N33; N17 and N21; N32 and N47; N44 with N34's flip
side). Earlier elements of this repository that cite "usage notes N<n>" resolve through those first
lines. The old file's content stays at the commit task-076 made.

**Origin.** This repository was bootstrapped on 2026-09-22 with WingFoil 0.1.0 built from WingFoil
commit `7a65580` (`init --template Kanban`): the first use of WingFoil on a project other than
WingFoil itself. It then pinned a build of `3df305e` (the same sources; its tarball is named
`0.2-pre-3df305e`), and runs `0.2.2` where it measures WingFoil. Each note's `wingfoil_version` is
the build it was first observed on. Every note was re-run on 2026-10-10 on `0.2-pre-3df305e` and on
`0.2.2` where WingFoil alone could reproduce it; its body says what each build did.

The old inbox was meant to be read at WingFoil's next `retrospective` (`additional-points` phase) or
`release-planning`, and each note deleted once it had an official counterpart. dl-163 replaces that:
notes are never deleted, and their status changes only at a sync.

### Positive observations

dl-163 gives positives no kind, so they are not notes. They are kept here, for WingFoil's docs and
retrospective.

- **N5 — `memory add` works on a foreign project.** A custom type declared only in the project's
  `memory.yaml`, with its own template, was created and committed by `memory add`
  (`wf(plan): add plan-001-…`); custom types, templates, roles and `team.agents` validated with no
  change to WingFoil.
- **N24 — a gate leaves an audit record usable both ways.** `memory history` returns operation,
  from, to, approver and reason as JSON, and `git log --oneline` reads as a process log thanks to the
  `[from → to]` in the tool's subjects. A hand-edited `status:` shows as `operation: null`, so the
  record tells a transition through the tool from one around it.
- **N25 — process state is plain files in git, and it survives history surgery.** A rewound `main`
  and a branch rebased with `--onto` kept every element's state with no reconciliation: an element
  moves with the branch that holds it.
- **N26 — per-type state machines expressed the project's own process**, and a declared WIP limit
  could not be fudged: two sessions with conflicting instructions both stopped and asked the
  approver, instead of acting on a stale picture.
- **N27 — `.wingfoil/` is declarative and readable from outside.** An external reader found a
  configuration defect the CLI did not report, because the configuration is plain YAML and Markdown.
- **N34 — the build is reproducible byte for byte.** `npm ci` and `npm pack` on a clean
  `git archive` of `3df305e` gave the same SHA-256 in a container and on the host, so a commit
  identifies its package. Worth stating as a property (a CI check). Its flip side, the missing
  lockfile, is in F-034.
- **N35 — `0.2.2` answers the team-member verb** (`dna add team.members`, F-013), and its write guard
  refuses `approve`, `reject` and `deprecate` on a dirty element while leaving `submit` alone; that
  asymmetry deserves a line in the CLI docs (F-012).
- **N39 — a custom machine's reject-back absorbed a failed execution.** A reject from `scored` back
  to `running` recorded why a run had to be repeated, and the same element went on to its final
  state with no hand edit: custom machines carried a real incident, not only the happy path.
