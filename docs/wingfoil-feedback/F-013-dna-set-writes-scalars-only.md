---
id: F-013
title: "dna set writes scalars only, so lists (modules, paths, members) are hand edits"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N14, N33.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`): `wingfoil dna set modules x` → `E_VALIDATION modules (…): Invalid input: expected array, received
string`, exit 1; `wingfoil dna set team.members x` → the same for `team.members`. There is no other DNA verb
(`dna --help` lists `set` and `show`). Adding a module, a path or a team member — the member being what approval
authority rests on — is a hand edit of `dna.yaml` with a hand-written commit and no write-time validation.

Re-run on 2026-10-10 on `0.2.2`: `wingfoil dna add <path> --value … --entry-…` adds an entry to a collection or a list and
commits it (`wf(dna): add team.members …`). On that build the note is answered for `team.members`; the other lists
were not re-checked.

## Expected

Every DNA collection and list can be changed through a verb that validates and commits. WingFoil dl-081
(ready) covers the DNA mutation surface.
