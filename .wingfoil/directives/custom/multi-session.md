---
id: multi-session
name: multi-session
type: directive
kind: custom
title: "Multi-session safeguards"
---

# Multi-session safeguards

Several sessions work this repository at once (dl-014). Each rule answers an incident of v0.1 that dl-014's Context
records.

- **One linked worktree per session.** Work a branch in its own `git worktree add`, with its own `npm ci`; never
  symlink `node_modules` into it (the link shares another checkout's install, which that checkout's next `npm ci`
  replaces). Never switch branch in a checkout another session uses.
- **No history rewrite of `main`** once any branch is based on it: on 2026-09-24 a rewrite reached a branch another
  session was working on, and had to be repaired with `rebase --onto`.
- **Approval commands name their checkout.** Every `memory approve` / `reject`, run or handed over, starts with an
  explicit `cd` to the checkout of the branch that should receive it: on 2026-10-03 bug-010's approval was committed
  on task-050's branch and had to be cherry-picked to main. A handed-over command carries a drafted `--reason`, never
  a placeholder (task-056 recorded `Reason: <motivo>`).
- **Real-agent runs from the main checkout,** so that their git-ignored transcripts outlive task branches. Before
  removing a worktree, list its ignored files (`git status --ignored`) and save what is evidence; never `git clean`.
  `git worktree remove --force` once deleted 19 calibration dry runs' transcripts.
- **A consent or decision given in chat is recorded** with the approver's name, the date and the chat's words:
  `5f4b5eb` and `e37dee2` committed spending consents without them.
- **Leave other sessions' changes alone; commit promptly.** Check which other sessions are active and say which files
  you touch. Never revert files you do not recognise: on 2026-09-24 a session ran `git checkout -- .wingfoil/` on
  another's work. Commit a change as soon as it is complete, so that nothing of yours lies uncommitted for another
  session to meet.
