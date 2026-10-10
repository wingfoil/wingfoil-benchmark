---
id: F-002
title: "The scaffolded dna.yaml does not show that a technology needs a category"
kind: defect
status: open
wingfoil_version: 0.1.0-7a65580
answered_by: []
---

Formerly N2.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`), `dna.yaml` has `technologies: []` and no example. Adding an entry with a name only:

```yaml
  technologies:
    - name: TypeScript
```

makes every command that loads the DNA fail, for example `wingfoil dna show`:
`error: E_VALIDATION stacks.technologies.0.category (…/.wingfoil/dna.yaml): Invalid input: expected string,
received undefined`, exit 1 (`0.2-pre-3df305e`). The field is required by the schema and discoverable only through
the error.

Re-run on 2026-10-10 on `0.2.2`: the scaffold now carries a commented example and the hint
`wingfoil dna add stacks.technologies --value TypeScript --entry-category language`. On that build the note no
longer reproduces as written.

## Expected

The scaffold shows a complete technology entry, `category` included, or a command that adds one. `0.2.2`
appears to do both; the note stays open until a sync confirms it.
