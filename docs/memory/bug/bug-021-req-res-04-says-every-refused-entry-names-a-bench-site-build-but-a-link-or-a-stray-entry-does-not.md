---
id: bug-021-req-res-04-says-every-refused-entry-names-a-bench-site-build-but-a-link-or-a-stray-entry-does-not
type: bug
title: "REQ-RES-04 says every refused entry names a bench site build, but a link or a stray entry does not"
status: pending
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
---

## Context

Found by task-089's independent review (round 1, nit 2), left in its Review notes for the approver. On 2026-10-14
the approver decided in chat that the code is right and the text is to be amended in requirements 1.31. Reading
both for this bug showed a second case, the link, with the same mismatch.

## Expected

REQ-RES-04 says what each refusal of `bench site publish`'s check names, as the code does:

- a file that differs from a fresh build is named with the `bench site build <campaign-id>/<n>` to run;
- a link is named as a link: a published site holds files only;
- an entry no build gives (`.git`, `.gitignore`, a stray page) is named with "remove it, or rebuild `site/`": it
  belongs to no execution, so no single execution's build removes it.

## Actual

REQ-RES-04's 1.22 text (`docs/02_specification/requirements.md`, 1.30) says: "A difference, a link, or any entry no
build gives (`.git`, `.gitignore`, a stray page) is refused, naming it and the `bench site build` to run". Only the
difference names a build. `src/site/publish.ts` `checkSiteCopy` says:

- `differs from a fresh build of the results: run bench site build <id>/<n>`;
- `is a link: a published site holds files only`;
- `is not part of a fresh build of any execution: remove it, or rebuild site/`.

The 1.26 and 1.30 amendments do not touch that sentence.

## Evidence

- `docs/02_specification/requirements.md` (1.30), REQ-RES-04's row, the first bullet of the 1.22 text.
- `src/site/publish.ts`, `checkSiteCopy`: the three messages above.
- `test/unit/site/publish.test.ts`: lines 108 and 331 (difference), 138 (stray entry), 146 and 151 (link).
- task-089's Review notes, round 1, nit 2.

## Suggested handling

A specification amendment, 1.31: REQ-RES-04 gains an "Amended in 1.31" paragraph naming what each of the three
refusals asks for, and the amendment section records it. No code changes.
