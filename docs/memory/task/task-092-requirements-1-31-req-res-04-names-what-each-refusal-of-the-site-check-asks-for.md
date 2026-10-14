---
id: task-092-requirements-1-31-req-res-04-names-what-each-refusal-of-the-site-check-asks-for
type: task
title: "Requirements 1.31, REQ-RES-04 names what each refusal of the site check asks for"
status: in-progress
release: v0.2
wave: calibration
features: [F5.6]
requirements: [REQ-RES-04]
fixes: [bug-021-req-res-04-says-every-refused-entry-names-a-bench-site-build-but-a-link-or-a-stray-entry-does-not]
---

## Context

Fixes [bug-021](../bug/bug-021-req-res-04-says-every-refused-entry-names-a-bench-site-build-but-a-link-or-a-stray-entry-does-not.md),
task-089's review nit 2. The approver decided in chat on 2026-10-14 that the code is right and REQ-RES-04's text is
to be amended in 1.31. It is filed before calibration (plan-004 step 3), as task-090 and task-091 were, hence
**wave: calibration**.

**No real agent, no spending, no code.** **Done** means: requirements 1.31 merged on main, REQ-RES-04 naming what
each refusal of `bench site publish`'s check asks for, as `checkSiteCopy` does.

## Acceptance criteria

All **characterization**: the behaviour and its tests exist since task-047 and task-085; this task changes text only.

- REQ-RES-04 gains "**Amended in 1.31 (v0.2):**" saying that, of the 1.22 refusals:
  1. a file that differs from a fresh build names the `bench site build <campaign-id>/<n>` to run
     (`test/unit/site/publish.test.ts:108`, `:331`);
  2. a link is named as a link, a published site holding files only, and no build is named (`:146`, `:151`);
  3. an entry no build gives (`.git`, `.gitignore`, a stray page) is named with "remove it, or rebuild `site/`", and
     no single execution's build is named, since it belongs to none (`:138`).

  The `publish` tests stay green: each point is one of their cases.
- The 1.22, 1.26 and 1.30 text stays as it was: an amendment adds, as 1.26 to 1.30 did.
- The header becomes **Version:** 1.31, with the date; an "Amendment 1.31" section follows 1.30's, with its source.
  The traceability matrix is unaffected: REQ-RES-04 already traces to F5.6.

## Design

- `docs/02_specification/requirements.md`: the paragraph at the end of REQ-RES-04's row, the header, and
  `### Amendment 1.31 (delivery, calibration task-092, <date>)`.
- Before writing, the three messages are read again in `src/site/publish.ts` (`checkSiteCopy`) and their tests, and
  each is named in the Execution notes with the test that shows it.
- Branch and worktree as every task; day checks, niced: the `publish`, `traceability` and `method-statements` tests,
  `npm run lint`. `*.md` is in `.prettierignore`, so no prettier check is claimed for the document. An independent
  read-only review checks the text against the code. The full suites only if the approver asks: the diff is one
  document.
- After the merge: bug-021's `fixed_by` and Resolution, then `submit` approved → fixed. Push only on the approver's go.

## Execution notes

- `npx wingfoil memory add --type bug` and `--type task` on 2026-10-14. Declared: create a draft with the type's
  scaffold and commit it. Observed: `bug-021-…` (`33bb905`) and `task-092-…` (`87ab0aa`) as drafts, required fields
  empty (W-02); filled in `docs(…)` commits before `submit` (W-01).
- `npx wingfoil memory submit` for both (draft → pending). Declared: moves the element to its next state and commits
  it. Observed: `status: pending` (`310abee`, `f63dfea`), one line changed each. Matches. The approver approved
  bug-021 (`9260ecd`) and task-092 (`0ac2769`).
- `npx wingfoil memory submit task-092-…` (backlog → in-progress) on main. Declared: moves the task to its next state
  and commits it. Observed: `status: in-progress` (`c32747b`). Matches.
- Worktree `../WingFoil2-Benchmark-wt/task-092`, branch `task/task-092`, its own `npm ci` (exit 0).
- The three messages read again before writing (`src/site/publish.ts`, `checkSiteCopy`), with their tests in
  `test/unit/site/publish.test.ts`:
  1. a difference: `differs from a fresh build of the results: run bench site build <id>/<n>`; lines 108 and 331;
  2. a link: `is a link: a published site holds files only`; lines 146 and 151;
  3. an entry no build gives: `is not part of a fresh build of any execution: remove it, or rebuild site/`; line 138.

  All three messages came with task-047 (requirements 1.22): the difference with `aaf2943`, the link and the stray
  entry with `91cd2e2`, its review fix. Their tests came with task-047 (`63af8fa` for line 108, `88867fa` for 138
  and 151, `d6db6b7` for 146) and task-085 (`011b5e2` for line 331, the stale root index).
- Amendment (`ad6f1b9`): REQ-RES-04's row gains "Amended in 1.31"; the header is 1.31 (the date was already
  2026-10-14); "Amendment 1.31" follows 1.30's. 1.22's, 1.26's and 1.30's text unchanged (14 insertions, 2
  deletions: the header's line and the row).
- Day checks, niced: `publish`, `traceability` and `method-statements` tests 46 of 46; `npm run lint` 0;
  `npx tsc --noEmit -p .` 0. `*.md` is in `.prettierignore`: no prettier check is claimed for the document.
- Review fix (`43e0e75`): "Amended in 1.31" scoped to the three refusals 1.22 names; the amendment section says "Of those
  three", and no longer says the tests came with task-047.

## Review notes

An independent read-only agent reviewed `git diff main...HEAD` against the Design, bug-021, `src/site/publish.ts`
and `test/unit/site/publish.test.ts`, one round at a time.

- **Round 1** (`f353c86`): **not clean**, one blocking finding and two nits.
  - **Blocking, fixed** (`43e0e75`): "of the check's refusals, only a difference names a `bench site build`" was too
    broad: `checkSiteCopy`'s "not built: run bench site build <campaign-id>/<n> first" (a copy without `index.html`,
    `style.css` or an execution, `publish.ts:91`) and 1.30's refusal to drop a published execution
    (`publish.ts:236`) name one too. The paragraph now speaks of the three refusals 1.22 names.
  - **Nit 1, left for the approver:** the tests assert the case, not the whole remedy: `publish.test.ts:138` checks
    "is not part of a fresh build", not "remove it, or rebuild site/"; `:146` and `:151` check "is a link", not "a
    published site holds files only". The wording 1.31 states rests on `publish.ts:142` and `:96`. Asserting the
    whole messages is a test change, outside this text-only task's approved design.
  - **Nit 2, fixed** (this commit): the Execution notes gave `91cd2e2` as the source of all three messages; the
    difference's came with `aaf2943`, and the test at line 331 with task-085 (`011b5e2`).
