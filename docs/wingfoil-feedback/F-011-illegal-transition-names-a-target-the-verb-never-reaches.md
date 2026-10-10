---
id: F-011
title: "\"illegal transition\" names a target the verb would never reach"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N12, N48, N49.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`, with a member holding the `approver` role added to `dna.yaml`'s `team.members`), on the default machine `draft → pending → approved` (gate on `pending`), with a bug element:

- `memory approve <id> --reason ok` on a `draft` element → `error: illegal transition draft -> approved for type
  'bug'`, exit 1. `approve` is not legal from `draft` at all; the message reads as if it tried to skip a step.
- a second `memory submit <id>` on a `pending` element → `error: illegal transition pending -> (none)`, exit 1. It
  does not say that `pending` waits for the approver.
- `memory approve` on an `approved` element → `error: illegal transition approved -> (none)`, exit 1; and
  `memory submit` on it → `error: illegal transition approved -> pending`, exit 1. `pending` is not a successor of
  `approved`, which is the last state of the sequence. With a longer machine, `approve` on a state past every gate
  named the target of an earlier gate (`approved -> backlog`).

Re-run on 2026-10-10 on `0.2-pre-3df305e` and `0.2.2`: the messages above.

## Expected

The refusal says why in the machine's terms: "`approve` is not legal from `draft`: it is not a gate",
"`pending` waits for `approve` or `reject`", "`approved` is a final state".
