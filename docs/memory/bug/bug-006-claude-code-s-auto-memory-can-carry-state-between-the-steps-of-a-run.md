---
id: bug-006-claude-code-s-auto-memory-can-carry-state-between-the-steps-of-a-run
type: bug
title: "Claude Code's auto-memory can carry state between the steps of a run"
status: approved
---

## Context

REQ-RUN-04 and experiment design §3.4: each step starts a **new agent session**, and **only the
repository carries state** between steps. The runner keeps one container for the whole run
(task-003) and starts each step's session in it (task-005, task-006).

The W3 spike ([task-011](../task/task-011-wingfoil-in-the-run-container-spike.md), probe P7, Claude
Code 2.1.280) recorded this in the `init` event of every session:

```
"memory_paths": {"auto": "/home/node/.claude/projects/-workspace/memory/"}
```

That is Claude Code's auto-memory: a directory the agent may write notes to, and that a later session
of the same project reads. It is in the container's home, **outside `/workspace`**, so:

- it survives from one step's session to the next, because the container does;
- no step's patch shows it, and no snapshot the scorer reads contains it.

## Expected

Nothing but the repository reaches a step's session: a note written in step 1 is not read in step 2
unless it was written into the workspace, where the step's patch shows it.

## Actual

Not yet observed carrying anything: the spike only saw that the directory is configured. Whether
2.1.280 writes to it in headless (`-p`) sessions, and whether `--setting-sources project` or another
flag or setting turns it off, is unverified. If it does write, state crosses steps invisibly, in every
arm alike — which does not bias the comparison between arms, but breaks the run protocol and the
"fresh session per step" that F2.2 promises.

## Evidence

- task-011 Execution notes, Q7; `spikes/task-011/p7-session.sh`, the `init` events in its
  git-ignored `out/p7/`.

## Suggested handling

A task that (1) checks with the fake agent that nothing under `/home/node/.claude/projects/` survives
between steps, or (2) checks with a cheap real session whether the directory is written, then either
disables auto-memory in the run image's settings or clears the directory between steps. Not part of
W3; it applies to every arm.
