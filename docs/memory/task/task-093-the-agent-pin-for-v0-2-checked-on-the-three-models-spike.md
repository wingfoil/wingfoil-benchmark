---
id: task-093-the-agent-pin-for-v0-2-checked-on-the-three-models-spike
type: task
title: "The agent pin for v0.2 checked on the three models spike"
status: in-progress
release: v0.2
wave: calibration
features: []
acceptance: []
requirements: [REQ-RUN-16, REQ-RUN-09]
fixes: []
tags: ["spike","calibration","agent"]
---

## Context

A spike of v0.2's calibration (plan-004 step 3), as [task-062](task-062-claude-5-5-models-on-the-pinned-agent-spike.md),
[task-065](task-065-spec-kit-in-the-run-container-spike.md) and [task-070](task-070-openspec-in-the-run-container-spike.md)
were. It checks the agent pin before any dry run, so that calibration's dry runs are made once, on the pin the campaign
keeps:

- [dl-007](../decision-log/dl-007-claude-5-5-models-for-the-v0-2-campaign.md) proposal 1: "a spike first checks the
  agent pin against the 5.5 models";
- [dl-015](../decision-log/dl-015-the-effort-the-agent-sends-is-pinned-per-model-by-the-campaign.md): the effort
  levels per model "are set at calibration with the approver";
- [bug-012](../bug/bug-012-a-step-s-tokens-leave-out-the-models-claude-code-calls-for-its-own-work.md) and
  [bug-016](../bug/bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price.md), fixed by
  task-069: a step's tokens are every model's, and a cost whose `costBasis` is not `list` is flagged;
- task-062's recommendation: Claude Code **2.1.291 or later**, since 2.1.280 misprices Sonnet 5.5.

`campaigns/v0-2-reference.yaml` and `v0-2-bridge.yaml` (task-091) hold the agent version (2.1.291) and the effort
(Sonnet 5.5 `high`, Opus 5.5 `high`, Haiku 4.5 `none`) as placeholders. Since task-062, Claude Code has moved on:
`npm view @anthropic-ai/claude-code dist-tags` on 2026-10-14 gives `latest` **2.1.300** (published 2026-10-14) and
`stable` **2.1.292** (2026-10-06).

**Questions:**

1. Does the latest release price Sonnet 5.5, Opus 5.5 and Haiku 4.5 at list (`costBasis: "list"`, and a cost that
   dl-007's prices recompute from the tokens)?
2. Does it record every model's tokens in `modelUsage` (task-069's step tokens), on a real step rather than a
   one-word probe?
3. Which effort levels does it accept per model, which is each model's default, and does a pinned level reach the
   session?
4. Do the fields the adapter (`src/agents/claude-code.ts`) reads still come out as task-069 reads them?

**Done** means: the answers with their evidence, the ledger lines, and the recommended pins (agent version, effort
per model) for calibration to adopt with the approver. The campaign files are not changed here: calibration sets
their placeholders.

## Acceptance criteria

<!-- A spike: no Gherkin scenario, no product code, so no criterion is red-first or characterization. Its answers,
     their evidence and the ledger lines are what the review reads. -->

## Design

A spike: no product code, no Gherkin scenario.

- **Consent:** this task's pending → backlog approval, for **three real sessions, one per model, at most 3 € each,
  at most 9 € in all**, on the maintainer's subscription. The approval's reason names them.
- **Where:** from the main checkout, with `BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token`. The token enters each
  container by name only (`-e ANTHROPIC_AUTH_TOKEN`). The output goes to the main checkout's git-ignored
  `spikes/task-093/out/`, whatever checkout the script is run from.
- **A failed session is not repeated** without new consent. A session stopped by its cap still counts as run: its
  `modelUsage` answers the questions all the same.
- **Everything else** is free: reads of the package and the binary, and the fake agent.

### Read before anything is spent (free)

`spikes/task-093/probe.sh F1 F2`, no token, no spending:

- **F1, the release.** `npm view @anthropic-ai/claude-code dist-tags time`. The candidate is `latest` on the day of
  the run (2.1.300 at design). If `latest` moved since, the newer one is the candidate and the Execution notes say so.
  The CHANGELOG shipped in the package, between 2.1.291 and the candidate, is read for model, pricing, effort and
  stream-json entries; `stable` (2.1.292) is noted beside it.
- **F2, the binary.** An image built from `docker/run-image` with `AGENT_VERSION=<candidate>`, tagged
  `bench-spike-task-093-agent-<candidate>` (the prune never touches `bench-spike-*`). In it, from
  `readlink -f $(which claude)`, as task-062 read 2.1.291:
  - `claude --help`: the `--effort` levels;
  - whether the binary names `claude-sonnet-5-5`, `claude-opus-5-5` and `claude-haiku-4-5`;
  - each model's `defaultEffort`, `capLevels` and `supportsXHigh`, with the `grep -a -o` command recorded. A string
    proves nothing about behaviour; it says which level to try and which question stays open.
- **F3, a rehearsal with a fake agent.** `probe.sh P1 P2 P3` with `BENCH_SPIKE_FAKE=1`: the same containers, but
  `claude` is a stub that replays a recorded stream (the adapter's fixtures, `test/fixtures/sessions/completed-sonnet.jsonl`) and no token is passed.
  It checks, without spending, the command line each session would get, the running total and the refusal over the
  ceiling (a stub cost set above it), the output's layout, the adapter's read (Q4 below) and the secret scan (with a
  fake token file). The benchmark's own fake agent (`agent.name: fake`) is not used: it replaces Claude Code, so its
  image would not hold the candidate.

### The sessions (spend)

`BENCH_SPIKE_CONFIRM=1 spikes/task-093/probe.sh P1`, then `P2`, then `P3`. Each is S3@1.0 step 1 in the baseline arm,
with the command line and environment the runner gives a step today:

- a fresh container from F2's image, the workspace S3@1.0's seed made a git repository (the baseline arm adds
  nothing to it), `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`;
- `claude -p "$(cat scenarios/S3/1.0/prompts/01.md)" --output-format stream-json --verbose --model <id>
  [--effort <level>] --session-id <uuid> --permission-mode bypassPermissions --setting-sources project
  --max-budget-usd 2.50`, with `--debug` on stderr in case the effort is logged.

| Session | Model | Effort sent | Cap (`--max-budget-usd`) | Answers |
|---|---|---|---|---|
| P1 | `claude-haiku-4-5` | none (the placeholder), unless F2 shows Haiku 4.5 takes a level: then its default, named | 2.50 USD | Q1, Q2, Q3, Q4 |
| P2 | `claude-sonnet-5-5` | `high` (the placeholder), or a level F2 shows the model caps below it | 2.50 USD | Q1, Q2, Q3, Q4 |
| P3 | `claude-opus-5-5` | `high` (the placeholder), or a level F2 shows the model caps below it | 2.50 USD | Q1, Q2, Q3, Q4 |

**Caps and total.** The cap is 2.50 USD a session (2.21 € at the campaigns' rate of 0.8851), so that a last turn
over it still leaves the session under **3 €** (3.39 USD). Before each session the script sums `total_cost_usd` of
the sessions already run and refuses to start one that could take the total over **7.50 USD** (6.64 €), under the
**9 €** consented. Expected, from v0.1's whole S3 baseline run (0.84 € on Sonnet 5 for five steps) and dl-007's
prices: about 0.2–0.5 USD for Haiku 4.5 and Sonnet 5.5, 0.4–1.2 USD for Opus 5.5, **about 1–2 USD in all**. Cheapest
first: if P1 or P2 shows a step costs far more than expected, the spike stops and asks before P3.

**Read from each session:** the `init` event's `model`, `per_turn_effort_active` and any effort field; the `result`
event's `subtype`, `is_error`, `terminal_reason`, `num_turns`, `duration_ms`, `total_cost_usd`; `modelUsage` per key
(every token kind, `costUSD`, `costBasis`, `contextWindow`, `thinkingTokens`); stderr's `unrecognized_model` or any
effort line; the files the step wrote (`git status` of the workspace, not scored). Each cost is recomputed from the
tokens with dl-007's prices.

**Q4, offline.** The three streams are read by the adapter itself (the built `dist/`, a throwaway script in
`spikes/task-093/`): the step's tokens summed over `modelUsage`, the folded `models` with `costBasis`, the outcome,
and the cost against `total_cost_usd`.

**Secret scan** closing every stage that ran the agent: `grep -rlFf <(tr -d '[:space:]' < "$TOKEN_FILE")` over
`out/` and the script's directory, the token read from a descriptor and never printed; an empty token or a `grep`
error prints "secret scan failed" and exits 3 (task-062's scan).

### The ledger

One line of `docs/calibration/v0.2-ledger.md` per session (P1, P2, P3), written when it has spent: date, element,
kind, consent (`task-093 pending → backlog`, its commit), model and agent version, ceiling (2.50 USD, under the 3 €
consented), cost, source. The total under the table is updated.

### Done

- Q1–Q4 answered with their evidence in the Execution notes, the ledger lines.
- **Recommended pins**, for calibration to adopt with the approver: the agent version, and the effort per model
  (`agent.effort`), each with its reason; and whether `stable` or `latest` is the channel to pin from.
- Anything the spike finds wrong in the benchmark is filed as a bug or a decision-log, not fixed here.
- Review by an independent read-only agent, rounds in the Review notes.

## Execution notes

- `npx wingfoil memory add --type task --title "The agent pin for v0.2 checked on the three models spike" --tags
  "spike,calibration,agent"`, on main. Declared: creates the element from the template in `draft`, one commit.
  Observed: `ff9e9cf` (`wf(task): add task-093-…`), `status: draft`, `tags` written to the frontmatter, the other
  fields empty (W-02). Matches.
- The Design by hand, `0978d50`. Then `npx wingfoil memory submit task-093-…`, on main. Declared: `draft →
  pending`, one commit. Observed: exit 0, JSON `from`/`to` as declared, `dba54c4`, one file, `status` only. Matches.
- The approver's `memory approve task-093-… --reason "…"` → `c241d37` (`pending → backlog`), on main; its reason
  names the three sessions, their caps and the 9 € in all. Matches.
- `npx wingfoil memory submit task-093-…`, in the linked worktree `WingFoil2-Benchmark-wt/task-093` with its own
  `npm ci`. Declared: `backlog → in-progress`, one commit. Observed: exit 0, JSON `from`/`to` as declared, `94b79fa`,
  one file, `status` only. Matches.

### The spike (2026-10-14, from the main checkout)

`spikes/task-093/probe.sh` (`20337ed`) was run with the main checkout as its working directory, its output in the
main checkout's git-ignored `spikes/task-093/out/`.

**F1, the release (free).** `latest` **2.1.300** (2026-10-14T14:27Z), `stable` **2.1.292** (2026-10-06): 2.1.300 is
the candidate, as at design. The npm package ships no CHANGELOG (`out/f1/files.txt`), so it was read from
`raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md` (`out/f1/changelog-292-300.md`, 2.1.292 to
2.1.300). The entries that bear on the benchmark:

- **2.1.296:** `/cost`, `--max-budget-usd` and the SDK's cost figures price Sonnet 5.5 cache reads at $0.10 per
  million tokens, "was $0.20". Anthropic's pricing page (`out/f1/pricing.md`, read the same day) agrees: Sonnet 5.5's
  cache reads are 0.10, Opus 5.5's 0.20, Haiku 4.5's 0.10. dl-007's table says 0.20 for Sonnet 5.5.
- **2.1.293:** Claude Haiku 5.5 (`claude-haiku-5-5`) added, the default Haiku on the Anthropic API, 1 M context,
  0.10 / 0.50 USD per million input / output tokens (0.50 / 2.50 for prompts over 100 K tokens).
- **2.1.299:** a fix to a headless run kept going past `--max-budget-usd` by a mod (the runner loads none).
- Effort: `/effort` in agent view (2.1.299), an `effort` parameter for the Agent tool (2.1.292), faster web
  searches at `xhigh` and `max` (2.1.295), WebFetch's page reads at the caller's effort (2.1.299). Nothing changes
  `--effort` in `-p` mode or the stream-json shape.
- **2.1.295:** background requests behind a Claude apps gateway use Haiku 4.5 instead of the session's model. The
  runner uses no gateway, but it bears on which Haiku Claude Code calls for its own work (see the watch list below).

How each file of `out/f1/` and `out/f2/prices-effort.txt` was fetched by hand, outside `probe.sh`, is recorded beside
it (`out/f1/sources.txt`, `out/f2/prices-effort.command.txt`).

**F2, the binary (free).** Image `bench-spike-task-093-agent-2.1.300`, built from `docker/run-image`. `claude
--version` → `2.1.300 (Claude Code)`; `--help` keeps `--effort <level>`. The binary names `claude-sonnet-5-5` (36),
`claude-opus-5-5` (55) and `claude-haiku-4-5` (54); `costBasis` takes `list`, `managed` or `unknown`; the `haiku`
alias resolves to `claude-haiku-5-5` (`out/f2/strings.txt`, `out/f2/prices-effort.txt`). A
`capLevels: ["low","medium","high"]` is the branch taken when the model lookup finds nothing, which says little.
`out/f2/prices-effort.txt` also holds model tables giving `claude-sonnet-5-5` and `claude-haiku-5-5`
`effort: "medium"`, of unknown use (they may be another surface's defaults). The per-model effort table could not be
read reliably from the minified strings: Anthropic's effort page answers that instead (Answer 3).

**F3, the rehearsal (free).** `BENCH_SPIKE_FAKE=1 probe.sh P1 P2 P3`, the stub replaying
`test/fixtures/sessions/completed-sonnet.jsonl`, no token: each command line as designed (P1 without `--effort`, P2
and P3 with `--effort high`; `--max-budget-usd 2.50`); a planted spent total of 5.10 USD refused P3 ("5.1750 + 2.50
USD would pass 7.50", exit 2); a fake token planted in `out/fake/P2/` was found (exit 4); an empty token file gave
"secret scan failed" (exit 3); `READ` passed the three streams through `readSession`. Output in `out/fake/`; the
console results, not kept as files, are in `out/fake/rehearsal.txt`.

**The sessions (spent).** One each, S3@1.0 step 1, baseline arm, on 2.1.300; every one `success`, `terminal_reason:
completed`, the adapter's outcome `completed`; each wrote `src/index.ts` (P2 and P3 also a test file). The secret scan
after each found the token in no file. **Spent: 0.3881 USD** of the 7.50 USD ceiling (three ledger lines).

| Session | Model | Effort | Turns | Cost (USD) | Recomputed | `costBasis` | Context | Thinking tokens | `per_turn_effort_active` |
|---|---|---|---|---|---|---|---|---|---|
| P1 | `claude-haiku-4-5` | none | 6 | 0.0318 | 0.0318 | list | 200,000 | 762 | false |
| P2 | `claude-sonnet-5-5` | `high` | 4 | 0.0970 | 0.0970 at 0.10 cache reads (0.1032 at dl-007's 0.20) | list | 1,000,000 | 1,026 | true |
| P3 | `claude-opus-5-5` | `high` | 7 | 0.2593 | 0.2593 | list | 1,000,000 | 1,804 | true |

Recomputed from `modelUsage`'s tokens at Anthropic's list prices of 2026-10-14 (input, output, cache write at 1.25×
input, cache read): every reported cost matches to the last digit.

### Answers

1. **List prices.** Claude Code 2.1.300 prices all three models at list: `costBasis: "list"`, and each cost is the
   tokens at today's list prices. For Sonnet 5.5 that is the new cache-read price, half dl-007's: any pin before
   2.1.296 — 2.1.291 (the campaign files' placeholder) and `stable` 2.1.292 included — prices Sonnet 5.5's cache reads
   at twice the list while still reporting `list`, which bug-016's check cannot see. Observed for 2.1.291: task-062's
   P6 (`spikes/task-062/out/P6/session.jsonl`) reports Sonnet 5.5's 0.0134072 USD with `costBasis: "list"`, exactly
   its tokens at 0.20 cache reads (0.0123606 at 0.10). For 2.1.292–2.1.295 it is inferred from the CHANGELOG. Filed as
   [dl-018](../decision-log/dl-018-sonnet-5-5-s-cache-reads-at-half-dl-007-s-price-and-haiku-5-5-beside-the-haiku-4-5-rung.md)
   (`pending`, on main: `6f4e567`, `dadb48e`, `a7c133f`, `32952c7`, `28c4788`), with Haiku 5.5, for the approver.
2. **Every model's tokens.** `modelUsage` holds one key per model, with every token kind, `costUSD` and `costBasis`,
   and new fields the adapter ignores harmlessly: `canonicalModel`, `provider`, `maxOutputTokens`,
   `webSearchRequests`. The three sessions called no second model, so the summing over several keys (bug-012) was not
   exercised by a real 2.1.300 session here; nor was a Haiku called for Claude Code's own work, which may now be Haiku
   5.5 (the `haiku` alias). Calibration's longer dry runs are the first to show it.
3. **Effort.** `--effort high` is accepted on Sonnet 5.5 and Opus 5.5: both sessions ended `success`, `completed`,
   with no error. `per_turn_effort_active` is not evidence of the flag: it was already `true` for both models on
   2.1.291 with no `--effort` (task-062's P6, P7), so it follows the model; P1's `false` was observed without a flag.
   As on 2.1.291, neither the stream nor `--debug`'s log (31–37 KB a session, no line naming effort) says which level
   a request carried: that the pinned level reached the request is still not observable, only accepted. Anthropic's
   effort page (`platform.claude.com/docs/en/build-with-claude/effort.md`, `out/f1/effort.md`, read 2026-10-14):
   - its list of supported models names `claude-sonnet-5-5`, `claude-opus-5-5` and `claude-haiku-5-5`, **not**
     `claude-haiku-4-5`: Haiku 4.5 takes no effort, hence `none`;
   - the defaults: `high` on Sonnet 5.5, `medium` on Opus 5.5 (and Haiku 5.5); all five levels on both 5.5 models;
   - for Sonnet 5.5 it advises starting agentic coding at `medium` for well-specified tasks and `high` for harder or
     longer ones, and running an effort sweep, since its levels are recalibrated from Sonnet 5.
4. **The adapter.** `readSession` (built `dist/`, `READ`) reads each stream as a completed step: its usage equals
   `modelUsage`'s single key, the step's `models` carry `costBasis: "list"`, the cost equals `total_cost_usd`
   (`out/P*/adapter.json`). Every field it reads on a successful session is present; the error path stays
   unverified, as after task-062.

**Indicative cost of S3 step 1, baseline:** Haiku 4.5 0.03, Sonnet 5.5 0.10, Opus 5.5 0.26 USD — one sample each,
not an estimate; Opus 5.5 at 2.7× Sonnet 5.5, with more turns and output.

### Recommended pins (for calibration to adopt with the approver)

- **`agent.version: 2.1.300`**, the exact version, in both v0.2 campaign files and the dry-run profile. Not 2.1.291
  (the placeholder) nor `stable` 2.1.292: both precede 2.1.296 and overprice Sonnet 5.5, v0.2's default model, on
  cache reads, the bulk of a run's cost. Not "latest" as a moving tag: a version that moves during calibration would
  split the dry runs from the campaign (REQ-RUN-16). A later re-pin goes through a task that re-reads the CHANGELOG.
- **`agent.effort`:** `claude-sonnet-5-5: high`, `claude-opus-5-5: high`, `claude-haiku-4-5: none` — the placeholders
  confirmed. `high` is Sonnet 5.5's default and was Sonnet 5's and Opus 5's (the effort page), so v0.2 runs at v0.1's
  nominal level, which dl-007's bridge and comparison read; for Opus 5.5 it is one level above its default
  (`medium`), stated in the method page by dl-015's C. Sonnet 5.5's levels are recalibrated, so "the same nominal
  level" is not the same thinking: the comparison with v0.1 says so. `medium`, the page's start for well-specified
  agentic coding, would be cheaper; choosing it is the approver's, with calibration's dry runs to measure either.
  `none` for Haiku 4.5, which is not among the models that take effort.
- **Watch at calibration:** which Haiku Claude Code calls for its own work (Haiku 4.5 or 5.5) in every dry run's
  `modelUsage`; the adapter's error path on 2.1.300.

### Review

- **Round 1** (independent read-only Explore subagent, on `07a6f5a`; no spending, the token file never read): nothing
  blocking. It recomputed every cost from the tokens at `out/f1/pricing.md`'s prices (all exact; 0.1032 at 0.20), the
  ledger total (2.8005), the CHANGELOG entries, dates and dist-tags, the binary's strings, the consent's reason, the
  ceiling and repeat guards, the command line against `commandLine` and the runner's environment, the token handling,
  and grepped `out/` and the script for a credential pattern (none). Findings and outcomes:
  1. should-fix — `per_turn_effort_active` cited as evidence of `--effort`; task-062 saw it `true` with no flag.
     **Fixed:** Answer 3 rests on the sessions' `success`; the column is an observation.
  2. should-fix — "Haiku 4.5 takes no effort" had no source. **Fixed:** Anthropic's effort page, whose supported
     models leave out `claude-haiku-4-5` (`out/f1/effort.md`).
  3. should-fix — the effort defaults had no source, and `out/f2/prices-effort.txt` shows tables giving Sonnet 5.5
     `medium`. **Fixed:** the defaults from the effort page; the tables named as of unknown use; the recommendation
     rests on comparability with v0.1 and dl-015, says the levels are recalibrated, and leaves `medium` to the
     approver.
  4. nit — evidence fetched outside `probe.sh` without its commands. **Fixed:** `out/f1/sources.txt` and
     `out/f2/prices-effort.command.txt`.
  5. nit — the scan ran only at a normal end. **Fixed:** an exit trap scans once a session has started; rehearsed (a
     planted token found after a later error, exit 4). It changes nothing for the three sessions, each of which
     ended normally and was scanned.
  6. nit — `spent()` counts only result events. **Not changed:** commented in the script; a session cannot be
     repeated, so an undercount cannot open a second one.
  7. nit — the rehearsal's console results were not kept. **Fixed:** `out/fake/rehearsal.txt`.
  8. nit — Haiku 5.5's over-100 K prices. **Fixed.**
  9. nit — `capLevels` read as "no effort support"; it is the unknown-model branch. **Fixed.**
  10. nit — the misprice on 2.1.291 was inferred, though task-062's P6 observes it. **Fixed:** cited here and in
      dl-018 (`28c4788`, on main).
  11. nit — two CHANGELOG entries left out (WebFetch's effort, 2.1.299; a gateway's background Haiku 4.5, 2.1.295).
      **Fixed.**
