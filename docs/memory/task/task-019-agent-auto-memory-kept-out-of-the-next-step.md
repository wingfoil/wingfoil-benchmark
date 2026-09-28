---
id: task-019-agent-auto-memory-kept-out-of-the-next-step
type: task
title: "Agent auto-memory kept out of the next step"
status: backlog
release: v0.1
wave: W4
features: []
acceptance: []
requirements: [REQ-RUN-04, REQ-RUN-02]
---

## Context

Fourth task of wave **W4** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It fixes
[bug-006](../bug/bug-006-claude-code-s-auto-memory-can-carry-state-between-the-steps-of-a-run.md)
(approved 2026-09-25): Claude Code 2.1.280 names an auto-memory directory,
`/home/node/.claude/projects/-workspace/memory/`, in the container's home and outside the workspace.
The container lives for the whole run, so a note written there in one step's session could be read in
the next, carrying state outside the repository — which REQ-RUN-04 and F2.2 forbid. The approver put
it in W4 so that the protocol holds before W5's dry runs, which are real runs (W4 plan-phase decision
3, task-016).

Scope:

- **Find out** whether the pinned agent writes there in headless sessions, and whether a setting or a
  flag turns auto-memory off; with the fake agent, prove what the runner does about it.
- **Fix** it in the way that keeps every arm the same: auto-memory off in the run image's settings if
  the agent honours that, otherwise the directory cleared between steps by the runner — or both.
- **Close bug-006** in prose here and in the bug's own notes (WingFoil has no element links, usage
  note N29).

It fixes a bug and delivers no feature, so `features` and `acceptance` are empty, as for task-004.

**Spending, proposed and to be confirmed at this task's pending → backlog gate:** one or two short
real sessions on Haiku 4.5, **up to about 0.30 € equivalent**, to observe whether the directory is
written and whether the chosen switch stops it. Without it the fix is built on the documented
behaviour and marked unverified.

**Done** means: nothing under `/home/node/.claude/projects/` written in one step is readable in the
next, proven with the fake agent in the docker suite; the real agent's behaviour observed within the
spending limit; bug-006's resolution recorded; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- REQ-RUN-04 — a file the agent leaves under `/home/node/.claude/projects/` in step 1 is gone, or never
  written, when step 2 starts. **red-first**
- REQ-RUN-02 — the fix adds no mount and keeps the credential out of the image and the workspace.
  **characterization**
- Whatever switch is chosen, the pinned agent is observed honouring it (real session, within the
  limit above). **red-first**

## Design

**Classification confirmed.**

### What the pinned agent offers, read before anything is spent

`grep -a` on the native binary of Claude Code 2.1.280 in the run image (the spike's image of
task-011) finds the variable **`CLAUDE_CODE_DISABLE_AUTO_MEMORY`**, and no `autoMemory…` setting key.
That a name exists in a binary proves nothing about what it does; the real sessions below find out.

### Two defences, both the same in every arm

1. **The runner clears the auto-memory before every step** (this is the fix that holds whatever the
   agent does): before a step's first session it runs, in the container,
   `rm -rf "$HOME"/.claude/projects/*/memory`. It does not touch the rest of `~/.claude/projects/` —
   the session transcripts there are what `--resume` needs within a step — and it runs before every
   step, so step 1 starts as clean as the others. It adds no mount and writes nothing to the workspace
   (REQ-RUN-02). The command and its failure path are the runner's; a failing clear fails the run, as
   a failing step does (REQ-NFR-03): a step that might read the previous one's notes is not scored.
2. **The runner turns auto-memory off**, if the real sessions show that the pinned agent honours
   `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`: then no note is written in the first place, and an agent that
   would otherwise spend turns on its memory does not. It is set by the runner in every container's
   environment, next to the credential, and it is not a secret. If the sessions show it is not
   honoured, this defence is dropped and the notes say so: the first one is enough to fix the bug.

### What the real sessions observe (Haiku 4.5, ceiling 0.30 €, consented at `2bb466e`)

Scripts under `spikes/task-019/`, the same pattern as task-011's P7 (the token enters by name on each
`exec`, a secret scan closes the spike, output git-ignored):

- **M1, without the variable**: session A is asked to save a note to its auto-memory ("the codeword is
  …") and reply `done`; the probe then lists `~/.claude/projects/*/memory/`. Session B, fresh, is asked
  for the codeword from its memory. This shows whether the bug happens at all: whether a note is
  written, and whether a new session reads it.
- **M2, with the variable**: the same two sessions. Is `memory_paths` still in the `init` event, is a
  note written, is the codeword recalled?
- M3 is not needed: the clear is a file operation the fake-agent tests prove.

Estimated cost: four short sessions, a few cents. The ceiling is checked before each session, as in
task-011. The spending becomes a line of the v0.1 ledger when it happens (dl-006, task-020).

### Tests

- **Unit** (doubles): the clear runs before each step's first invocation and never before a resume;
  a failing clear fails the run; the variable is in every container's environment (if kept) and not
  among the secrets scrubbed.
- **Docker**: a fake-agent run of T1 (three steps) whose step 1 writes a note under
  `~/.claude/projects/-workspace/memory/` and whose step 2 fails if it finds one — green only if the
  clear works in a real container.

### Closing bug-006

WingFoil has no link between a bug and the task that fixes it (bug-005, usage note N29), and `bug`
ends at `approved`. So the resolution is written where it can be: a *Resolution* section in bug-006,
naming this task and its commits, as bug-004 did, committed with this task.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `40e3842`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W4 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-019-agent-auto-memory-kept-out-of-the-next-step` → `0669ff4`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
