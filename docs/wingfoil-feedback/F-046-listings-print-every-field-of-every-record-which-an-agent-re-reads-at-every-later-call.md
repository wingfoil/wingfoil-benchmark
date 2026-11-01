---
id: F-046
title: "Listings print every field of every record, which an agent re-reads at every later call"
kind: request
status: open
wingfoil_version: 0.3.1
answered_by: []
---

New note (task-122).

## Observed

On WingFoil 0.3.1 (`870bd440`), in a project made with `init --template Kanban`, `wingfoil directives list` prints
its ten directives as a JSON document of 204 lines (4 548 characters), each with its whole frontmatter;
`wingfoil memory search` prints a JSON object with six lines a match (path, id, title, type, status, tags). F-003
notes the format; this note is about the volume an agent pays for it. A coding agent keeps every command's output in
its context, and every later model call of the session re-reads it. Measured on 144 runs of two agents following
the Kanban workflow (Claude Code 2.1.300 and Codex 0.162.1, two models each, a short coding request a step), from
their transcripts: `directives list` ran up to 6 times a run on average with outputs of 4–8 thousand characters,
and `memory search` up to 10 times with outputs of 2–6.5 thousand; the re-reading of these two outputs was 3–12 % of the
extra tokens the WingFoil sessions processed over sessions given the same rules as plain documents.

## Expected

A compact default for listings meant to be read by an agent: one line a record (for directives: id, title and the
roles they apply to; for a search: id, status and title), the full record on `show` or with an option. Every line
saved is saved once for every later call of the session; on a local model without a prefix cache, at full price.
