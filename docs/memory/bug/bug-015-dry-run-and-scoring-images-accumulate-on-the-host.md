---
id: bug-015-dry-run-and-scoring-images-accumulate-on-the-host
type: bug
title: "Dry-run and scoring images accumulate on the host"
status: approved
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

<!-- Filled when fixed: the task, the commit, and how it was verified. -->
