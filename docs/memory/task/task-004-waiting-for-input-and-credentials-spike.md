---
id: task-004-waiting-for-input-and-credentials-spike
type: task
title: "Waiting-for-input and credentials spike"
status: in-progress
release: v0.1
wave: W2
features: [F2.3, F2.4]
acceptance: [runner.feature]
requirements: [REQ-RUN-06, REQ-RUN-15, REQ-NFR-01]
---

## Context

First task of wave **W2 — Agent in the loop** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It is the spike the specification asks for by name: REQ-RUN-06 ("waiting-for-input detection, spike
in W2") and REQ-RUN-15 ("whether a read-only mount lets the agent refresh its token is to be verified
in the W2 spike"). F2.4 is the one high-uncertainty feature of the wave
([07_sequencer.md](../../01_vision/07_sequencer.md) 1.1).

It is a **knowledge task**: it adds no behaviour and no code under `src/`. It implements none of the
scenarios of `runner.feature`; it is traced to that file because its findings are what W2's @F2.3 and
@F2.4 scenarios will be built against. Its probes are throwaway scripts, kept outside the package.

It is the only task of W2 that spends tokens. The approver authorised **up to about 1 € equivalent**
on the maintainer's Claude subscription (plan phase, 2026-09-23). If the questions below are not
settled within that, the spike stops and reports what is still open rather than spending more.

### Questions to answer

1. **Does a headless session ever block?** With `claude -p … --permission-mode bypassPermissions`
   inside the run container, does the process ever wait for input, or does it always exit? This
   decides whether "waiting" is an observed state or, as REQ-RUN-06 assumes, an inference from the
   final assistant message.
2. **What does the stream-json stream look like** for the pinned agent version: the shape of the
   final assistant message, and the fields of the `result` event that carry tokens by kind, cost in
   USD, turns and duration (REQ-RUN-09).
3. **Does `--resume <session-id> -p <reply>` continue that same session** after the first process has
   exited, in the same container, and does the resumed part appear in the transcript (REQ-RUN-07)?
4. **Are the REQ-RUN-04 flags accepted as written** by the pinned version (`--output-format
   stream-json --verbose --model --session-id --permission-mode bypassPermissions --setting-sources
   project --max-budget-usd`), and does any of them behave differently from its documentation?
5. **Credentials (REQ-RUN-15):** does a read-only mount of the subscription's credential file let the
   agent run, and what happens when the token needs refreshing? What the API-key fallback needs.
6. **What is there to scrub (REQ-NFR-01):** which secret values appear in the stream-json output, in
   the transcript and in the workspace.
7. **How real approval requests and questions are worded**, as the material the classifier's rules
   are written from, and which agent version was probed (the candidate for the campaign's
   `agent.version`, REQ-RUN-16).

### W2 plan-phase decisions (accepted by the approver, 2026-09-23)

Recorded here because they shape task-005, task-006 and task-007, and they are written up with the
spike's answers in the ADR below.

1. **The spike is its own task, first of the wave**, so that the consent to spend is a gate of its
   own and the answers precede the design of F2.3 and F2.4.
2. **Spending:** up to about 1 € equivalent, on the subscription, for this task only.
3. **W2's "Ends with" is verified with the real Docker and a fake agent that replays recorded
   sessions**, not with a real agent. The evidence that a real agent behaves the way the fake
   replays it comes from this spike; the end-to-end run with a real agent stays in the release's
   validation phase ([plan-003](../../plans/plan-003-release-v0-1.md) step 4).

### Produces

- a **decision-log** with the waiting-for-input classifier v1: its rules, their order (approval
  patterns first, then a trailing question), and how its version binds to the approver policy version
  (REQ-RUN-06);
- **adr-002**, the W2 runner and adapter conventions: what this spike found, plus the design defaults
  of W2 (per-step artefacts written in their REQ-FMT-06 places, the credential mount and the mount
  allow-list, the recorded-session fake agent, `--max-budget-usd` emitted but not enforced until W5);
- a note against REQ-RUN-15 and, if the observed behaviour departs from the specification, an
  amendment proposal for the approver rather than a silent deviation.

**Done** means: the seven questions are answered with evidence from a real run, the decision-log and
adr-002 are written, the spending is reported, and nothing of the maintainer's credentials reached
the workspace, the logs, the transcripts or this repository.

## Acceptance criteria

No Gherkin criterion and no classification: this task adds no behaviour, so there is nothing to
test-drive. Its exit criteria are the seven questions above, each answered with the command that was
run and what it printed, recorded in the Execution notes.

## Design

The protocol below is written before anything is run, so that what was probed, and what it cost,
can be read back against what was planned. **Nothing here has been executed yet.**

### Rules the protocol holds to

- **No production code.** Nothing under `src/`, `test/` or `docker/` changes. If a probe shows the
  run image needs a change, that is a finding for task-006, not an edit here.
- **The probes are committed, their output is not.** One shell script per probe under
  `spikes/task-004/`, so the spike is reproducible and reviewable; `spikes/task-004/out/` is
  git-ignored and holds the raw event streams. The scripts refuse to run without
  `BENCH_SPIKE_CONFIRM=1`, so neither a test run nor a stray shell spends anything by accident.
- **Cost, and where it stops.** The spike's own ceiling is **1.00 USD**, summed from the
  `total_cost_usd` the sessions report — a conservative proxy for the 1 € the approver authorised, at
  any plausible rate. The sum is checked after every probe; on reaching it the spike stops and the
  remaining questions are reported open. On a subscription that figure is the API-equivalent cost,
  not a charge (sequencer decision 1): the real consumption is quota, and quota exhaustion is itself
  a finding (REQ-RUN-13).
- **Cheapest model that answers the question.** The probes test the CLI's plumbing, not the model, so
  they run on Haiku 4.5 (`claude-haiku-4-5`, 1 $/5 $ per MTok). One probe repeats on Sonnet 5
  (`claude-sonnet-5`, 2 $/10 $), the reference campaign's model, only to confirm the `result` event
  has the same shape there.
- **Credentials (REQ-NFR-01).** No probe prints, copies or commits a credential. The scripts run
  without `set -x`, refer to the credential file only by the path the approver names, and every
  recorded stream is passed through the secret scan of P7 before any of it is quoted in the Execution
  notes. If the file cannot be located, that is a finding, not something to go looking for.
- **Evidence.** Each probe records, in the Execution notes: the command as run (credential path
  elided), the exit code, the few events that answer the question, the answer, and the cost.

### Probes

| # | Question | What it runs | Cost |
|---|---|---|---|
| P0 | 7 | Build the run image with `AGENT_NAME=claude-code` and the candidate `AGENT_VERSION`; `claude --version` inside it. | none |
| P1 | 4 | `claude --help` in the container: which of the REQ-RUN-04 flags exist, and what each says. | none |
| P2 | 1, 2 | One trivial session with the full REQ-RUN-04 command line, stdin closed (`< /dev/null`) under a wall-clock timeout, so "it waits" is observable as a timeout rather than a hang. | ~0.01 $ |
| P3 | 2 | The same prompt on Sonnet 5, to confirm the `result` event carries the same fields. | ~0.02 $ |
| P4 | 7 | A session whose prompt makes the agent end by **asking a question**. The final assistant message is recorded verbatim. | ~0.02 $ |
| P5 | 7 | A session whose prompt makes the agent end by **requesting approval** for an action it will not take on its own. Recorded verbatim. | ~0.02 $ |
| P6 | 3 | `claude --resume <session id of P4> -p "<the policy's question reply>"` in the **same container**: does it continue that session, does the id hold, and does the resumed part carry the earlier turns? | ~0.02 $ |
| P7 | 5 | The credential file mounted read-only; a session run as the container's `node` user; then a session forced to need a refresh, to see what a read-only mount does to it. The API-key variant runs only if a key is available, and is otherwise reported untested. | ~0.02 $ |
| P8 | 6 | No session: a scan of everything P2–P7 recorded for the known secret values, compared by digest so that nothing secret is printed. | none |

The estimate is a little under 0.15 $ in total, an order of magnitude below the ceiling. The ceiling
is there for the case the estimate is wrong.

### The two open risks the protocol admits

- **The credential path is host-specific.** REQ-RUN-15 assumes a file that can be mounted read-only.
  If Claude Code on this machine keeps its token somewhere that cannot be (a keyring, a service), the
  requirement's default does not hold as written, and the spike's output is an **amendment proposal**
  for the approver rather than a workaround invented here.
- **`--max-budget-usd` may not exist, or may not mean what REQ-RUN-04 assumes.** P1 answers that
  before task-006 is designed around it. If it is absent, the run cap has to be enforced by the
  runner, which moves work into W5 and is worth knowing now rather than then.

### What the spike produces

- **dl-004**, the waiting-for-input classifier v1: the rules, their order (approval patterns first,
  then a trailing question), the wording P4 and P5 actually produced, and how the classifier's
  version binds to `approver_policy` (REQ-RUN-06).
- **adr-002**, the W2 runner and adapter conventions: what P0–P8 found, plus the design defaults the
  approver accepted at plan time — per-step artefacts written in their REQ-FMT-06 places, the
  credential mount inside a two-mount allow-list, the recorded-session fake agent, and
  `--max-budget-usd` emitted in W2 but enforced in W5.

### Review

This task has no tests of its own, so its review is: the seven questions answered with evidence, no
secret anywhere in the repository or in the notes, the two documents written, and `npm test`,
`npm run test:bin`, `npm run test:docker` and `npm run lint` still green at HEAD — `test:bin` named
explicitly because forgetting it was the blocker of task-003's first review.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `678c6a2`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W2 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-004-waiting-for-input-and-credentials-spike` → `f7b7d9e`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
- `npx wingfoil memory approve task-004-waiting-for-input-and-credentials-spike --reason "…"` → `80ccf67`, run after the
  approver's explicit consent in chat. Declared: `pending → backlog` gate, approver role checked,
  subject with `[from → to]`, `Approver:`/`Reason:` body, only `status` changed. Observed: exit 0,
  empty stderr, subject `wf(task): approve task-004-waiting-for-input-and-credentials-spike [pending → backlog]`,
  both trailers present, 1-line diff. Matches.
- `npx wingfoil memory submit task-004-waiting-for-input-and-credentials-spike` → `d8cf51a`, on the
  branch `task/task-004-waiting-for-input-and-credentials-spike`. Declared: `backlog → in-progress`,
  a plain forward step with no gate (the task machine's `waiting` states have no verb), one commit
  `wf(task): submit <id>`. Observed: exit 0, empty stderr, 1 file, diff limited to
  `status: backlog` → `status: in-progress`. Matches.

### Spike, first run (2026-09-23)

The protocol of the Design section was written and committed (`7ce7741`) **before any probe ran**.

**Spent: 0.0000 USD of the 1.00 USD ceiling.** The one session that started failed before it reached
the API, so nothing was billed and no quota was used.

**Order corrected.** The protocol ran P7 (credentials) last. That is wrong: every session probe needs
credentials to start at all, so the credential mount had to come first. P0, P1 and P2 ran; P3–P6 are
blocked on the finding below; P8 has nothing to scan.

#### P0 — the image (question 7)

`docker build --build-arg AGENT_NAME=claude-code --build-arg AGENT_VERSION=2.1.280` against the
existing `docker/run-image/Dockerfile`, unchanged. `claude --version` inside the image →
`2.1.280 (Claude Code)`, the latest release on npm on 2026-09-23; the maintainer's host runs 2.1.221,
so the container and the host are deliberately not the same build. `/home/node/.claude` **does not
exist in the image** — which turns out to matter, see P2.

#### P1 — the flags (question 4)

All eleven flags REQ-RUN-04 and REQ-RUN-07 name are present in 2.1.280: `-p`, `--output-format`,
`--verbose`, `--model`, `--session-id`, `--permission-mode`, `--setting-sources`,
`--max-budget-usd`, `--resume`, `--mcp-config`, `--strict-mcp-config`. `--max-budget-usd <amount>` is
documented as "Maximum dollar amount to spend on API calls (only works with --print)", which is what
REQ-RUN-04 assumes. **The second risk the Design named is closed:** the run cap does not have to be
enforced by the runner.

The help also lists `claude setup-token`, "Set up a long-lived authentication token". That is a
cleaner path for REQ-RUN-15 than mounting an OAuth file, and it is the approver's decision, not one
to take here.

#### P2 — the session (questions 1 and 2), and where it stopped

With stdin closed and a 180 s timeout, the session **exited on its own** (exit 1, not 124): a headless
session does not block waiting for input. That is one half of question 1; the other half — what a
session does when it *wants* an answer — needs P4 and P5.

The stream carried three events: `system/init`, `assistant`, `result`. The `result` event holds every
field REQ-RUN-09 needs — `session_id`, `total_cost_usd`, `usage.{input_tokens, output_tokens,
cache_creation_input_tokens, cache_read_input_tokens}`, `num_turns`, `duration_ms`, `duration_api_ms`
— plus `modelUsage`, `permission_denials`, `terminal_reason`, `is_error` and `subtype`. The **shape**
is confirmed; the values are all zero, because the session failed, so a populated reading is still
owed.

**A trap for task-006, found by accident.** The failed session's result event reads
`"subtype": "success"` **and** `"is_error": true`, with `"terminal_reason": "api_error"`. An adapter
that keys on `subtype` would record a session that did nothing as a good one. The outcome must be
read from `is_error` and `terminal_reason`, never from `subtype` alone.

#### The blocker: the host's credentials are stale (question 5)

The session's assistant message was `Failed to authenticate: OAuth session expired and could not be
refreshed`. The cause is not the read-only mount:

- the mount worked — inside the container `/home/node/.claude/.credentials.json` is present,
  `-rw------- node node`, 280 bytes, because the image's `node` is uid 1000 like the host user;
- the file itself is expired. Its `claudeAiOauth.refreshTokenExpiresAt` is **2026-08-19**, five weeks
  before this run, and the file has not been written since 2026-08-20. Read by field name only; no
  value was printed, copied or stored.

So **REQ-RUN-15's actual question is still open**: whether a read-only mount lets a *valid* session
refresh its token could not be tested, because no valid credential was available to refresh. Neither
`ANTHROPIC_API_KEY` nor `ANTHROPIC_AUTH_TOKEN` is set on the host, so the API-key variant is untested
too. Authenticating is the approver's action, never the agent's.

#### Two more findings for task-006

1. **The config directory is created root-owned.** With only the file mounted, Docker creates
   `/home/node/.claude` as `root:root 755`, and the container's `node` cannot write in it
   (`touch` → `Permission denied`). The agent still started, but `--resume` keeps its session files
   under that directory, so P6 would have failed even with valid credentials. The run image must
   create `/home/node/.claude` owned by `node`, or the agent must be pointed elsewhere.
2. **Mounting a single file is fragile.** A login rewrites `.credentials.json` by replacing it, and a
   bind mount of a file follows the old inode: after a re-login on the host, every container would
   silently keep mounting the stale file. Mounting the directory read-only survives that, but
   collides with finding 1 — the agent needs to write in its config directory. REQ-RUN-15 says
   "read-only mount" without saying of what; the answer has to be written down rather than assumed.

#### What is needed to finish

Valid credentials in the container, obtained by the approver, by either `claude setup-token` on the
host or a fresh login that rewrites `~/.claude/.credentials.json`. Then P3–P8 run as the protocol
says, with the credential mount moved to the front of the order.

### Spike, second run (2026-09-23/24), with a long-lived token

The approver created a token with `claude setup-token` and left it in a file of their own, mode 600,
outside the repository. The probes read it at `docker exec` time into an environment variable; the
value was never printed, copied or committed.

**Spent: 0.1266 USD of the 1.00 USD ceiling**, over eight sessions.

**Second deviation from the protocol.** P8 was to compare by digest. A digest cannot be computed over
every substring of a transcript, so the comparison is a literal search whose *output* is only a count
of files. The value is still never printed.

#### Question 1 — a headless session never waits

No probe ever hit the timeout: every session exited on its own. The session that asked a question and
the session that requested approval both ended `is_error: false`, `terminal_reason: "completed"` —
**indistinguishable, in the result event, from the session that simply answered.** There is no field
that says "waiting". REQ-RUN-06's premise is confirmed from the other side: waiting can only be
inferred from the text of the final assistant message.

#### Question 2 — the result event, with real values

| | trivial, Haiku 4.5 | trivial, Sonnet 5 |
|---|---|---|
| `total_cost_usd` | 0.00993 | 0.02499 |
| `input_tokens` / `output_tokens` | 10 / 40 | 2 / 4 |
| `cache_creation_input_tokens` | 6 683 | 8 479 |
| `cache_read_input_tokens` | 13 642 | 18 764 |
| `num_turns`, `duration_ms` | 1, 1 435 | 1, 2 083 |

Every field REQ-RUN-09 needs is there, in both models, with the same names. **What the numbers say
is worth more than the field list:** a session that replies with one word costs a cent, and almost
all of it is the agent's own system prompt — some 20 000 cached tokens before the step's prompt is
even read. The step cost of a real scenario will sit on top of a fixed per-session floor, which is
what M-K3 and the W5 budget have to model. A step is never free.

#### Question 3 — `--resume` continues the same session, and usage does not accumulate

`claude --resume <id> -p <reply>` in the same container continued the session P4 had started: every
event of the resumed stream carries **the same `session_id`**. Two things follow for task-006 and
task-007:

- **The resumed stream does not replay the earlier turns.** Its first assistant message is new work,
  not the question P4 ended on. A run's transcript is therefore the *concatenation* of its
  invocations, not the last one.
- **Usage is per invocation.** The resume reported its own `num_turns: 12` and `total_cost_usd:
  0.0681`. The adapter must **sum** the result events of a step and its resumes; reading the last one
  would under-report every step that needed an intervention — exactly the steps the benchmark cares
  about.

#### Question 5 — the credentials, answered differently than the requirement assumed

- **The long-lived token works, as `ANTHROPIC_AUTH_TOKEN`.** That is REQ-RUN-15's second form ("an
  API key through an environment variable"), and with it nothing has to be mounted.
- **The same token in `ANTHROPIC_API_KEY` does not work.** The agent emitted `system/api_retry`
  events in a loop and produced **no result event at all** before the cap ended it. Two lessons: the
  variable is not interchangeable, and **a step can end with no result event**, so the adapter must
  treat a missing result as a failed step rather than assume one is always there.
- **A credential needs sanitising.** The token file first held a line break, left by a paste that
  wrapped; the agent failed with `Invalid Authorization header value ... it contains a line break at
  character 80`. The runner must strip whitespace from a credential, or refuse it with a message that
  says so — the agent's own error is clear, but it arrives only after a session has been started.
- **REQ-RUN-15's literal question stays open.** The read-only OAuth mount could not be tested:
  `~/.claude/.credentials.json` on this machine holds an **empty `accessToken`** and a
  `refreshTokenExpiresAt` of 2026-08-19. Read by field name and length only.
- **The mount, as REQ-RUN-15 describes it, does not work as written.** Mounting only the file makes
  Docker create `/home/node/.claude` as `root:root`, where the container's `node` cannot write. With
  the token and no mount, the agent creates that directory itself and fills it with `projects/`,
  `sessions/` and `shell-snapshots/` — which is precisely what `--resume` needs. **The token is not
  merely a convenience: it is what leaves the agent's config directory writable.**

#### Question 6 — nothing leaked, which is not the same as nothing can

The token appears in none of the recorded event streams, in no stderr, in no log and nowhere in the
workspace. The OAuth values could not be scanned for, being empty. The scrubber REQ-NFR-01 asks for
still has to exist; this run simply found no leak path.

#### Question 7 — the wording, and why the naive rule fails

- **A question** (P4, verbatim): *"What specifically needs to be cached — database queries, API
  responses, computed results, or something else?"* — the message ends with `?`.
- **An approval request** (P5, verbatim, last two sentences): *"**Are you sure you want me to delete
  all files under `/workspace`?** This is a destructive operation and cannot be undone. Please
  confirm that you want this to happen. Once you approve, I'll proceed. Otherwise, please let me know
  what you'd like to do instead."*

The approval request **does not end with a question**. Its question mark is in the middle; the last
sentence is a statement. A classifier that tests whether the final message ends in `?` would read
this as "not waiting" and the run would lose an intervention — and with it the neutral approver's
whole purpose. REQ-RUN-06's "approval patterns first, then a trailing question" must therefore be
read as: **approval patterns matched anywhere in the message, and only then the trailing-question
test.** That is the single most useful thing this spike found, and it was found by looking at real
wording rather than imagining it.

#### One more, for the record

`modelUsage` keyed the same session under both `claude-haiku-4-5` and `claude-haiku-4-5-20251001`. A
run's model must be recorded from the campaign's pin, not from the keys of `modelUsage`.

#### The two documents, written

- **[dl-004](../decision-log/dl-004-waiting-for-input-classifier-v1.md)** — the classifier v1, written
  from the wording above, with the real approval request kept in it as the test a trailing-question
  rule alone would fail. It also proposes one clarifying sentence for requirements 1.3: "approval
  patterns first" means matched **anywhere in the message**.
- **[adr-002](../adr/adr-002-w2-runner-and-adapter-conventions.md)** — the W2 conventions. It keeps
  the plan-phase defaults and the spike's findings apart, and carries two changes to what had been
  agreed: the long-lived token becomes the authentication default (**an amendment to REQ-RUN-15,
  proposed, not taken**), and the container keeps **exactly one mount**, which supersedes the
  two-mount allow-list written into task-006's approval reason.

Both are `pending`, awaiting the approver.

- The probe container was removed; the image `bench-spike-task-004` is left for task-006 to reuse.
- `npx wingfoil memory add --type decision-log --title "…"` → `1449744` and
  `--type adr --title "…"` → `de85857`. Declared for each: one commit `wf(<type>): add <id>`, one new
  file from that type's template, `status: draft`, id from the type's `id_pattern`. Observed: exit 0,
  empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Bodies written and committed by hand in `docs(memory): dl-004 … and adr-002 …`, so that `submit`
  carries only the state change (N13).
- `npx wingfoil memory submit dl-004-…` → `1b170d0` and `submit adr-002-…` → `fa1e6e0`. Declared:
  `draft → pending` on the default state machine, one commit per element with no bracket and no body.
  Observed for each: exit 0, empty stderr, 1 file, diff limited to `status: draft` →
  `status: pending`. Matches (subject without transition: N9).
