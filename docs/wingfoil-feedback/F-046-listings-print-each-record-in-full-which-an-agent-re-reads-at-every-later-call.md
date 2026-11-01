---
id: F-046
title: "Listings print each record in full, which an agent re-reads at every later call"
kind: request
status: open
wingfoil_version: 0.3.1
answered_by: []
---

New note (task-122).

## Observed

On WingFoil 0.3.1 (`870bd440`), in a project made with `init --template Kanban`, `wingfoil directives list` prints
its ten directives as a JSON document of 205 lines (4 549 characters), each with its whole frontmatter;
`wingfoil memory search` prints eight lines a match (path, id, title, type, status and tags, inside braces; more
with tags). F-003
notes the format; this note is about the volume an agent pays for it. A coding agent keeps every command's output in
its context, and every later model call of its session re-reads it, so a listing printed once early in a session is
paid again at every call after it. Agents following WingFoil's workflow call these listings repeatedly: to learn
which directives apply (see F-032) and which documents wait at a gate.

## Expected

A compact default for listings meant to be read by an agent: one line a record (for directives: id, title and the
roles they apply to; for a search: id, status and title), the full record with an option or on a `show` command
(which `directives` lacks in 0.3.1). Every line
saved is saved once for every later call of the session; on a local model without a prefix cache, at full price.
