---
id: task-064-harness-artifacts-and-arm-digests
type: task
title: "Harness artifacts and arm digests"
status: in-progress
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
- No npm or Python builder is added here: Spec Kit's comes with its arm (task-066), OpenSpec's in W13. REQ-RUN-14 is
  left as it reads: it already applies to WingFoil only.

### Arm digests (REQ-FMT-13, REQ-FMT-01 as amended)

- `armDigest(repoRoot, arm)` in `src/arms/`: every regular file under `arms/<arm>/`, recursively, as repository paths
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
and the pack goes on with the others; an execution without harness runs packs no second asset.

### The run image (REQ-RUN-01 as amended)

`node:22-bookworm` at its pinned digest already holds **Python 3.11.2** (`python3 --version` in that image,
2026-10-06). The Dockerfile adds **uv 0.12.23** with `COPY --from=ghcr.io/astral-sh/uv:0.12.23@sha256:61d393e4…`
(resolved with `docker buildx imagetools inspect` on 2026-10-06) into `/usr/local/bin/`, and states both versions.
The Docker suite checks `python3 --version` and `uv --version` in the built image.

### Tests

- unit: `requiredScenarios`; `armDigest` (order, nested files, a changed file, a symlink refused as the arm loader
  refuses it); the schema's `arm_digests` (12 hex, every arm, no other); `checkCampaign`'s mismatch; the cache path,
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
  this task, red-first; task-064, task-066 and task-067 list their scenarios.
