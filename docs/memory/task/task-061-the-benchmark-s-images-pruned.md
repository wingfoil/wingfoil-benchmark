---
id: task-061-the-benchmark-s-images-pruned
type: task
title: "The benchmark's images pruned"
status: in-progress
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-RUN-01]
fixes: [bug-015-dry-run-and-scoring-images-accumulate-on-the-host]
---

## Context

Fixes [bug-015](../bug/bug-015-dry-run-and-scoring-images-accumulate-on-the-host.md), planned in W12 at
[rel-v0-2](../release/rel-v0-2.md)'s triage. 47 benchmark images, 12.6 GB, were left on the host after v0.1; v0.2's seven arms build more.

**Scope:** a command, `bench images prune`, removes the images the benchmark built (`dry-*`, campaign images,
`bench-score:*` other than the current scoring image) that no container uses, and prints what it removed. It never
removes an image the benchmark did not build. A `--dry-run` lists without removing.

**No real agent, no spending.** **Done** means: tests against the Docker port's fake; one real prune on the host,
recorded.

## Acceptance criteria

- `bench images prune --dry-run` lists only the benchmark's own images and never the current scoring image.
  **Red-first.**
- Without `--dry-run` it removes them and prints what it removed. **Red-first.**

## Design

Fixes bug-015 (`fixes` above). REQ-RUN-01 (one image per campaign) is the nearest requirement; no requirement or
scenario is amended: the command is housekeeping, outside the benchmark's measured behaviour.

### Classification of the acceptance criteria

Both **red-first**: the command does not exist on `main` (`bench images` is a usage error).

### Which images are the benchmark's

By full reference, anchored, as the benchmark tags them:

| Kind | Reference | Built by |
|---|---|---|
| dry run | `dry-<12 hex>:latest` | `runPlan` for `scenario dry-run` (`src/runner/dry-run.ts`) |
| campaign | `<12 hex>:latest` | `runPlan` for `campaign run` (the campaign id) |
| scoring | `bench-score:<12 hex>` | `bench score` (`src/scoring/image.ts`) |

Anything else is never touched. On the maintainer's host on 2026-10-06 this matters: `<12 hex>.dkr.ecr.…` images
start like a campaign id and must not match, and the spikes' `bench-spike-*` images stay (they are not the runner's
and are few). Of the benchmark's, three are kept:

- the **current scoring image** (`scoringImage()`'s tag for this checkout);
- every image **used by a container**, in any state, compared by image id (`docker inspect` of every container's
  `.Image`), since `docker ps` shows an id instead of a name once an image is re-tagged;
- **all of them, when a benchmark container is running**: a campaign or dry run in progress creates a container
  per run from its image, and between two runs no container holds it. The command then refuses, naming the running
  container, rather than guess. (Docker's "created" age cannot stand in: an image built from cache keeps its first
  date — the host shows `12 days ago` for images built this week.)

### The port

A new `ImagePort` (`src/core/ports/images.ts`), separate from `DockerPort` so that the runner's doubles do not grow:
`list()` (reference, id, size), `usedIds()` (the image id of every container, and whether a benchmark container is
running), `remove(reference)` (`docker image rm <reference>`, never `--force`: Docker's own refusal stays a last
guard). `dockerImagesCli(process)` implements it; `Ports` gains an optional `images`, as it has `publish`.

### `bench images prune [--dry-run]`

A pure function, `pruneCandidates(images, used, currentScoring)`, returns the images to remove and those kept with a
reason. The command prints one line per image, `removed|would remove <reference> (<size>)` or `kept <reference>
(<reason>)`, then a total (`n images, <size>`). A removal Docker refuses is reported on stderr and the others go on;
the exit code is 1 if any failed. `--dry-run` removes nothing. USAGE and README's commands list it.

### Tests

- unit: `pruneCandidates` (each kind, the anchors against an ECR-like reference and `bench-spike-*`, the current
  scoring image, the id-based in-use check); the command with a fake `ImagePort` (dry run lists without removing;
  removal prints and calls `remove` for exactly the candidates; a refused removal; a running benchmark container
  refuses); the CLI `dockerImagesCli` against a fake `ProcessPort` (arguments parsed, no `--force`).
- `test:docker`: `list()` and `usedIds()` against the real daemon, read-only.
- **The real prune on the host**, the Done's last line: `--dry-run` first, recorded; the removal itself only with
  the approver's go in chat, since it deletes about 12 GB that other sessions' dry runs may still read.

## Execution notes

- `npx wingfoil memory add --type task --title "The benchmark's images pruned"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-061-the-benchmark-s-images-pruned`, `status: draft`.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-061-…` → `9f50872`, in the linked worktree
  `WingFoil2-Benchmark-task-061` with its own `npm ci`. Declared: `backlog → in-progress`, one commit. Observed:
  exit 0, JSON `from`/`to` as declared, one file, `status` only. Matches.

### Build

1. `c1bb7ac` `test(cli, ports)`: the port's and the command's tests, written first and red (`dockerImagesCli is
   not a function`; `Cannot find module '…/src/cli/images.js'`).
2. `7abc65a` `feat(cli)`: `src/core/ports/images.ts` (`ImagePort`, `dockerImagesCli`), `src/cli/images.ts`
   (`pruneCandidates`, `imagesCommand`), `main`'s dispatch, `Ports.images`, USAGE (the two exact-usage tests, unit and
   bin, gain its line), README, and `test/docker/images.test.ts` (read-only against the daemon, 2/2).
3. **The real prune on the host, `--dry-run`** (2026-10-06, built `dist/` of this branch): exit 0; would remove 53
   images — 37 `dry-*`, 7 campaign images, 9 old `bench-score:*` — and keeps `bench-score:6dec5db6f4fa`, the current
   scoring image. No other image is listed (the host's `<12 hex>.dkr.ecr.…`, `bench-spike-*`, `busybox` … are
   left alone, as the Design's anchors say). The removal itself waits for the approver's go (it deletes the
   images other sessions' dry runs may still read).
