---
id: F-033
title: "The agents' guide sets rules but no level of process, and no place for an automated approver"
kind: request
status: open
wingfoil_version: 0.2.2
answered_by: []
---

Formerly N43.

## Observed

WingFoil's `docs/agents.md` (in `0.2.2`) gives an agent rules: load your role's directives, read before you
write, change state only through the verbs, never approve. It does not say how much to record (a task per
request, a decision-log per design decision, or only what the workflow asks), so each project picks a level and
cannot say it uses "WingFoil's own". It also has no place for an automated approver: an unattended pipeline whose
approval is a fixed policy has to break "never approve" or stop.

## Expected

The guide recommends levels of process (for example a light and a strict one) and says how an unattended,
automated approver fits the rule that an agent never approves.
