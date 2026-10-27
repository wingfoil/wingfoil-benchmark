---
id: F-033
title: "The agents' guide sets rules but no level of process, and no place for an automated approver"
kind: request
status: resolved
wingfoil_version: 0.2.2
answered_by: [dl-103]
---

Formerly N43.

## Observed

WingFoil's `docs/agents.md` (in `0.2.2`) gives an agent rules: load your role's directives, read before you
write, change state only through the verbs, never approve. It does not say how much to record (a task per
request, a decision-log per design decision, or only what the workflow asks), so each project picks a level and
cannot say it uses "WingFoil's own". It also has no place for an automated approver: an unattended pipeline whose
approval is a fixed policy has to break "never approve" or stop.

Again on 0.3.0 (2026-10-23, this repository's task-100): `docs/agents.md` §2 reads current work and decisions with
`wingfoil memory search --type <type> [--status <s>]`, leaving the status to the agent; it does not say that an
agent's own records stay pending until an approver approves them, nor where knowledge given in a request (a rule meant
for later) belongs. This repository's arm manual read `--status approved`, and that search found nothing in almost
every step.

## Expected

The guide recommends levels of process (for example a light and a strict one) and says how an unattended,
automated approver fits the rule that an agent never approves.
