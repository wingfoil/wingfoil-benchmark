---
id: r4-errors-as-result
name: r4-errors-as-result
type: directive
kind: custom
title: "Errors are returned as a Result in the domain"
---

# Errors are returned as a Result in the domain

Code under `src/domain/` never throws: an operation that can fail returns a `Result`, with an error
that says what went wrong.
