---
id: ""
type: adr
title: ""
status: draft
format: 1
---

<!-- adr body. `wingfoil memory add` copies this scaffold, setting only `id`, `title` and
     `status` (and any `--tags` or `--set` value). Fill the required frontmatter fields and replace
     these placeholder comments yourself; `wingfoil memory submit` then checks the required fields,
     moves `status` forward and commits the document as you left it, naming in the commit body the
     content it carries. -->

<!-- Replacing an earlier adr? This starter scaffold has no `supersedes:` field, and the starter
     `memory.yaml` no `superseded` state, so approving this adr retires nothing. To use the
     trigger, add `supersedes: ""` to this scaffold (it holds the full id of the replaced element, e.g.
     "adr-2-git-backed-storage", never a short form) and give the type its own `states:` in
     `memory.yaml` whose `sequence` ends in a state listed in `gates`, then an approved state
     listed in `waiting`, then `superseded`: the trigger fires only when `memory approve` lands
     in that `waiting` state, and approve moves only out of a gate. Otherwise retire the replaced element with `wingfoil memory deprecate`, naming
     this one in `--reason`. -->
