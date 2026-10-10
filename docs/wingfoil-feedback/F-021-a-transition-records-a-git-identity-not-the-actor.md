---
id: F-021
title: "A transition records a git identity, not who performed it"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N23.

## Observed

`memory approve` can be run by anyone who can run the CLI with the approver's git identity; the approver it
records is the git author. When an agent and its human approver share one git identity, the agent's `submit`
commits and the human's `approve` commits carry the same author, and `memory history` reports
`approver: <name> <email> (approver)` for both kinds alike. Nothing in WingFoil tells who acted, and nothing stops
the identity that did the work from passing its own gate; only a guard outside WingFoil did.

## Expected

A transition records the acting identity (human or agent) apart from the git author, and a gate can declare
that the identity that did the work may not pass it.
