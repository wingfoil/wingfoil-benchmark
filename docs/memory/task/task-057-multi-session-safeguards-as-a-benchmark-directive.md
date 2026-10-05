---
id: task-057-multi-session-safeguards-as-a-benchmark-directive
type: task
title: "Multi-session safeguards as a benchmark directive"
status: in-progress
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-NFR-01, REQ-NFR-02]
---

## Context

Implements [dl-014](../decision-log/dl-014-process-safeguards-for-a-repository-worked-by-several-sessions.md),
approved at [rel-v0-2](../release/rel-v0-2.md)'s triage (option B).

**Scope:** a benchmark directive, bound to every role that works the repository, holding dl-014's rules:

- one linked worktree per session, with its own `npm ci`, and no branch switch in a shared checkout;
- no history rewrite of `main` once a branch is based on it;
- every approval command run with an explicit `cd` to the checkout of the branch that should receive it;
- real-agent runs from the main checkout, and `git status --ignored` checked before removing a worktree;
- a consent given in chat recorded with the approver's words.

**No real agent, no spending.** **Done** means: `npx wingfoil directives list --role developer` lists it, and
README's development section points to it.

## Acceptance criteria

- `npx wingfoil directives list --role developer` (and the other working roles) lists the directive. **Characterization**
  by command.

## Design

dl-014 was approved as option **B** at rel-v0-2's triage (`63c41d4`: "option B, the multi-session rules as a
benchmark directive, a task in W12"). Option C's tooling stays with WingFoil as usage notes N40 and N41.

### Classification of the acceptance criteria

**Characterization** by command: no product code changes. Before the change (`1abb503`) `directives list --role`
gives developer `[code-quality, documentation, testing, determinism, doc-versioning, security-secrets]`, reviewer
`[code-review, documentation, doc-versioning, security-secrets, traceability]`, qa `[documentation, testing,
doc-versioning, security-secrets]`, approver `[documentation, doc-versioning, security-secrets]`. After it, every
role lists `multi-session` too, and nothing else changes.

### The directive

`.wingfoil/directives/custom/multi-session.md`, `id: multi-session`, `kind: custom`, in the shape of the other
custom directives (front matter, a title, the rules). Its rules are dl-014 B's five, each with the v0.1 incident
from dl-014's Context that it answers:

1. one linked worktree per session (`git worktree add`), with its own `npm ci` and never a `node_modules` symlink
   (since `c448a67`'s incident `.gitignore` also ignores the link; the remaining risk is a shared install that the
   other checkout's next `npm ci` replaces); no branch switch in a shared checkout;
2. no history rewrite of `main` once any branch is based on it;
3. every approval command (`memory approve` / `reject`) run, or handed over, with an explicit `cd` to the checkout
   of the branch that should receive it; a handed-over command carries a drafted reason, not a placeholder (task-056,
   usage note N50);
4. real-agent runs from the main checkout, so that their ignored transcripts outlive task branches; `git status
   --ignored` listed before removing a worktree, and no `git clean`;
5. a consent or decision given in chat recorded with the approver's name, the date and the chat's words.

Plus a sixth, which answers dl-014's first incident (2026-09-24, a session ran `git checkout -- .wingfoil/` on
another's modified files): leave other sessions' changes alone, check which sessions are active and say which files
you touch, and commit a change as soon as it is complete.

### Binding

Under `global:` in `.wingfoil/roles.yaml`: the rules concern whoever works the repository, the approver included
(rule 3 is the approver's as much as the agent's), and `global` is how the existing cross-role rules
(`security-secrets`, `doc-versioning`) are bound. Every role then lists it, which the acceptance criterion asks.

### README

The Development section gains a short paragraph: several sessions work the repository, and the rules are the
`multi-session` directive, read with `npx wingfoil directives list`.

### Commit

One `chore(wingfoil)` commit for the directive and the binding, with dl-014's approval as `Approver:`/`Reason:`
trailers; README in the same commit, as the task's "Done" names both.

## Execution notes

- `npx wingfoil memory add --type task --title "Multi-session safeguards as a benchmark directive"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-057-multi-session-safeguards-as-a-benchmark-directive`, `status: draft`.
- First `memory submit` refused: "missing required field on submit: requirements". The task serves no product
  requirement; [REQ-NFR-01, REQ-NFR-02] is the nearest, as task-052 did (WingFoil usage notes N17, N21: a required field cannot say "none").

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-057-…` → `e517cad`, in the linked worktree
  `WingFoil2-Benchmark-task-057` with its own `npm ci`. Declared: `backlog → in-progress`, one commit. Observed: exit
  0, JSON `{"from": "backlog", "to": "in-progress"}`, one file, diff limited to `status`. Matches.
- `npx wingfoil directives list --role <role>` for developer, reviewer, qa, approver, product-owner (the
  independent review re-ran it for all nine roles of `dna.yaml`), before (`1abb503`)
  and after (`03b5ac1`): exit 0, empty stderr. After, each role lists `multi-session` and nothing else changed; its entry
  reads `"global": true`, `"assignment": "global (all roles)"`, `"roles": []`. Declared (`roles.yaml`'s header:
  "Global directives apply to every role"): a global directive is listed for every role. Observed: as declared.
  Matches.

### Build

1. `03b5ac1` (`chore(wingfoil)`, dl-014's approval as trailers): `.wingfoil/directives/custom/multi-session.md`, its
   `global` binding in `roles.yaml`, and README's Development paragraph.
2. No code changed. `npm test` 1225/1225, coverage 98.04 % statements, 90.93 % branches; `npm run lint` clean.
   `test:bin`/`test:docker` not run: no CLI, runner, image or scoring change.

### Review

- **Round 1** (independent read-only Explore subagent, on `1252a63`): no blocking finding; it ran `directives list`
  for all nine roles in both checkouts (only `multi-session` added, exit 0, empty stderr), checked the five rules
  against dl-014 B, the trailers against `63c41d4`, and lint. Findings and outcomes:
  1. should-fix — "Announce and commit" had no source in the repository, and the intro claimed every rule came
     from v0.1. **Fixed:** the rule cites dl-014's first incident (2026-09-24, `git checkout -- .wingfoil/` on
     another's files), adds "leave other sessions' changes alone", and the Design names its source.
  2. nit — "(git commits the link)" is outdated: `.gitignore` now ignores the link. **Fixed:** the remaining risk
     (a shared install replaced by the other checkout's `npm ci`).
  3. nit — the Design promised a reason for every rule; rules 3 and 5 had none. **Fixed:** each rule now cites its
     incident (bug-010's approval on task-050's branch; `5f4b5eb`, `e37dee2`; the 19 transcripts).
  4. nit — the notes named five of nine roles. **Fixed:** they say the review re-ran it for all nine.
  5. nit — plan-004's Constraints still said "(dl-014, pending)". **Fixed:** it points to the `multi-session`
     directive (a status fact, as task-056 changed plan-004's delivery rule).
- **Round 2** (a new independent read-only Explore subagent, on `4b087d7`): **clean**. It verified the five round-1
  outcomes and every factual claim of the directive against dl-014's Context and git (`ea21256` in task-050's
  reflog and `86327a2` on main; `5f4b5eb`, `e37dee2` without an `Approver:` line; `68c4a80`'s `Reason: <motivo>`;
  `.gitignore` and `c448a67`), lint, and `directives list`. One optional nit: README's parenthesis read as the full
  list of rules. **Fixed:** "among them:".
- **Hashes after the rewrite** (2026-10-05, at the approver's request, of task-056's approval and the four local
  commits above it on main; this branch rebased onto the result). The trees are unchanged; the commits named above
  were: `1abb503` (base, now `4a0ff36`), `1252a63` (round 1's subject, now `1fcf9b6`), `4b087d7` (round 2's subject,
  now `6d868d0`). `68c4a80` was task-056's approval with `Reason: <motivo>`, now `c327fed` with a reason. The
  directive's rule on handed-over reasons cites this rewrite.
