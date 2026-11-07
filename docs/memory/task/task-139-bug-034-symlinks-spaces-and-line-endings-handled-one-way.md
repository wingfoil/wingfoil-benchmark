---
id: task-139-bug-034-symlinks-spaces-and-line-endings-handled-one-way
type: task
title: "bug-034: symlinks, spaces and line endings handled one way"
status: done
release: v0.3
wave: W18
features: [F3.1, F4.2, F7.1]
acceptance:
  - "scenarios.feature#A scenario version holds no symbolic link and no directive file with an open fence"
  - "competitors.feature#An arm holds no symbolic link, and every generator reads a directive file one way"
  - "scoring.feature#The scoring reads a patch's paths exactly and follows no symbolic link"
requirements: [REQ-FMT-04, REQ-FMT-05, REQ-FMT-14, REQ-SCO-04, REQ-SCO-07]
fixes: [bug-034-symlinks-spaces-and-line-endings-in-scenario-and-arm-files-are-handled-inconsistently]
tags: ["v0.3","w18","bug-034"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W18, delivery order item 4: bug-034 first, before the configured
variants add arm and scenario files written by an agent
([task-138](task-138-w18-s-requirements-and-acceptance-configured-variants-f7.5.md), requirements 1.50).
[bug-034](../bug/bug-034-symlinks-spaces-and-line-endings-in-scenario-and-arm-files-are-handled-inconsistently.md)
lists four items, collected from v0.1's and v0.2's task notes (task-001, task-042, task-064, task-072).

State read on 2026-11-06 (main `098bd427`): no symbolic link under `arms/` or `scenarios/`, in the working tree or in
any commit of the history, and no CRLF file in an arm or a scenario's arm configuration. Refusing links therefore
changes no pinned arm and no scenario hash. The approver's choices in chat (2026-11-07): an unclosed fence in a
directive file is refused, not closed; if a published run's scores would change through item 3, an erratum, the
published values unchanged.

Code and tests only: no real-agent session, nothing spent.

## Acceptance criteria

<!-- Each red first: a failing test before the code; `acceptance` lists the scenarios as they are written. -->

1. **A scenario version holds no symbolic link** (item 1, task-001): loading a scenario version refuses a symbolic
   link anywhere under its directory, `scenario.yaml` included, naming it; today a `scenario.yaml` link leading
   outside the scenario is followed. REQ-FMT-04 amended (1.51). Red first (`scenarios.feature`).
2. **An arm holds no symbolic link** (item 3, task-064): the arm loader refuses a link anywhere under `arms/<arm>/`,
   declared or not, naming it; today only the declared paths are checked. The digest keeps hashing a link by its
   target (REQ-FMT-13), since an arm read from history must still digest as it ran; task-064's Design statement is
   aligned with the code. REQ-FMT-05 amended (1.51). Red first (`competitors.feature`).
3. **The scoring's path helpers** (item 2, task-041 and task-042): `filesUnder` does not follow symbolic links (a
   link in a snapshot is not measured as the file it points to); the paths of a patch are read whatever they hold
   (spaces, quoted paths), from git's `-z` output or an equivalent; a list of files reaches a tool as separate
   arguments. REQ-SCO-04 and REQ-SCO-07 made precise (1.51). Red first (`scoring.feature`). **Before the change**, a
   script reads every published run's stored patch and snapshot paths and prints how many hold a space, a quoted
   path or a link (figures from the script); if any does, the work stops and the approver is told before any value
   changes, and the result goes into an erratum (the approver's choice).
4. **Directive files' heading shift** (item 4, task-072): CRLF is read as LF before the shift; a rule title's
   trailing spaces are always stripped; an unclosed code fence in a directive file is refused by
   `bench scenario validate`, naming the file, and so by every reader of it (the docs-control and rules generators,
   REQ-FMT-14). REQ-FMT-14 amended (1.51). Red first (`scenarios.feature` or `competitors.feature`).
5. `requirements.md` 1.51 records the amendments; checks green (prettier, tsc, eslint, `scripts/pre-review.sh main`);
   an independent review (dl-020); the full suites on the approver's go.

## Design

- `src/core/markdown.ts` (new): `toLf`, `fencedLines` and `hasUnclosedFence`, the one reading of a directive file's
  line endings and fences (CommonMark's: three or more backticks or tildes after up to three spaces, closed by the
  same character at least as long), shared by the scenario loader and the generators.
- `src/scenario/load.ts`: `linksUnder` refuses every symbolic link under the version first, before `scenario.yaml` is
  read; `fenceIssues` refuses a Markdown file of a scenario's `arms/<arm>/` with an open fence.
- `src/arms/load.ts`: `linksIn` refuses every link under the arm once the declared paths exist; `src/arms/digest.ts`
  keeps hashing a link by its target (history), its comment aligned.
- `src/arms/baseline-docs.ts`: `documents` reads every directive file as LF and refuses an open fence, naming the
  path; `shiftHeadings` reads fences with `fencedLines` and strips every line's trailing spaces, a heading's too. Spec
  Kit's constitution and OpenSpec's context read through it (`developerDirectives`).
- `src/scoring/quality.ts`: `filesUnder` lists files only, neither listing nor following a link; `patchPaths` reads
  both sides of a header (C-quoted with octal escapes, or unquoted with spaces when both sides name the same path),
  `rename`/`copy` and `---`/`+++` lines. `filesUnder` and `patchPaths` exported for their tests.

## Execution notes

- **Red first** for every criterion in the unit tests (`test/unit/scenario/load.test.ts`,
  `test/unit/arms/baseline-docs.test.ts`, `test/unit/arms/load.test.ts`, `test/unit/scoring/quality.test.ts`), each
  red commit before its fix. The three acceptance scenarios (one per feature file) and their tests were written after
  the fixes, so they passed at once: characterization of the fixed behaviour, recorded as a departure.
- **Five older scenario-loader tests** expected another message for a link (an overlap, "leads outside"): a link is
  now refused as a link, first, so their expectations read that.
- **The published runs, criterion 3** (scripts in the scratchpad, output quoted):
  - `node bug034-published.mjs results` (main checkout):
    `{"patches":2536,"runs":476,"headers":13617,"quoted":0,"unparsed_unquoted":0,"symlink_modes":0,"patches_hit":0}`;
  - `node bug034-compare.mjs <worktree>/dist results`, the new `patchPaths` against the old on every stored patch:
    `{"patches":2536,"differ":0}`.

  No published value changes, so no erratum (the approver's choice applied to an empty set).
- **"A list of files reaches a tool as separate arguments":** already so (`quality.mjs` spreads the measured files
  into jscpd's and c8's arguments); task-042's "the file list is one argument" is the JSON spec passed to the script
  as one argument, left as it is: changing it changes the scoring image, and so every rescore's image pin, for no
  published case. Stated in REQ-SCO-04 as amended in 1.51.
- **task-064's Design** is not edited (a done element): the code and REQ-FMT-05 as amended in 1.51 now agree, the
  loader refusing a link anywhere and the digest hashing it by its target; `digest.ts`'s comment says so.
- No directive, manual or arm file of the repository has a heading with trailing spaces, a fence, a link or CRLF, so
  no generated output and no digest changes.
- **Every Markdown file of a scenario's `arms/<arm>/` is checked for an open fence**, not only the files a generator
  reads: deliberate, as REQ-FMT-04 as amended in 1.51 states, so that an agent-written configuration (F7.5) is
  checked whole.
- `requirements.md` 1.51.
- **Full suites** (2026-11-07, on the approver's go, after the load watcher): `scripts/full-suites.sh` on `be255c12`,
  10:04–10:15, LINT 0 TEST 0 BUILD 0 BIN 0 DOCKER 0.

## Review

Independent reviews (dl-020), each a fresh read-only agent on a clone under `/tmp/claude-1000/`; main's HEAD and
reflog checked unchanged after each.

**Round 1** (`71f13618`): 0 blockers, 1 should-fix, 4 nits; all taken.

| # | Finding | Outcome |
|---|---|---|
| 1 | should-fix: `---`/`+++` matched inside hunks, so a removed line `-- a/sql` read as a path | read only in a file's extended header; a red test first; published patches still 0 differences |
| 2 | the fence reading ignores container blocks (list items, tabs, blockquotes) | stated in `markdown.ts` and REQ-FMT-14 as amended in 1.51 |
| 3 | every `.md` of a scenario's arms is checked, not only the generators' | kept, deliberate, stated in the Execution notes |
| 4 | the arms-link and "leads outside" branches are now unreachable | marked defensive |
| 5 | a version path that is a file throws; a linked version directory is followed | a linked version refused; a non-directory left to `scenario.yaml`'s read |

**Round 2** (`7415e4fe`): 0 blockers, 0 should-fix, 2 nits, taken: a dangling version link refused as a link; a linked
scenarios root or id directory allowed, stated in `load.ts`. Round 1's findings resolved. No further round: nits only.
