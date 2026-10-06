---
id: bug-015-dry-run-and-scoring-images-accumulate-on-the-host
type: bug
title: "Dry-run and scoring images accumulate on the host"
status: fixed
fixed_by: task-061-the-benchmark-s-images-pruned
---

## Context

task-021's known limits noted that dry-run images (`dry-<hex>`) are never removed. The release retrospective counted
them on the maintainer's host on 2026-10-05.

## Expected

The images the benchmark builds are removed when nothing needs them, or a command lists and removes them.

## Actual

The host held 37 `dry-*` images and 10 `bench-score:*` images, about 1.27 GB each: 12.6 GB reclaimable. Every dry
run, campaign and scoring-image change adds more, and nothing removes them.

## Evidence

task-021 Known limits; `docker images` on 2026-10-05 (release retrospective).

## Suggested handling

`bench images prune` (or a flag of `campaign run` and `scenario dry-run`), removing the benchmark's images that are
not the current scoring image and not in use, and printing what it removed. Never removing an image the benchmark
did not build.

## Resolution

Fixed by [task-061](../task/task-061-the-benchmark-s-images-pruned.md) (merged in `1a2be49`): `bench images prune
[--dry-run]` removes the benchmark's own images (`dry-<12 hex>:latest`, `<12 hex>:latest`, `bench-score:<12 hex>`,
by anchored reference) that no container uses and that are not the current scoring image, and refuses while a named
benchmark container runs; it is run only when nothing is in progress on the host. Verified by unit tests with a fake
image port, a Docker test against the daemon, and the real prune of 2026-10-06: 53 tags removed. The space freed was
small: the tags shared their layers, and "12.6 GB" above summed per-tag sizes (task-061 Execution notes).
