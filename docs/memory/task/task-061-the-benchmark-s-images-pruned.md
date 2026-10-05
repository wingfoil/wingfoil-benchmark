---
id: task-061-the-benchmark-s-images-pruned
type: task
title: "The benchmark's images pruned"
status: draft
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-RUN-01]
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

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "The benchmark's images pruned"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-061-the-benchmark-s-images-pruned`, `status: draft`.
