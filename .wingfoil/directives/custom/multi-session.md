---
id: multi-session
name: multi-session
type: directive
kind: custom
title: "Multi-session safeguards"
---

# Multi-session safeguards

Several sessions work this repository at once (dl-014). Each rule below was learnt in v0.1, once per session.

- **One linked worktree per session.** Work a branch in its own `git worktree add`, with its own `npm ci`; never
  symlink `node_modules` into it (git commits the link). Never switch branch in a checkout another session uses.
- **No history rewrite of `main`** once any branch is based on it: the rewrite replays or drops another session's
  commits.
- **Approval commands name their checkout.** Every `memory approve` / `reject`, run or handed over, starts with an
  explicit `cd` to the checkout of the branch that should receive it. A handed-over command carries a drafted
  `--reason`, never a placeholder.
- **Real-agent runs from the main checkout,** so that their git-ignored transcripts outlive task branches. Before
  removing a worktree, list its ignored files (`git status --ignored`) and save what is evidence; never `git clean`.
- **A consent or decision given in chat is recorded** with the approver's name, the date and the chat's words.
- **Announce and commit.** Check which other sessions are active, say which files you touch, and commit a change as
  soon as it is complete.
