---
id: F-004
title: "No documented way to use an unpublished build pinned to a commit"
kind: gap
status: open
wingfoil_version: 0.1.0-7a65580
answered_by: []
---

Formerly N4.

## Observed

A project that wants a WingFoil commit not yet on npm has to find the steps itself: `git archive <sha>`,
`npm ci`, `npm pack`, the tarball as a `file:` devDependency, then `npx wingfoil`. A machine may also hold an
unrelated `wingfoil` binary on `PATH`, so a bare `wingfoil` silently runs another tool. `wingfoil --version` names
no commit (`0.1.0` on a build of `7a65580`).

## Expected

The user docs say how to pin and run an unpublished build, and `--version` names the commit a build was made
from. Later builds print the commit (`0.2.2 (<sha>…)` for a build from source).
