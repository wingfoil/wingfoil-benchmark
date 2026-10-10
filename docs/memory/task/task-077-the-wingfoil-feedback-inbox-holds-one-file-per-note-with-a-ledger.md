---
id: task-077-the-wingfoil-feedback-inbox-holds-one-file-per-note-with-a-ledger
type: task
title: "The WingFoil feedback inbox holds one file per note, with a ledger"
status: approved
release: v0.2
wave: W14
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04]
---

## Context

Step S4a of M3 (see task-076's Context): the inbox becomes **one file per note**, in the format of WingFoil
**dl-163 R4**, applied strictly, with no local extension (approver ruling R9). It follows task-076, which versions
the old file unchanged, and precedes task-078, whose directive links its known behaviours to these notes.

The models are WingFoil-Templates' and WingFoil-UI's inboxes (`docs/wingfoil-feedback/README.md`, `F-0xx-*.md`) and
their inbox tests (`tests/wingfoil-feedback.test.ts`, `test/wingfoil-feedback.test.ts`).

**On `requirements`:** as task-076; REQ-NFR-04 (the repository's own checks are tests) is the nearest, since a test
holds the format.

**No real agent, no spending.** **Done** means: every note N1–N51 is either an `F-<nnn>` file or a positive
observation in the README's Context; the README's ledger lists every note; the old file is deleted; the inbox test
is green.

## Acceptance criteria

- **Red-first:** `test/unit/docs/wingfoil-feedback.test.ts` (vitest, after the two models) fails on the inbox as
  task-076 leaves it, then passes. It checks:
  - the inbox holds only `README.md` and `F-<nnn>-<slug>.md` files;
  - notes numbered from F-001 without gaps, each file named after its `id`;
  - exactly the six frontmatter fields, in order: `id`, `title`, `kind` (`defect | gap | request`), `status`
    (one of dl-163's six), `wingfoil_version` (a build such as `0.1.0-7a65580`, `0.2-pre-3df305e`, `0.2.2`) and
    `answered_by` (a list of strings);
  - the body's first line is `Formerly N<n>.` (or `Formerly N<n>, N<m>.` for a merged note);
  - the body has exactly two sections, `## Observed` and `## Expected`, and no Replies;
  - the README has `**Source key:**` and `**Last sync:**`, and its ledger lists every note, in order, with its
    title, kind, status and `answered_by` as the note says.
- **Characterization:** every N1–N51 is accounted for, by the mapping below, in a note's first line or in the README's
  positive observations (checked by the test: each `N<n>` from 1 to 51 appears exactly once).
- **Characterization:** `release-cycle`'s retrospective phase names the inbox, not the deleted file;
  `npx wingfoil workflow list` still loads the workflows.

## Design

### Note format (dl-163 R4, strict)

```markdown
---
id: F-<nnn>
title: "<what is wrong or missing, one line>"
kind: defect | gap | request
status: open
wingfoil_version: <the build the note was observed on>
answered_by: []
---

Formerly N<n>.

## Observed

<command, output, version — reproducible with WingFoil alone>

## Expected

<what should happen; a WingFoil counterpart, if one exists, as a sentence>
```

- **Generic.** Observed and Expected describe WingFoil alone: a scratch repository made by `git init` and
  `wingfoil init --template Kanban`, the command, its output and its exit code. They name nothing from this
  repository's configuration (no element ids, no benchmark terms, no workflow of ours). Where the original evidence
  was this repository's history, the reproduction replaces it.
- **Re-run.** Each note is re-run on the build it names, where possible: `0.2-pre-3df305e` is this repository's pinned
  tarball (`npx wingfoil`), and `0.2.2` is installed from npm into the scratchpad. A note that no longer reproduces
  says so in its body; it is not dropped. A note that needs an agent or a container (N42, N43) states the observation
  as made, with the build named.
- **WingFoil counterparts** are written as a sentence in Expected (for example "WingFoil bug-077 (closed) records
  this."). `answered_by` stays `[]`: only a sync fills it.
- `kind`: `defect` where WingFoil does something wrong against its own docs or contract; `gap` where a capability is
  missing; `request` where the note asks for a change of design.

### Mapping N1–N51

Positives have no kind in dl-163, so they are not notes: **N5, N24, N25, N26, N27, N34, N35, N39** go in the README's
Context, under "Positive observations". N34's flip side (the tarball has no lockfile) joins F-034; N35's remark on
the write guard joins F-012.

| Note | From | Kind | Title (draft) | Counterpart |
|---|---|---|---|---|
| F-001 | N1 | gap | `init`'s Kanban template scaffolds a life cycle with empty phases, no plan type and ingest workflows with no actions | |
| F-002 | N2 | defect | The scaffolded `dna.yaml` does not show that a technology needs a `category` | |
| F-003 | N3 | defect | The default `console` output format prints JSON | |
| F-004 | N4 | gap | No documented way to use an unpublished build pinned to a commit | |
| F-005 | N6 | defect | The package version is not bumped: a `0.1.0` build ships later verbs | dl-025 |
| F-006 | N7 | defect | `memory history` follows the template copy into unrelated commits | bug-077 |
| F-007 | N8 | gap | A hand-written `finalize` commit is not a recognized history operation | |
| F-008 | N9 | request | `submit` commit subjects carry no transition | |
| F-009 | N10 | gap | No verb closes a plan with an approval record | |
| F-010 | N11 | request | Slugs drop dots, and `id_pattern` has no `{version}` token | |
| F-011 | N12, N48, N49 | defect | "illegal transition" names a target the verb would never reach | |
| F-012 | N13 | defect | `submit` commits uncommitted edits under a state-only subject | bug-076 |
| F-013 | N14, N33 | gap | `dna set` writes scalars only, so lists (modules, paths, members) are hand edits | |
| F-014 | N15 | defect | Scaffolded templates say `submit` fills the placeholders; it does not | bug-146 |
| F-015 | N16 | gap | No verb amends an approved element | |
| F-016 | N17, N21 | gap | A required field cannot be empty or say "not applicable" | |
| F-017 | N18 | defect | A phase `include` is never resolved: a path where a name belongs passes in silence | bug-145 |
| F-018 | N19 | gap | A directive's global scope is declared in two places nothing reconciles | |
| F-019 | N20 | request | `kind` decides both startable and includable | |
| F-020 | N22 | gap | No verb parks a started task | |
| F-021 | N23 | gap | A transition records a git identity, not who performed it | |
| F-022 | N28 | defect | `workflow list` accepts actions on unknown types and roles nobody has | |
| F-023 | N29 | gap | Elements cannot be linked, and a bug's machine never closes | |
| F-024 | N30 | defect | `init --help` and the missing-template error do not list the templates | |
| F-025 | N31 | defect | The MCP server answers `tools/list` with "Method not found" | |
| F-026 | N32, N47 | defect | The identity check reads `git config`, while git takes the author from the environment | |
| F-027 | N36 | request | A gate's `--reason` is committed with no echo and cannot be corrected | |
| F-028 | N37 | gap | No verb validates an element before `submit` | |
| F-029 | N38 | gap | `memory add` takes no field values | |
| F-030 | N40 | gap | An approver's decision that moves no element has no record | |
| F-031 | N41 | gap | A gate commits on whatever branch is checked out | |
| F-032 | N42 | request | A role's context is not delivered when an agent's session starts | |
| F-033 | N43 | request | The agents' guide sets rules but no level of process, and no place for an automated approver | |
| F-034 | N44 (and N34's flip side) | defect | The packed tarball installs with no executable bin and no lockfile | |
| F-035 | N45 | gap | Records copied into a repository lose their approval provenance | |
| F-036 | N46 | defect | `init`'s commit subject carries an internal plan id | |
| F-037 | N50 | request | `approve --reason` accepts a placeholder as the recorded reason | |
| F-038 | N51 | request | `submit` takes no `--reason` | |

The titles are drafts; each is settled when its note is re-run. The counterparts listed are the ones the
"Meccanismo feedback wingfoil" session named; more are searched in WingFoil's Memory (`docs/04_memory/`) while the
notes are written (task-210, for instance, may answer F-027's echo).

### README

After the two models: what the inbox is; the short rules (one file per note, never deleted or renumbered, dl-163 R4's
fields, this repository writes `open` only, the rules of the `wingfoil-cli` directive); `**Source key:** to be set —
the svc-NNN WingFoil assigns (task-269)`; `**Last sync:** none`; the ledger `Note | Title | Kind | Status | Answered
by`; and a Context section with the old file's header (bootstrap context: 2026-09-22, WingFoil 0.1.0 at `7a65580`,
`init --template Kanban`), the mapping's first-line rule, and the **positive observations**.

### The old file and its readers

- `X_wingfoil-usage-notes.md` is deleted in the same commit that adds the last note, once the ledger and the Context
  hold everything it held. Its content stays at the commit task-076 made.
- `release-cycle.yaml`'s retrospective phase, which names "the WingFoil usage notes", names the inbox
  (`docs/wingfoil-feedback/`) instead, with no other change. The release template's comment says the same.
- Earlier elements that cite "usage notes N<n>" are not edited: the README's mapping resolves them.

## Execution notes

- `npx wingfoil memory submit task-077-…` (backlog → in-progress) on 2026-10-10, once task-076 went to in-review (the
  WIP limit). Declared: moves the task to its next state and commits it. Observed: `status: in-progress`. Matches.
- The branch merges `task/task-076-…` (the versioned inbox it splits). task-076 is in review; its own merge into
  `main` comes first, and this branch then merges `main`.
- **Red first:** `test/unit/docs/wingfoil-feedback.test.ts`, seven tests after the two models; on the inbox task-076
  left, four failed (stray file, numbering, ledger, N1–N51 accounted) and three passed vacuously on no notes. One
  change from the Design: "each N<n> appears exactly once" is read from the notes' first lines and from the README's
  `### Positive observations` bullets, which open with their N in bold (`- **N5 — …**`); the Context prose may name
  other Ns freely.
- **Reproduction**, 2026-10-10, by a script outside the repository (the agent's scratchpad), on two builds: this
  repository's pinned tarball (`node_modules/.bin/wingfoil`, `0.2-pre-3df305e`, prints `0.1.0`) and `wingfoil@0.2.2`
  installed from npm into the scratchpad. Each check ran in a fresh scratch repository (`git init`, `init --template
  Kanban`, a member with the `approver` role added to `dna.yaml` where a gate was needed), with exit codes captured.
  What each build did is in each note's body. Not reproducible by WingFoil alone, and so stated as observed: N10,
  N20, N23 (one git identity), N36, N40, N42 and N43 (an agent session), N45. No longer reproducing on `0.2.2`: N2
  (the scaffold now shows `category`), N7 (history), N13 for `approve` (the write guard), N14 for `team.members`
  (`dna add`), N30 (`init` lists its templates). They stay `open`: only a sync changes a status (dl-163).
- **WingFoil counterparts** found in WingFoil's Memory (`~/Workspaces/WingFoil2/docs/04_memory`, read 2026-10-10) and
  written as sentences in Expected: dl-025, dl-043, dl-054, dl-081, dl-107, dl-108, dl-110, bug-076, bug-077,
  bug-113, bug-144, bug-145, bug-146, bug-148, task-127, task-136, task-156, task-180, task-210. `answered_by` stays
  `[]` everywhere.
- **Merges and kinds** as the Design's mapping, with one change: F-034's first line is `Formerly N44.` only; N34 stays
  a positive observation and F-034's body says its lockfile half was first noted beside it (the test counts each N
  once).
- The old file is deleted in the commit that adds the notes (`cf75fb2`). Its SHA-256 at task-076's commit is
  `ed4b2365…`.
- **`release-cycle.yaml` version 4:** the retrospective phase mines the feedback inbox and says that WingFoil friction
  becomes inbox notes, which WingFoil pulls (dl-163), instead of "hand the WingFoil usage notes to the approver"; a
  header line records it. The release template's Retrospective comment says the same. `npx wingfoil workflow list`
  exit 0.
- Day checks, niced: `npm run lint` 0, `npx tsc --noEmit -p .` 0, the inbox test 7 of 7.
- **Review round 1 fixes** (see the Review notes):
  - counterparts added: bug-127 (F-011), bug-140 (F-024), bug-149 (F-026), bug-150 (F-022), bug-151 and task-174
    (F-025);
  - this repository's names removed from F-010 (a neutral `x-{slug}` type and title `v1.2`), F-019 and F-027;
  - the test and the README's rules accept `New note (task-<n>).` as a first line, as WingFoil-Templates' test does,
    so that notes written after the migration pass; the N1–N51 count reads only the migrated first lines;
  - F-018 gains its re-run line; F-026 says its two-identity case was not re-run; F-012 keeps N13's frontmatter
    edits; F-013 keeps N33's `dna show team.members` message; F-004's claim about the commit in `--version` is
    sourced to dl-163 (WingFoil's build from source) and the npm build's plain `0.2.2`.
  - Not re-run, besides the list above: N4 (documentation) and N29 (a missing relation), both stated as observed.

## Review notes

An independent read-only agent reviewed the branch against the Design, dl-163 R4 (strict) and the two models,
re-running reproductions on both builds itself. No suite ran; the reviewer ran the inbox test, niced.

- **Round 1** (b729f71, re-checked on 79130b3 after main was merged in): no blocker.
  - **Should-fix:**
    1. five WingFoil counterparts missed (bug-127, bug-140, bug-149, bug-150, bug-151 with task-174);
    2. this repository's names in F-010, F-019 and F-027;
    3. the test refused any note written after the migration (Templates' model accepts `New note (task-<n>).`).
  - **Nits:** F-018's re-run line, F-026's un-re-run case, F-012's frontmatter edits, F-013's `dna show` message,
    F-004's unsourced claim, the README pointing at the directive task-078 creates (left: intended).
  - Verified clean: N1–N51 all accounted for, every F-note faithful to its N, the reproductions (N7, N12/48/49, N13,
    N30, N38, N41, N46, N51, N2, F-001, F-034), the 19 cited counterparts, the format, the release-cycle change.
  - All fixed in 25a6ed4.
- **Round 2** (25a6ed4): **clean.** Each fix verified; the new first-line pattern accepts `New note (task-078).` and
  `Formerly N3, N4.` and still refuses `Formerly X.`, `New note.`, `New note (bug-012).`; the N1–N51 count stays exact.
  Nits fixed in the next commit: the README said a new note may name "the task or element" while the test accepts a
  task only (the README now says task); F-026's continuation line indented; these Review notes written.
- **Suites:** the diff touches `docs/`, `.wingfoil/` and one unit test file. Lint, typecheck and the inbox test are
  green; the full suites gate approval (kanban-delivery 5), on demand, unless the approver lets the day checks stand
  in, as for task-076.
- `npx wingfoil memory submit task-077-…` (in-progress → in-review). Declared: moves the task to its next state and
  commits it. Observed: see the next commit, `wf(task): submit …`.
