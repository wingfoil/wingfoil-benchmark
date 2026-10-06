---
id: task-061-the-benchmark-s-images-pruned
type: task
title: "The benchmark's images pruned"
status: done
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
- **all of them, when a named benchmark container (`bench-…`) is running**: the command then refuses, naming it.
  This guard is **partial**: a campaign, a dry run or a scoring in progress holds no container between two runs, or
  between its image's build and its first container (and a harness build's `docker run --rm` has a random name), so a
  prune at that moment would remove an image the next run needs. The command is therefore run **only when nothing is
  in progress anywhere on the host**: its docstring and the README say so, and the real prune is made with the
  approver's go after checking that no session runs anything. A lock held by the runner and by `score` would close
  the gap; it touches the runner, outside this task, and is recorded as a known limit. (Docker's "created" age cannot
  stand in: an image built from cache keeps its first date — the host shows `12 days ago` for images built this
  week.)

### The port

A new `ImagePort` (`src/core/ports/images.ts`), separate from `DockerPort` so that the runner's doubles do not grow:
`list()` (reference, id, size), `containers()` (each container's name, image id and running state),
`remove(reference)` (`docker image rm <reference>`, never `--force`: Docker's own refusal stays a last
guard). `dockerImagesCli(process)` implements it; `Ports` gains an optional `images`, as it has `publish`.

### `bench images prune [--dry-run]`

A pure function, `pruneCandidates(images, used, currentScoring)`, returns the images to remove and those kept with a
reason. The command prints one line per image, `removed|would remove <reference> (<size>)` or `kept <reference>
(<reason>)`, then the count (`n images`). No total size: the tags of one build share an image, so per-line sizes
repeat (53 tags on the host, about 1.1 GB each, are a handful of image ids). A removal Docker refuses is reported
on stderr and the others go on;
the exit code is 1 if any failed. `--dry-run` removes nothing. USAGE and README's commands list it.

### Tests

- unit: `pruneCandidates` (each kind, the anchors against an ECR-like reference and `bench-spike-*`, the current
  scoring image, the id-based in-use check); the command with a fake `ImagePort` (dry run lists without removing;
  removal prints and calls `remove` for exactly the candidates; a refused removal; a running benchmark container
  refuses); the CLI `dockerImagesCli` against a fake `ProcessPort` (arguments parsed, no `--force`).
- `test:docker`: `list()` and `containers()` against the real daemon; it removes no image, and creates and removes one
  container of its own (`images-port-test-<pid>`, `--pull=never`) to cross-check the ids.
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

### Review

- **Round 1** (independent read-only Explore subagent, on the build notes' commit; no state-changing Docker command,
  no full suite): nothing blocking. It checked the anchors against the host's images (37 `dry-*`, 7 campaign, 10
  scoring; ECR, `bench-spike-*` and the rest unmatched), re-ran the `--dry-run` (53, as recorded), the id forms
  (`sha256:<64 hex>` in both `images --no-trunc` and `inspect .Image`), tags sharing an id (`image rm` without
  `--force` only untags), the parsing, the command's paths and the red-first commit. Findings and outcomes:
  1. should-fix — the "running `bench-` container" refusal does not cover a run in progress between two containers
     (after the image's build, between runs, between a scoring image's build and its container): a prune then
     removes an image the next run needs. **Fixed by documenting, not by code:** the Design names the guard partial,
     the command's docstring and README say to run it only when nothing is in progress on the host, and the real
     prune waits for the approver's go after checking no session runs anything. A lock held by the runner and by
     `score` would close the gap; it is a known limit, outside this task's scope (the runner).
  2. nit — not every benchmark container is named `bench-` (`runOnce` of a harness build or the project rules).
     **Fixed:**
     the comment and README say "named", and that such a container's image is still kept by id while it exists.
  3. nit — the Design promised a total size the code does not print, and per-tag sizes repeat. **Fixed:** the Design
     says the count only, and why; README says the size is shared by one build's tags.
  4. nit — test gaps. **Fixed:** a Docker that cannot list → `images: <reason>`, exit 1; a running container that is
     not the benchmark's does not refuse (its image kept); the Docker test now creates a container of its own from a
     tagged image and checks `containers()` names its image by the id `list()` gives (3/3), removing it after.
  5. nit (informational) — a container removed between `ps` and `inspect` makes the command fail without pruning:
     fail-safe. **Not changed**; noted here.
- **Round 2** (a new independent read-only Explore subagent, on `41024b9`): nothing blocking; it confirmed round 1's
  outcomes (the partial guard stated in the Design, the docstring and the README, and acceptable for this task's
  scope with the real prune waiting for the approver), ran the unit tests (8/8) and `tsc`, and judged the Docker
  test's own container safe on a shared host. Findings and outcomes:
  1. should-fix — the Design still named a `usedIds()` method and a read-only Docker test. **Fixed:** `containers()`,
     and the test's own container.
  2. nit — `docker create` could pull if a tag vanished meanwhile. **Fixed:** `--pull=never`.
  3. nit — a dead `<none>` filter, and a vacuous pass on a host without tagged images. **Fixed:** the first listed
     image, and `context.skip()` otherwise.
  4. nit — two new lines of this file past 120 columns. **Fixed:** re-wrapped.
- **Round 3** (a new independent read-only Explore subagent, on `0d0953b`): **clean**. It verified round 2's
  outcomes (the Design's port and test lines, `--pull=never`, `context.skip()` against vitest 5.0.1's types, the
  re-wraps), `tsc`, prettier and the unit tests (61/61). Two optional nits, **not changed**: the unreachable `return`
  after `context.skip()` (kept for the type narrowing's reader) and a short re-wrapped line.
- Final checks on `0d0953b`: `npm run lint` clean; `npm test` 80 files, 1262/1262, coverage 98.06 % statements,
  90.89 % branches; `npm run test:bin` 8/8; `npm run test:docker` 19/19 (the image port's file re-run alone at
  `0d0953b`, 3/3).
- **The real removal** (the Done's last line) is not made yet: it waits for the approver's go in chat, after a check
  that no campaign, dry run or scoring is in progress on the host (round 1, finding 1).

### Review and approval

- `npx wingfoil memory submit task-061-…` → `2e6678c`. Declared: `in-progress → in-review`, one commit. Observed: exit
  0, JSON `from`/`to` as declared, one file, `status` only. Matches.
- The approver's `memory approve task-061-… --reason "…"` → `c503bb6`, run from this worktree (`in-review →
  approved`, `Approver:`/`Reason:` trailers with the drafted reason, only `status` changed). Matches.
- **The real prune** (2026-10-06), with the approver's go in chat ("procedi col prune, nessuno sta facendo girare run
  del benchmark") and no container running on the host: `node dist/cli/main.js images prune` from this branch's
  build, exit 0, empty stderr, "removed 53 images", `bench-score:6dec5db6f4fa` kept as the current scoring image.
  Afterwards the host holds none of the benchmark's three kinds but that one. **Space measured, not assumed:**
  `docker system df` read 37.65 GB of images before and 37.6 GB after (reclaimable 12.58 → 12.1 GB). The tags
  shared a few image ids whose layers the remaining images (the current scoring image, the spikes' `bench-spike-*`)
  also use, so bug-015's "12.6 GB" — 47 tags × about 1.27 GB — counted the same layers many times. The prune removes
  what accumulates (tags, and the ids nothing else holds); the bulk of the disk is elsewhere (untagged images and
  stopped containers that are not the benchmark's, which it rightly leaves).
- Merged into main with `--no-ff` → `1a2be49`.
- `npx wingfoil memory submit task-061-…` on main → `b8f2791` (`approved → done`, one file, `status` only). Matches.
- bug-015: `fixed_by` and its Resolution committed by hand → `623efaa`; `npx wingfoil memory submit bug-015-…` → `7f15dc5`
  (`approved → fixed`, one file, `status` only). Matches; the traceability tests green.
- Worktree removed after `git status --ignored`: only `coverage/`, `dist/` and `node_modules/`, all regenerable.
