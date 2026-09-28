---
id: adr-004-w6-scoring-conventions
type: adr
title: "W6 scoring conventions"
status: approved
---

## Context

Wave W6 of release v0.1 gives the benchmark its first scores: the hidden-test oracle
([task-027](../task/task-027-hidden-test-oracle.md), F4.1), the hold-out's tests
([task-028](../task/task-028-hold-out-tests-in-scoring.md)), the cost metrics
([task-029](../task/task-029-cost-metrics.md)) and expected failures
([task-030](../task/task-030-expected-failures.md)). The requirements fix the frame — scoring in its own
container, the oracle read-only (REQ-SCO-01), `node:test` with `tsx` (REQ-SCO-02), a deterministic
`score.json` (REQ-SCO-03), suites bound to steps (dl-001, requirements 1.7) — and leave open how a
snapshot reaches the scorer, how hidden tests are counted, and what a scenario author must do for the
count to mean the same on every snapshot.

This ADR records the conventions task-027 settled, which every later scorer (task-028 to task-030, W8,
W9) and every scenario version (W7, W8) builds on. Two findings from probing Node 22.21 while
designing shape them:

- a test file whose test blocks synchronously is killed at its timeout **before its child process
  reports anything**, the tests it had registered included; `--test-only` filters tests before they are
  reported. A snapshot's own run therefore cannot say how many hidden tests there were;
- `timeout` alone does not stop a `node` blocked in a synchronous loop: it does not act on SIGTERM.

## Decision

### What a snapshot is rebuilt from

1. **Only what a run stores** (W6 plan-phase decision 5, REQ-RES-06): the scenario version's seed, the
   setup's patch and each step's patch, never the git-ignored workspace under `runs/`. Each patch runs
   **from one snapshot's tree to the next** (`git diff --binary --full-index`), so the harness's and the
   agent's own commits in between are in it (bug-007), binary files included.
2. **Checked against the run's trees.** `run.json` records the tree of the setup and of every step;
   scoring rebuilds on the host, through the git port, and stops at the first tree that differs. The
   scenario version must still have the hash the run recorded. A run stored before these records
   cannot be scored, and says so.

### Where hidden tests run

3. **The scoring image**, `docker/score-image/`: the run image's pinned `node:22-bookworm` digest,
   `tsx` pinned with its lockfile at `/opt/score`, and the benchmark's `node:test` reporter. Tagged by
   the SHA-256 of its directory: a change to any of it is a new image. `score.json` records the tag and
   the tsx version; Node is pinned by the image's base digest.
4. **One container per suite and snapshot**, with no network, the suite mounted read-only at its path
   in the scenario version, and the snapshot **copied** to the seed's path — so a hidden test's
   relative import reaches the snapshot as it reaches the seed on the author's machine. Removed
   whatever happens. Scoring installs nothing: a snapshot's dependencies are what it holds.
5. **Bounds:** `node --test --test-concurrency=1 --test-timeout=120000`, which bounds each test and each
   test file's process; the whole suite under `timeout --kill-after=10 900`.

### How hidden tests are counted

6. **A hidden test** is a leaf test (not a `describe`) of a suite's test files — `*.test.{ts,mts,cts,js,mjs,cjs}`
   — named by its file and name path. `skip` and `todo` count nowhere.
7. **The census:** every suite is run once on the scenario's **seed**, and the tests it reports are the
   suite's total. It depends only on the seed and the oracle, both fixed by the scenario's hash, so it is
   the same for every run and snapshot of a version, and is taken once per `bench score`.
8. **On a snapshot**, the passed tests are the census tests reported passing; **every other census
   test fails** — failed, timed out, or never reported because its file was killed.
9. **Oracle errors are not zeros.** A census file that fails to load, two hidden tests with one name, or
   a snapshot reporting a test the census lacks stop the scoring of that scenario version with a message
   naming the suite, never a result.

### What a scenario author must do (W7, W8)

10. **A hidden test imports the code under test inside the test** (`await import(…)`), never at the top
    of its file; its top-level imports are Node's and the oracle's own. Tests are registered
    unconditionally, with unique names, and the seed must not hang them. Then a snapshot that lacks the
    code, or does not compile, fails each test and never the file, and the census is complete.

### What is scored, and how it is stored

11. **Per step**, the suites bound to it (`after_steps`); **the final snapshot** — the last step's, when
    the run completed — against every suite. A step the run never reached, and the final snapshot of a
    run that did not complete, are `not_reached`, with no value.
12. **`score.json`, version 1:** no timestamp; M-Q1 as its two integers, the ratio left to aggregation;
    the failing tests of public suites listed, sorted; `score_version` rises when a rule changes, not
    when a key is added. `bench score` scores a dry run the same way.

## Consequences

- **W7 and W8 (scenario authoring):** decision 10 is a rule of every S-scenario's oracle; S1's
  third-party suite (dl-002) is loaded by tests written that way. A seed that needs dependencies to run
  its tests needs a way to get them without a network, decided when one does.
- **W7 (aggregation, F5.1):** decides how `not_reached` counts — as a loss, like an expected failure.
- **task-028** runs hold-out suites the same way, with a census of their own, and keeps their failing
  tests out of every published file.
- **W11 (F5.8):** the method page states decisions 6 to 9 and 11: how M-Q1 is counted and what a
  snapshot that did not load or was killed scores.
- **Cost:** one container per suite and snapshot, plus a census per suite; for S1's four steps and three
  suites that is about a dozen containers per run, each a few seconds.

## Amendment 1 (W6 task-028, 2026-09-28)

What [task-028](../task/task-028-hold-out-tests-in-scoring.md) added for the hold-out (F3.5,
REQ-SCO-09), which scenario authors writing the private `WingFoil2-Benchmark-HoldOut` repository in W7
and W8 must follow:

13. **A hold-out suite** is a suite's additions, under `<suite-id>/` in the hold-out (dl-001). It runs
    like a public suite — decisions 3 to 9 — in **containers of its own**, never with the public suite,
    with a census of its own on the seed.
14. **Where it sits:** mounted read-only at `<suite dir>.holdout/`, **beside** the public suite, which is
    mounted too. A hold-out test is written as a sibling of the public suite's files: the same relative
    import of the code under test, and the public suite's helpers at `../<suite dir name>/`.
15. **Counts only.** `score.json` keeps the hold-out under `holdout`, apart from the public results, with
    its additions' hash (task-018's rule) and each suite's `passed` and `total` — no failing tests. No
    hold-out test name, message or container output is printed or stored; an oracle error names the
    suite and at most the file.
16. **Not scored, said.** Without a hold-out, `holdout` is `{ scored: false, reason }` — `not configured`,
    or `none declared` for a version that declares none — and the command line says `hold-out not
    scored` for a version that expects one. A version whose `holdout:` disagrees with the additions is
    not scored.
