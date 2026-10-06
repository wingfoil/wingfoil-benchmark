---
id: bug-017-the-image-prune-fails-when-a-container-disappears-while-it-reads-containers
type: bug
title: "The image prune fails when a container disappears while it reads containers"
status: draft
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
---

## Context

Found by task-067's `test:docker` run on 2026-10-06, while other docker tests of the same suite created and removed
containers: `test/docker/images.test.ts` ("names a container's image by the same id list() gives it") failed once.

## Expected

`bench images prune` (task-061, bug-015) reads the host's containers to keep every image one of them uses. A
container removed between the listing and the reading is no longer there to keep anything: the prune goes on with
the containers that still exist.

## Actual

`dockerImagesCli().containers()` (`src/core/ports/images.ts`) lists every container id with `docker ps --all
--quiet`, then reads them all in one `docker inspect`. If one of them is removed in between, `docker inspect` exits 1
(`error: no such object: <id>`) and the port throws: `bench images prune` — dry run included — fails with that error,
whenever a run, a dry run or a scoring container on the host is removed at that moment.

## Evidence

The task-067 suite output: `Error: docker inspect --format {{.Name}}\t{{.Image}}\t{{.State.Running}} <11 ids> failed
with code 1: error: no such object: 8199161d…`, at `src/core/ports/images.ts:57` via `test/docker/images.test.ts:46`.
Intermittent: the same test passed in task-061's and task-066's runs.

## Suggested handling

Read containers in a way a removal cannot fail: one `docker ps --all --no-trunc --format` listing with the image id is
not enough (it gives the image by name), so either inspect each id on its own and skip one that is gone, or retry the
whole read once when `inspect` reports a missing object. A unit test with a process double whose `inspect` reports a
missing id holds it.
