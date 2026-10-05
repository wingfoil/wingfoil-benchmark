---
id: task-053-agent-and-process-output-not-bounded-at-1-mib
type: task
title: "Agent and process output not bounded at 1 MiB"
status: done
release: v0.1
wave: campaign
features: [F2.3]
acceptance: [runner.feature]
requirements: [REQ-RUN-04, REQ-RUN-08, REQ-RUN-09]
fixes: [bug-011-an-agent-step-whose-output-passes-1-mib-is-killed-by-execfile-s-default-maxbuffer-and-its-cost-is-lost]
---

## Context

Fixes [bug-011](../bug/bug-011-an-agent-step-whose-output-passes-1-mib-is-killed-by-execfile-s-default-maxbuffer-and-its-cost-is-lost.md),
found by the v0.1 reference campaign ([campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md), execution
`c82a5e74885b/1`). Three of its 19 runs failed at S1's step 03: the agent's stream-json output passed 1 MiB, Node's
default `maxBuffer` for `execFile` (`systemProcess`, `src/core/ports/process.ts`), and was cut. The step was then
read as "a line of the session is not valid JSON", with no cost. The approver sent the campaign back
(scored → running, `1ab1d67`) to fix this first, and then re-run it in full as a new execution.

`wave: campaign` names the `release-cycle` phase this task belongs to, as `validation` did for task-051.

**Scope:**

- The process port reads a command's output whole, up to a bound far above any step's output, for every command
  that goes through it. The agent's step is one of them, but so are the step's `git diff` (`diff.patch`), the setup
  log and the scoring container's output, which are bound by the same 1 MiB today.
- A command that does reach the bound says so. This must not look like invalid JSON, a failed git command or a
  timeout.
- The adapter turns a bounded step into a failed step whose error names the bound.

**No real agent, no spending.** The bound is tested with the real `systemProcess` on a local command, and the
adapter with the scripted fake agent.

**Done** means:

- an output of several MiB is read whole;
- reaching the bound is reported as such;
- `npm test` is green with coverage above 80 %, lint is clean, and `npm run test:docker` stays green;
- bug-011's Resolution names this task's commits.

Then the reference campaign is re-run in full as `c82a5e74885b/2`, with the approver's spending consent at
campaign-cycle's `approve-spend`.

## Acceptance criteria

- `systemProcess` returns an output of 3 MiB whole (`test/unit/ports/process.test.ts`). **Red-first**: today it is
  cut at 1 MiB.
- A command whose output passes the port's bound ends with `outputBounded`, the bound named in `stderr`, and is not
  reported as `timedOut` even with a time limit set. **Red-first**, with a small bound injected.
- The Claude Code adapter fails a step whose output was bounded with "the agent's output passed the … bound",
  not "not valid JSON". **Red-first**.
- `runner.feature` (@F2.2, @F2.3) and the caps tests stay green. **Characterization.**

## Design

**1. The process port's bound** (`src/core/ports/process.ts`):

- `execFile` gets an explicit `maxBuffer`, `MAX_OUTPUT_BYTES` = **256 MiB**, for stdout and stderr alike.
  - That is 256 times the output that failed: the longest step seen was a little over 1 MiB, from 3.2 M to 24 M
    tokens of usage (calibration).
  - It also stays below V8's longest string (about 512 M characters), which `encoding: 'utf8'` must build.
  - It holds for every command through the port, not only the agent's: git diffs, setup logs, scoring output.
- A factory, `createSystemProcess({ maxOutputBytes })`, with `systemProcess = createSystemProcess()`, so that the
  test can reach the bound with a few KiB instead of 256 MiB.
- **Reaching the bound** (`error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'`):
  - the result carries `outputBounded: true`;
  - its `stderr` ends with "output bound of N bytes reached";
  - its `code` is 1, as for any failure;
  - it is **never** `timedOut`. It is told apart by Node's error code, `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`, before the
    timeout is read.
- Streaming the output to a file (`spawn`) was considered and not chosen:
  - it would change every caller of a port that returns strings;
  - the transcript is already held in memory to be scrubbed and parsed;
  - one bound, stated and reported, is enough for v0.1.

**2. The adapter** (`src/agents/claude-code.ts`):

- `invoke`'s `run` returns `{ stdout, outputBounded? }`, which is what `docker.exec` already returns.
- When `outputBounded` is set, the step fails with "the agent's output passed the port's output bound; its usage
  is not known". The transcript keeps the lines that were read, so the evidence stays, and `readSession` is not
  asked to parse a cut line.
- The cost stays unknown, as in a session killed at its time cap. This task does not make it up. The runner counts
  it at its bound, as it does a killed session: `cost_reported: false` and `cost_bound_usd` in `run.json` (from the
  independent review, finding 1).

**3. `processFailure`** quotes at most the last 4 096 characters of a failed command's output. A bounded `git diff`
or setup could otherwise put 256 MiB into an error message and `run.json` (review, finding 5). The bound's note is
at the end, so it is kept.

**4. Not changed:**

- The caps, the fake agent and the results format.
- A `docker exec` client stopped by the bound may leave the agent running inside the container until the run's
  container is removed. That happens when the run ends, which a failed step causes. Until then the runner still takes
  the step's snapshot (`diff.patch`) while the agent may be writing, so that snapshot is not reliable (review,
  finding 4). With a 256 MiB bound this is no longer a case a campaign meets; it is written down here, not handled.

**5. bug-011's Resolution** names this task's commits.

## Execution notes

- `npx wingfoil memory add --type task --title "Agent and process output not bounded at 1 MiB"`. Declared:
  creates the element from the template and commits it. Observed: `fe5c5e2 wf(task): add task-053-…`, `status:
  draft`, the template's fields empty.
- `npx wingfoil memory submit task-053-…` (draft → pending). Declared: moves `status` and commits the file.
  Observed: `fd7a601 wf(task): submit …`, `status: pending`; the body committed first (`dc3527e`).
- `npx wingfoil memory approve task-053-… --reason "…"` (pending → backlog), run by the agent on the approver's
  request in chat (2026-10-04: "procedi con il bug 11 e la sua risoluzione"). Declared: moves `status`, records
  approver and reason. Observed: `187bbc9 … [pending → backlog]`, with `Approver:` and `Reason:` trailers.
- Branch `task/task-053-…` in its own worktree (`../WingFoil2-Benchmark-task-053`, its own `npm ci`). Design
  committed first (`013208d`). Then `npx wingfoil memory submit task-053-…` (backlog → in-progress). Observed:
  `e5d2496`, `status: in-progress`, on the task branch.

### Build

- **Red first:**
  - `test/unit/ports/process.test.ts`: a 3 MiB output gets 1 048 576 characters, not 3 MiB, and
    `createSystemProcess` does not exist;
  - `test/unit/agents/claude-code.test.ts`: a bounded stream reads "a line of the session is not valid JSON".
- **Then green** (`1110370`):
  - `MAX_OUTPUT_BYTES` 256 MiB and `createSystemProcess` in the port, `outputBounded` and the note in `stderr`;
  - the adapter fails a bounded step by name, keeping the lines it read.
- `npm test`: 77 files, 1216 tests; coverage 98.04 % statements. `npm run lint`: clean. `npm run test:bin`: 8/8.
  `npm run test:docker` on `1110370`: 16/16, with the runner changes of `0b87a9b` landing during the run. It is run
  again on the final commit (below).

### Review

An independent, read-only agent reviewed `main...1110370` against the Design, bug-011 and REQ-RUN-04/08/09.
It found no blocker. Checked against Node 22.21 directly:

- the error is `code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'`, with `killed` undefined;
- `maxBuffer` counts bytes, but the string kept is at most `maxBuffer` characters, below V8's longest string.

| # | Finding | Severity | Outcome |
|---|---|---|---|
| 1 | A bounded step's cost was still recorded as a reported 0, which contradicts the Design ("as a session killed at its time cap") | should-fix | **Fixed** (`0b87a9b`): the runner reads `outputBounded` from the exec result and counts the step at its bound (`cost_reported: false`, `cost_bound_usd`); a runner test |
| 2 | bug-011's Resolution empty | should-fix | **Fixed** at the end of this task |
| 3 | Comment and Design said Node sets `killed` on this error | nit | **Fixed** (`0b87a9b`) |
| 4 | The step's snapshot is taken while a bounded agent may still be writing | nit | **Written into the Design** (`0b87a9b`); not handled, being unreachable at 256 MiB |
| 5 | `processFailure` could quote a stderr of up to 256 MiB | nit | **Fixed** (`0b87a9b`): its last 4 096 characters; a test |
| 6 | A bounded setup is named in `log.txt`, not in `run.json` | nit | Accepted as is |

A **re-review** of `0b87a9b` by the same agent: clean. Its two nits:

- an adapter that *throws* on a bounded result would lose the cost bound. **Fixed** (`21e7b2d`), with a test. The
  error names the bound;
- the runner's default error string is not the adapter's. Cosmetic, left.

After the fixes: `npm test` 77 files, **1219 tests**; coverage **98.04 %** statements, 90.89 % branches, 98.76 %
functions, 99.18 % lines. `npm run lint`: clean.
- `npm run test:docker` on `0b87a9b`: **16/16**, none skipped, 425 s; no container left behind. `21e7b2d` changes
  only the runner's catch path for a bounded invocation, which no Docker test reaches; its unit tests cover it.

### Approval

The approver asked in chat (2026-10-04, "Approva e mergia task 53") for the agent to run `memory approve`
(in-review → approved): `8f74800`, "bug-011 fixed: output read whole up to 256 MiB, the bound reported and its cost
counted at the bound; 1219 tests, 98.04%, Docker 16/16, independent review clean".

### Delivery

- Merged into `main` with `--no-ff` (`7fad7b8`).
- `npx wingfoil memory submit task-053-…` (approved → done). Declared: moves `status` and commits the file.
  Observed: `0c80042`, `status: done`.
- The worktree held only `coverage/` and `dist/` among its ignored files, both rebuilt from the sources, so it was
  removed, and the branch deleted.
- bug-011 stays `approved`. A bug has no transition to a fixed state, which is bug-005. Its Resolution names this
  task.

