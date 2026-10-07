---
id: task-070-openspec-in-the-run-container-spike
type: task
title: "OpenSpec in the run container spike"
status: backlog
release: v0.2
wave: W13
features: []
acceptance: []
requirements: [REQ-RUN-18]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

A spike before the OpenSpec arm ([rel-v0-2](../release/rel-v0-2.md), W13; plan-004: "one spike per competitor,
… with the fake agent first, then one small real-agent run with consent"), as task-065 was for Spec Kit.

**Questions:**

1. Does OpenSpec **1.14.0** (`@fission-ai/openspec`, the register's admitted version) install offline from an `npm
   pack` tarball in the run image, and does `openspec init --tools claude --profile core --force` work headless?
2. What does it write: skills and commands (`/opsx:*`), `openspec/`, a `CLAUDE.md` or `AGENTS.md`? Which of it is
   project information (for REQ-FMT-14's rules and the docs control) and which is mechanics?
3. Where does OpenSpec keep a project's context and rules at 1.14.0 (REQ-FMT-14: "as its pinned version defines it")?
4. Can an agent follow propose → apply → archive under `claude -p` with the neutral approver; where do sessions
   wait; does `archive` need `--yes` with stdin closed?
5. Is `OPENSPEC_TELEMETRY=0` enough to turn telemetry off, and does anything reach the network?

**First with the fake agent, then one small real run, consented by this task's pending → backlog approval:** at most
**3 €**, Sonnet 5 on Claude Code 2.1.280, S3 step 1 only, from the main checkout with
`BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token`. A line of `docs/calibration/v0.2-ledger.md`. A failed run is not
relaunched without new consent.

**Done** means: the answers with their evidence; the register's entry for OpenSpec re-assessed in the run container;
the setup script and the rules' place drafted for task-071.

## Acceptance criteria

<!-- A spike: no Gherkin scenario. Its answers and the ledger line are reviewed. -->

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "OpenSpec in the run container spike"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-070-openspec-in-the-run-container-spike`, `status: draft`. Matches.
