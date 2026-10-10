---
id: task-078-the-wingfoil-cli-directive-bound-globally-with-its-known-behaviours
type: task
title: "The wingfoil-cli directive, bound globally, with its known behaviours"
status: backlog
release: v0.2
wave: W14
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04]
---

## Context

Step S4b of M3 (see task-076's Context): a custom directive **`wingfoil-cli`**, bound **globally**, that says how
this repository runs the WingFoil CLI, how its notes are written and synced (WingFoil dl-163), and which surprises of
the pinned build it works around today. It follows task-077, whose notes its known behaviours cite.

The models are WingFoil-Templates' and WingFoil-UI's `.wingfoil/directives/custom/wingfoil-cli.md`. Their rules 1–7
are word for word the same in every consumer; each repository's own rules start at 8.

**On `requirements`:** as task-077 (REQ-NFR-04: the test holds the directive's links).

**Known open point.** Rule 7 names `wingfoil-sync`, whose procedure is not defined yet; WingFoil is expected to
document it in its `COLLABORATION.md` in v0.3. The rule is kept as Templates has it, and no sync is due before
WingFoil's v0.3 retrospective.

**No real agent, no spending.** **Done** means: the directive exists, created by the CLI, bound in `roles.yaml`
`global:`; every role's `directives list` reports `warnings: []`; the inbox test checks the directive.

## Acceptance criteria

- **Red-first:** `test/unit/docs/wingfoil-feedback.test.ts` gains three checks, failing before the directive exists:
  - rules 1–7 are word for word the models' (the text is held in the test as a constant, copied from
    WingFoil-Templates `53090c2`);
  - every row of `## Known behaviours` has five cells (`# | Behaviour | How to work with it | Note | WingFoil
    element`), and every note it names exists in the inbox;
  - `roles.yaml` lists `wingfoil-cli` under `global:`.
- **Characterization:** `npx wingfoil directives list --role <r> --format json` gives `warnings: []` and lists
  `wingfoil-cli` for every role of `roles.yaml` (developer, reviewer, qa, architect, product-owner, tech-lead,
  facilitator, scenario-author). Recorded in the Execution notes.

## Design

- **Created by the CLI:** `npx wingfoil directive create --name wingfoil-cli`, then its body written by hand
  (no verb writes a body). Frontmatter as the models': `id`, `name`, `type: directive`, `kind: custom`, `title:
  "Using the pinned WingFoil CLI"`, `tags`.
- **Header:** `**Version:** 1.0 · **Date:** <delivery date> · **Checked against:** wingfoil@0.2-pre-3df305e`.
  Global; applies to every role, human or agent, that runs the WingFoil CLI in this repository.
- **Rules 1–7:** copied word for word from WingFoil-Templates.
- **Rules from 8, this repository's own:**
  - 8. The pinned build is an unpublished tarball, `vendor/wingfoil-0.2-pre-3df305e.tgz`, installed as a `file:`
    devDependency; its `--version` prints `0.1.0` (F-005), so the build is named by the tarball. The pin moves only
    through a task that replaces the tarball and `package.json`'s entry, and re-checks this directive (rule 5).
  - 9. The arms' WingFoil builds (the wingfoil arm's, inside the run container) are measured, not used to govern
    this repository. Friction they show is still a note, with that build as `wingfoil_version`; a note never carries
    a run's results, which stay in the benchmark's own records.
- **Known behaviours** (0.2-pre-3df305e), seeded from the workarounds this repository uses today. Each row names its
  note (task-077) and, where WingFoil has one, its element. The seed, settled while writing:
  - `submit` commits uncommitted body edits: commit the body first, with its own message (F-012; bug-076);
  - `memory add` takes no field values: fill the frontmatter in a `docs(…)` commit before `submit` (F-029);
  - `approve`/`reject` require `--reason`, `submit` refuses one (F-038); a hand-over carries a drafted reason, never
    a placeholder (F-037);
  - `memory history` prepends template commits with `operation: null` and a `fatal:` on stderr, exit 0: read
    `git log -- <path>` for an element's trail (F-006; bug-077);
  - "illegal transition" names a misleading target: read the type's machine in `memory.yaml` (F-011);
  - a required list cannot be empty: such fields are left out of the type's `required` (F-016);
  - no verb amends an approved element: a hand edit whose commit body carries `Approver:` and `Reason:` (F-015);
  - no verb parks a task: freeing a WIP slot is a question for the approver (F-020);
  - a gate commits on the branch checked out: every approval command starts with the `cd` to its checkout (F-031);
  - `dna set` writes scalars only: list edits by hand, then `dna show` (F-013);
  - `workflow list` does not resolve phase includes nor check actions, roles and `produces`: the repository's tests
    and the reviewer check them (F-017, bug-145; F-022);
  - `--version` prints `0.1.0` (F-005);
  - no `memory validate`: `submit` is the first check (F-028);
  - `submit` subjects carry no transition: read the state from the frontmatter or `git log -p` (F-008).
- **`roles.yaml`:** `wingfoil-cli` appended to `global:`. Through `npx wingfoil directive assign` if it binds
  globally; otherwise a hand edit, recorded in the Execution notes.
- The `multi-session` directive keeps its own rules; where one overlaps a known behaviour (approval commands name
  their checkout), the row cites the note and the rule stays where it is.

## Execution notes

## Review notes
