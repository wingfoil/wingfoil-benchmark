---
id: task-064-harness-artifacts-and-arm-digests
type: task
title: "Harness artifacts and arm digests"
status: in-review
release: v0.2
wave: W12
features: [F7.1, F7.2]
acceptance:
  - "competitors.feature#A harness artifact that does not match its recorded digest is refused"
  - "competitors.feature#A campaign file whose pinned arm digest no longer matches the arm is refused"
requirements: [REQ-FMT-01, REQ-FMT-06, REQ-FMT-12, REQ-FMT-13, REQ-RUN-01, REQ-RUN-14, REQ-CLI-11]
---

## Context

The groundwork every competitor arm needs ([rel-v0-2](../release/rel-v0-2.md), W12), before the Spec Kit arm:

- **harness artifacts** (REQ-FMT-12): every pinned harness built or fetched once into `.cache/harnesses/`, its
  digest recorded in `run.json` (`harness.artifact_sha256`), attached to the release by `transcripts pack`
  (REQ-CLI-11), licences included; REQ-RUN-14 scoped to WingFoil;
- **arm digests** (REQ-FMT-13) and `arm_digests` in the campaign file (REQ-FMT-01), recorded in `run.json`;
- **the run image** gains Python ≥ 3.11 and `uv` (REQ-RUN-01).

**No real agent, no spending.** **Done** means: the error scenarios of `competitors.feature` on artifacts and arm
digests green; v0.1's campaign files still validate.

## Acceptance criteria

- `competitors.feature`: an artifact that does not match its digest is refused; a campaign file whose pinned arm
  digest no longer matches is refused. **Red-first.**
- A v0.1 campaign file without `arm_digests` validates as before. **Characterization.**

## Design

### Traceability per scenario (the approver's choice, 2026-10-06)

`features: [F7.1, F7.2]` stays: the task serves both. Its `acceptance` names the two scenarios it delivers, as
`<file>#<scenario title>`. `test/support/traceability.ts` gains `requiredScenarios(taskDir, scenarios)`: for each
started task, the scenarios its `acceptance` names by `#`, or — when it names none — every scenario of its features,
as today. The traceability test requires those. A named scenario that does not exist is itself a failure, so a
renamed scenario cannot silently drop out. Red-first: a unit test on a temporary task directory.

### Classification of the acceptance criteria

- `competitors.feature#A harness artifact that does not match its recorded digest is refused` — **red-first**: today a
  tampered cached artifact is silently rebuilt.
- `competitors.feature#A campaign file whose pinned arm digest no longer matches the arm is refused` — **red-first**:
  `arm_digests` does not exist.
- A v0.1 campaign file without `arm_digests` validates as before — **characterization** (`campaigns/v0-1-*.yaml`).

### Harness artifacts (REQ-FMT-12, REQ-FMT-06, REQ-RUN-14 as amended)

- The cache moves to `.cache/harnesses/<tool>/<commit>/`, the path REQ-FMT-12 names (the old `.cache/harness/` is not
  read: a first build after the change rebuilds once).
- **A cached artifact whose bytes no longer match the digest in its `harness.json` is refused**, before any run
  starts, naming the artifact: `the cached harness artifact .cache/harnesses/wingfoil/<commit>/installed.tgz no
  longer matches its recorded digest: remove .cache/harnesses/wingfoil/<commit>/ to rebuild it`. Today it is
  rebuilt silently, which would also hide a tampered artifact. A missing or unreadable `harness.json` still means
  "not built", and builds.
- `run.json`'s `harness` gains `artifact_sha256`, the digest of the artifact the run installed (for WingFoil the
  existing `installed_sha256`, kept under both names, as REQ-FMT-06 says).
- `harness.json` also records the package's file name (`tarball`), so that exactly that file is checked; a cached
  file that is missing — the installed artifact or that package — is refused as a changed one is; only a missing or
  unreadable `harness.json` means "not built" (review rounds 1 and 2).
- No npm or Python builder is added here: Spec Kit's comes with its arm (task-066), OpenSpec's in W13. REQ-RUN-14 is
  left as it reads: it already applies to WingFoil only.

### Arm digests (REQ-FMT-13, REQ-FMT-01 as amended)

- `armDigest(repoRoot, arm)` in `src/arms/`: every entry under `arms/<arm>/`, recursively (a file by its content, a
  symbolic link by its target, a FIFO or a device by its kind, never read; review round 1), as repository paths
  (`arms/<arm>/<file>`), sorted, each line `<path>\0<sha256 of its content>\n`, and the SHA-256 of those lines (64
  hex). A docs control's borrowed manual (REQ-RUN-11) is added by the task that makes docs controls borrow it
  (task-067): today `baseline-docs` has its own manual, which its own files already cover.
- The campaign schema gains an optional `arm_digests: arm → 12 hex`. Absent, the campaign reads as before (v0.1's
  files). Present, it must name every arm and no other (`campaignConsistency`), and `checkCampaign` recomputes each
  digest and refuses a mismatch naming the arm: `arm_digests.<arm>: is <pinned>, but the arm's files digest to
  <actual>: the arm changed since the campaign pinned it`. The id already hashes the raw file, so pinned digests
  change the campaign's identity (REQ-FMT-02) with no code.
- `run.json` records `arm_digest` (64 hex), every run, every arm.

### `bench transcripts pack` (REQ-CLI-11 as amended)

It also packs, as `releases/<release>/harnesses.tar.gz`, the cached artifacts of every harness the execution's runs
record (`harness.tool` and `commit`): each `installed.tgz` and the tool's own package, under `<tool>/<commit>/`,
reproducibly (the same tar flags as the transcripts), with their licences inside unchanged. It prints the archive and
its digest, and the `gh release create` command attaches both assets. An artifact missing from the cache is named,
and the pack goes on with the others; an execution without harness runs packs no second asset. Each packed file is
checked against the digests the runs recorded: a mismatch, runs that disagree, or a run without digests refuse the
whole pack, which then writes nothing; the second archive is built aside before any record is written and renamed in
place last, with the first; an earlier pack's `harnesses.tar.gz` is removed when there is none (review rounds 1 and
2).

### The run image (REQ-RUN-01 as amended)

`node:22-bookworm` at its pinned digest already holds **Python 3.11.2** (`python3 --version` in that image,
2026-10-06). The Dockerfile adds **uv 0.12.23** with `COPY --from=ghcr.io/astral-sh/uv:0.12.23@sha256:61d393e4…`
(resolved with `docker buildx imagetools inspect` on 2026-10-06) into `/usr/local/bin/`, and states both versions.
The Docker suite checks `python3 --version` and `uv --version` in the built image.

### Tests

- unit: `requiredScenarios`; `armDigest` (order, nested files, a changed file, a symlink hashed by its target); the
  schema's `arm_digests` (12 hex, every arm, no other); `checkCampaign`'s mismatch; the cache path,
  the tampered artifact's refusal, `artifact_sha256` and `arm_digest` in `run.json`; the pack's second asset;
- acceptance: the two scenarios, and v0.1's campaign files validating;
- `test:bin`, `test:docker` (the image changes).

## Execution notes

- `npx wingfoil memory add --type task --title "Harness artifacts and arm digests"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-064-harness-artifacts-and-arm-digests`, `status: draft`.
- **Decision before the design phase (the approver in chat, 2026-10-06):** traceability per scenario. The acceptance
  traceability test reads features at feature granularity, so a task in progress on F7.1 or F7.2 would need a test
  for every @F7.1/@F7.2 scenario of `competitors.feature`, most of them other tasks' (task-066, task-067, W13). Chosen
  ("Per scenario"): a task may list in `acceptance` the scenarios it delivers, as `competitors.feature#<title>`; the
  test then requires those, and every scenario of a feature only for a task that declares the feature whole. Done in
  this task, red-first; task-064 lists its two scenarios; task-066 and task-067 will each list their own in their design
  phase.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-064-…`, in the linked worktree `WingFoil2-Benchmark-task-064` with its own `npm
  ci`. Declared: `backlog → in-progress`, one commit. Observed: exit 0, JSON `from`/`to` as declared, one file,
  `status` only. Matches.

### Build

1. `786b28f` `test(traceability)`: `requiredScenarios` and its four unit tests, red first (`requiredScenarios is not a
   function`); with it, the repository test required exactly this task's two scenarios.
2. The two acceptance tests and the v0.1 characterization (`test(competitors)`), red first: `ENOENT …
   .cache/harnesses/…/installed.tgz` (the old cache path) and `armDigest is not a function`; v0.1's campaign files
   already valid.
3. `8938305` `feat(runner, arms, core)`: the cache under `.cache/harnesses/`, a tampered artifact (the package or the
   installed one) refused naming it, an unreadable `harness.json` rebuilt; `artifact_sha256` and `arm_digest` in
   `run.json`, the digests taken once before the execution's first run; `armDigest` (its unit tests came with it);
   `arm_digests` in the schema, `campaignConsistency` and `checkCampaign`. The harness unit test "rebuilds one that does
   not" became "refuses one that does not, naming it", the behaviour the scenario asks for.
4. `c5cd188` `feat(results, docker)`: `harnesses.tar.gz` (tests first, red: 2 failed), the CLI's `harnesses:` line, a
   missing artifact named, and the `gh release create` command attaching both assets; `uv` 0.12.23 copied into the run
   image at its pinned digest; `test/docker/run-image.test.ts` checks `python3`, `uv`, `git` and `node` in the built
   image (passed alone).
5. `7bd01de` README: `arm_digests` under `validate`, the second asset under `transcripts pack`; `7fb0cdc` an unused
   binding removed from a new test (lint); `54fd606` these notes. Review round 1's fixes: `46bf6cc`.

### Review

- **Round 1** (independent read-only Explore subagent, on `54fd606`; targeted tests only): nothing blocking. It read
  every removed line of the branch (only the intended path change and the rebuild-to-refusal test), ran five test
  files (144/144), `tsc` and eslint, and checked traceability's semantics, the cache, the digests, the pack and the
  image. Findings and outcomes:
  1. should-fix — a failing `harnesses.tar.gz` came after the records and the transcripts archive were in place,
     against the module's "a pack either completes or changes nothing". **Fixed:** the harness archive is built aside
     before any record is written; a failure undoes everything; both archives are renamed in place last.
  2. should-fix — the pack published whatever the cache held, unchecked against what the runs installed. **Fixed:**
     each packed file is checked against the runs' `installed_sha256` and `tarball_sha256`, and a mismatch refuses the
     pack naming the file, writing nothing; the test's records carry real digests.
  3. should-fix — the package in the cache was found by guess (the first `*.tgz`), so a deleted package went
     unchecked and a stray `.tgz` could fail a good cache. **Fixed:** `harness.json` records the package's file name
     (`tarball`); exactly that file is checked, and a missing one is refused as tampered.
  4. nit — the Design said a symbolic link in an arm is refused; the digest hashes its target. **Kept, and stated** in
     the code: the digest has no channel for a refusal, and the arm loader refuses links where it reads. A FIFO or a
     device is now hashed by its kind, never read.
  5. nit — the sort order was unstated. **Fixed** in the doc comment (code-unit order, locale-independent).
  6. nit — the notes said task-066 and task-067 list their scenarios; they do not yet. **Corrected:** each lists its
     own scenarios in its design phase, as this task did.
  7. nit — the traceability support code parsed task front matter twice. **Fixed:** one `startedTasks` reader.
  8. nit — a fallback that could not fall through, and a comment placed after the build it said it preceded.
     **Fixed.**
  9. nit — a stale `harnesses.tar.gz` stayed when a re-pack had none. **Fixed:** it is removed (a test).
  10. nit — `HARNESS_CACHE` defined in runner and results, and an ambiguous Dockerfile comment. The constant **stays
      twice**: `results` may not import `runner` (REQ-ARC-01); the comment is **fixed**.
  Not tested: a `tar` failure on the second asset alone (the system tar cannot be made to fail there without failing
  the first); its path is the same `undo` the transcripts' failure takes.
- **Round 2** (a new independent read-only Explore subagent, on `46bf6cc`): nothing blocking. It verified every
  removed line of `46bf6cc` (each replaced, none lost), five test files (59/59), `tsc`, eslint and prettier, and each
  round-1 outcome but two. Findings and outcomes:
  1. should-fix — a deleted `installed.tgz` was still rebuilt silently, against the new doc comment. **Fixed:** only
     a missing `harness.json` means "not built"; a missing installed artifact is refused like the package (a test).
  2. should-fix — the Build notes still said task-066 and task-067 list their scenarios. **Fixed.**
  3. should-fix — the Design did not say what review round 1 changed (links and special files in the digest, the
     package's name, the pack's checks and atomicity). **Fixed** in the four places.
  4. nit — runs recording one harness with different digests, or none, went unchecked. **Fixed:** both refuse the
     pack, naming the directory (a test for each).
  5. nit — an exception inside the harness pack skipped `undo`. **Fixed:** caught, reported, undone.
  6. nit — the Build notes lacked three commits. **Fixed.**
- **Round 3** (a new independent read-only Explore subagent, on `b382283`): **clean**. It verified round 2's outcomes
  (including the rebuild of an interrupted build: no `harness.json`, written last, means not built), every removed
  line, the two touched test files (25/25), `tsc`, eslint and prettier. Two nits, **not changed**: one run with digests
  and another without read as "different digests" rather than "without its digests" (refused either way), and a
  doc-comment line past the print width.
- Final checks on `b382283`: `npm run lint` clean; `npm test` 84 files, 1304/1304, coverage 98.05 % statements,
  90.86 % branches; `npm run test:bin` 8/8; `npm run test:docker`: a first run 19/20, the new run-image test failing
  once with an error the summary did not keep; that test alone passed, and a second full run passed 20/20. Recorded as
  an intermittent failure under concurrent Docker builds, cause not established: if it recurs, its output is to be
  kept and the test hardened.

### Review and approval

- `npx wingfoil memory submit task-064-…` → `b4cf822`. Declared: `in-progress → in-review`, one commit. Observed: exit
  0, JSON `from`/`to` as declared, one file, `status` only. Matches.
