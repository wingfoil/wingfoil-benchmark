---
id: task-158-requirements-1.60-what-task-157-changed-in-the-dry-run-the-registry-pins-and-the-seed
type: task
title: "Requirements 1.60: what task-157 changed in the dry run, the registry pins and the seed"
status: backlog
release: v0.3
wave: publishing
features: [F3.3, F7.4]
acceptance: []
requirements: [REQ-CLI-05, REQ-FMT-04, REQ-FMT-11, REQ-FMT-12]
fixes: []
tags: ["v0.3","spec"]
---

## Context

Task-157 (bug-033) changed four behaviours that `docs/02_specification/requirements.md` 1.59 does not state. None
contradicts a requirement, but a reader of the specification cannot learn them there. Its independent review raised
this, and the approver asked for this task on 2026-11-18.

**Done** means requirements 1.60 states what the code does, and no code changes.

## Acceptance criteria

<!-- A specification change: no code, no Gherkin scenario and no red test. Each amendment is checked against the code. -->

1. **REQ-CLI-05, amended in 1.60:**
   - a dry run refuses a registry tool's pin that cannot be fetched, as `validate` does (REQ-FMT-12);
   - a dry run on a harness version the register does not admit still runs, and prints what a campaign would be refused
     for, because dry runs are how a version is studied before it is assessed (REQ-FMT-11);
   - when the latest dry run of its key does not count, the dry run says why, also when an older one still counts.
2. **REQ-FMT-11, amended in 1.60:** the refusal it states is a campaign's. A dry run only notes it (REQ-CLI-05).
3. **REQ-FMT-12, amended in 1.60:** a tool fetched from the npm registry is pinned by a released version and no commit,
   and `validate` and the dry run refuse any other pin before an image is built.
4. **REQ-FMT-04, amended in 1.60:** a scenario's seed holds at least one file a commit can record. The validator refuses
   one that holds none, and a run refuses a seed whose every file git ignores, in the benchmark's words.
5. **The document:** its version becomes 1.60 and its date the day of the change. Each amendment is written as
   `**Amended in 1.60 (v0.3, task-157, bug-033):**`, as the earlier ones are.
6. **Checks:** every amendment read against `src/`, `scripts/pre-review.sh main`, an independent read-only review
   (dl-020), and the full suites on the approver's go.

## Design

- **Only the specification changes.** If an amendment turns out not to match the code, the code's behaviour is reported
  to the approver and is not changed here.
- **No spending:** no agent runs, and no campaign or dry run is launched.

## Execution notes
