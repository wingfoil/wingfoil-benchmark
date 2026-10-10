---
id: F-032
title: "A role's context is not delivered when an agent's session starts"
kind: request
status: open
wingfoil_version: 0.2.2
answered_by: []
---

Formerly N42.

## Observed

An agent (Claude Code) working in a WingFoil project never loaded WingFoil's `developer-session` MCP Prompt by
itself. It found its rules and decisions through CLI calls instead, which took 9–19 % of a session's cost, against
about 1 300 tokens for the directives themselves. Observed on `0.2.2`, in unattended sessions; reproducing it needs
an agent, so it was not re-run here.

## Expected

The role's context reaches the agent when its session starts (for example a generated section of the agent's
instruction file, or a hook), rather than depending on the agent to fetch a Prompt.
