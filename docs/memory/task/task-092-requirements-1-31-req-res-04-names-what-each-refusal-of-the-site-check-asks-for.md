---
id: task-092-requirements-1-31-req-res-04-names-what-each-refusal-of-the-site-check-asks-for
type: task
title: "Requirements 1.31, REQ-RES-04 names what each refusal of the site check asks for"
status: draft
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
