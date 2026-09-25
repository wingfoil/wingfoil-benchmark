---
id: dl-001-errors-are-returned-as-a-result
type: decision-log
title: "Errors are returned as a Result"
status: approved
---

## Context

The domain's callers must handle every failure.

## Decision

Errors are returned as a `Result`, never thrown.
