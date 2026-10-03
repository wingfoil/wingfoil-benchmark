---
id: task-051-a-429-rate-limit-rejection-recognised-as-the-subscription-s-limit
type: task
title: "A 429 rate-limit rejection recognised as the subscription's limit"
status: in-review
release: v0.1
wave: validation
features: [F1.3]
acceptance: [campaign.feature]
requirements: [REQ-RUN-13]
---

## Context

Fixes [bug-010](../bug/bug-010-a-429-rate-limit-rejection-fails-the-run-as-an-api-error-instead-of-being-recognised-as-the-subscription-s-limit.md),
found by calibration ([task-050](task-050-calibration-of-v0-1-dry-runs-measured-costs-and-the-revised-budget.md),
dry run 2): a step of Claude Code 2.1.280 that ended on the subscription's rate limit was recorded `failed:
api_error`, not as the subscription's limit (REQ-RUN-13). Its last events:

- `{"type":"assistant","error":"rate_limit", …}`
- `{"type":"result","is_error":true,"api_error_status":429,"result":"API Error: Request rejected (429) · This
  request would exceed your account's rate limit. Please try again later.","terminal_reason":"api_error"}`

`isQuotaExhausted` (`src/agents/claude-code.ts`, task-024) reads only the `result` event's `result` and
`errors` against `/usage limit|rate_limit/i`, written on a documented, never observed shape; this is the first
observed one. `rel-v0-1` (W5) left exactly this due "before the campaign".

It runs before plan-003 step 4 (validation) and step 5 (the reference campaign), where a 429 would otherwise fail a
run (`wave: validation` names the `release-cycle` phase it belongs to, as `calibration` did for task-049/050).

**Scope:** the adapter recognises the observed shape — `api_error_status` 429, "rate limit" in the result text, or
an `assistant` event's `rate_limit` error — beside the documented one; the observed events, with nothing secret in
them, become a fixture of the adapter's tests; what the runner then does with the step is the design's.

**Left to the design phase, for the approver:**

1. **A short-term rate limit or the usage limit.** A 429 "try again later" is not necessarily the subscription's
   usage limit exhausted. (a) Treat it as `quota exhausted` (REQ-RUN-13 as written: the campaign stops starting
   runs, completed runs kept; re-running the rest later); (b) a distinct outcome, `rate limited`, waited out with a
   bounded back-off and the step resumed (`--resume` of its session), `quota exhausted` after the bound; (c) (a)
   now, (b) as a later improvement. (b) changes REQ-RUN-13 and the step's cost accounting across the wait.
2. Whether a run whose step ended so is re-runnable from that step, or only whole.

**No real agent, no spending:** the observed transcript is the fixture; the fake agent replays the shape in the
runner's tests.

**Done** means: the observed shape gives the step the outcome the design chose; the documented shape still does;
`npm test` green with coverage above 80 %, lint clean; bug-010's Resolution names this task's commits.

## Acceptance criteria

- The observed 429 shape is recognised (adapter, `readSession`). **Red-first**: today it reads `failed: api_error`.
- The documented usage-limit shape still gives `quota exhausted` (`test/unit/agents/claude-code.test.ts`, task-024).
  **Characterization.**
- What the runner does with a rate-limited step (choice 1). **Red-first**, with the fake agent and an injected wait.
- `campaign.feature` @F1.3 and the caps tests stay green. **Characterization.**

## Design

### What was observed, and what the fixture is

Dry run 2's step 03 (S1@1.0 baseline-docs, Claude Code 2.1.280, Sonnet 5) ended on these events, as bug-010 quotes
them: an `assistant` event with `"error":"rate_limit"`, then a `result` with `"is_error":true`,
`"api_error_status":429`, `"result":"API Error: Request rejected (429) · This request would exceed your account's
rate limit. Please try again later."`, `"terminal_reason":"api_error"`. The transcript itself was lost with
task-050's worktree; **the fixture is reconstructed from those fields** (the ones the adapter reads), and says so. The
same dry run, re-run minutes later, completed: the limit was transient.

### Detection (adapter)

`readSession` keeps the latest `assistant` event's `error`. A `result` with `is_error: true` is:

- **the usage limit** (`quota exhausted`, REQ-RUN-13 as written) when its text says "usage limit" — the documented
  shape, unchanged;
- **a rate limit** when `api_error_status` is 429, or its text says "rate limit", or its `errors` or the preceding
  `assistant` event's `error` say `rate_limit`.

`isQuotaExhausted` becomes a classifier returning `usage limit`, `rate limit` or nothing; its tests keep the
documented shapes.

### What the runner does with a rate limit — the runner cannot finish an interrupted execution

A campaign's execution has no way to be continued: after a run ends `quota exhausted`, the campaign stops starting
runs, and finishing it means a new execution from its first run (about 60 € with the revised budget's option A) or
publishing an incomplete one.

### Choices confirmed by the approver (2026-10-03)

1. **(b) Wait and resume, bounded.** A rate-limited step's invocation is followed by waits of 2, 5, 15 and 30 minutes
   (about 52 at most), each followed by a resume of the same session with the fixed message "Continue.", recorded as an
   intervention of its own kind, `rate limit`, never counted with the approver's. After the last wait the step ends
   `quota exhausted`. Requirements 1.24 amends REQ-RUN-13 and REQ-RUN-07; the method page says so. Set aside: (a) a
   rate limit treated as the usage limit; (c) `campaign run --continue`.
2. **The waits are a constant of the runner**, each one recorded in `run.json`. Set aside: a campaign pin.

### Changes

- `src/agents/claude-code.ts`: the classifier, `readSession` tracking the `assistant` error, the outcome
  `rate limited`.
- `src/agents/port.ts`, `src/runner/run.ts`: the step's loop waits and resumes on `rate limited` (an injected
  sleeper, so tests do not wait), `quota exhausted` after the bound. (As built: no intervention kind — correction 2.)
- `run.json`: each wait recorded (when, how long, the invocation it followed).
- Tests: the reconstructed 429 in the adapter's unit tests; the runner's caps tests with a fake that answers 429 then
  completes, and one that answers 429 every time.
- Requirements 1.24: REQ-RUN-13 (a rate limit waited out, the usage limit as today), with cross-references in
  REQ-RUN-07 and REQ-RUN-08 (as built: correction 2); the method page's statement of it (`site-content/method.md`).

## Execution notes

- `npx wingfoil memory add --type task --title "A 429 rate-limit rejection recognised as the subscription's limit"`
  — declared: creates the element at `draft` and commits it. Observed: `ab9a41f wf(task): add …`.
- `npx wingfoil memory submit task-051-…` (draft → pending), `a706003`; the approver's `memory approve` (pending →
  backlog), `0544627`, with its reason; `memory submit` (backlog → in-progress), `dfad4fd`, on the task branch in its
  own worktree.

### Build

- `6da8171` (red): the adapter's tests — the reconstructed 429 read as `rate limited`, and each of its signs alone
  (status 429, "rate limit" in the text, a `rate_limit` error, the `assistant` event's error); the runner's tests —
  a rate-limited step waited out and resumed with "Continue." in the same session, `quota exhausted` after the four
  waits (2, 5, 15, 30 minutes), the step's time cap moved by the waits, and `run.json`'s `rate_limit_waits` apart
  from the interventions. The task-024 test that read `errors: ["rate_limit_error: quota"]` as `quota exhausted` now
  reads the usage limit only from "usage limit": a `rate_limit` error is a rate limit, waited out.
- `958fc82`: `subscriptionLimitOf` (usage limit or rate limit) in place of `isQuotaExhausted`; `readSession` keeps the
  latest `assistant` event's `error`; the outcome `rate limited`; the runner's `waitOut`, with an injected `sleep` and
  clock, `RATE_LIMIT_WAITS_S` and `RATE_LIMIT_MESSAGE`, the step's deadline moved by each wait, the cost cap checked
  before each resume; `rate_limit_waits` in `run.json`.
- `4a21721`: requirements 1.24, REQ-RUN-13 made precise; the method page's statement `{#rate-limit}` with its source.

**Two corrections to the Design, found in the build:**

1. **`step_time_s` is the step's, not an invocation's.** The design did not address it, assuming the waits fell
   outside the time cap; the runner in fact computes one deadline for the whole step, and the waits would have eaten
   it (52 minutes against, e.g., the 3600 s of the dry-run profile: the resume killed at once). The deadline is now moved by each wait; a test fixes it.
2. **The waits are not recorded as interventions.** The confirmed choice reads "an intervention of its own kind,
   `rate limit`, never counted with the approver's". They are recorded instead as `rate_limit_waits` beside the
   step, and the resumes are not in `interventions` at all: the intervention list and its count are what M-K2 and the
   policy's cap read (REQ-RUN-07), and a separate record keeps every intervention metric untouched without a new
   kind for them to exclude. REQ-RUN-07 is therefore unchanged; REQ-RUN-13 says the message is not an intervention.
   **To confirm at review.**

- `bafa04b`: the cost cap checked **before** a wait — a run with nothing left of its cap ends the step at the cap
  without waiting (found writing the test of that branch, which coverage showed uncovered).

**Tests:** `npm test` 77 files, 1206 tests before the last fix, coverage 98.01 % statements, 90.8 % branches;
`npm run lint` clean; the runner and agent tests 189/189 after it.

**The fixture** is reconstructed from bug-010's quoted fields (the transcript was lost with task-050's worktree); the
test says so.

### Review

**Independent review** by a fresh read-only agent on the branch (2026-10-03): no blocker; correction 2 judged correct
and complete. Its findings and outcome:

1. *should-fix* — the token cap was not checked before a rate limit's resume (REQ-RUN-08, the method page's
   `{#step-tokens-between-invocations}`). **Fixed:** checked with the cost cap, before any wait; a test.
2. *should-fix* — `intervention` numbering became incoherent when rate-limit and approver resumes mixed (1, 1, 3, 2),
   and the fake agent indexes its scripted resumes by it. **Fixed:** the field is the step's resume number of any
   kind, passed by both loops (`invocations.length`; unchanged without a rate limit); port.ts says so; a test.
3. *should-fix* — the fake agent replayed a recorded 429 as completed. **Fixed:** it replays `rate limited`; the
   reconstructed fixture `test/fixtures/sessions/rate-limited.jsonl` and a test.
4. *should-fix* — the text and assistant-error signs applied to any error. **Fixed:** they count for an API error only
   (`terminal_reason: api_error` or an `api_error_status`); status 429 stays unconditional; a test with a tool's
   "rate limit".
5. *nits* — the four waits per step (said in REQ-RUN-13 and the method page); the session-id check in the wait loop;
   the classifier called once; the assistant's error reset after a result; `bench run show` lists the waits;
   REQ-RUN-07 and REQ-RUN-08 cross-reference REQ-RUN-13; the Design's Changes list marked as built; correction 1's
   wording. **Fixed.** Missing tests added: a rate limit on an approver's resume, a usage limit after a wait, the token
   cap at a rate limit, and the time cap with time used before the wait (the earlier test was vacuous: the doubles
   run no command; it now asserts the resume's 10 s).

**After the fixes:** `npm test` 77 files, **1212 tests**, coverage 98.03 % statements, 90.87 % branches; lint clean.

**Known limit:** whether "Continue." resumes a session whose very first request was rejected — whether Claude Code
keeps the prompt before the API call — is not observed; such a resume may find no prompt to continue.

- `npx wingfoil memory submit task-051-…` (in-progress → in-review) — observed: `c82766f`, `status: in-review`.
