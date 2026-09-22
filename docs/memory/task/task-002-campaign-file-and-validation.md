---
id: task-002-campaign-file-and-validation
type: task
title: "Campaign file and validation"
status: backlog
release: v0.1
wave: W1
features: [F1.1]
acceptance: [campaign.feature]
requirements: [REQ-FMT-01, REQ-FMT-02, REQ-FMT-03, REQ-CLI-01, REQ-RUN-16, REQ-ARC-03, REQ-ARC-05, REQ-NFR-04]
---

## Context

Second task of wave **W1 — Skeleton** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It
depends on task-001 (package and scenario loader).

Scope of F1.1: the Zod schema of `campaigns/<name>.yaml` (REQ-FMT-01, including the mandatory
baseline arm and the Opus comparison slices), campaign identity as the first 12 hex characters of the
SHA-256 of the canonical JSON (REQ-FMT-02), the execution numbering `<campaign-id>/<n>`, refusal of
unpinned harness versions (REQ-FMT-03), a pinned `agent.version` (REQ-RUN-16), and the first command,
`bench campaign validate <file>` (REQ-CLI-01), with exit codes 0 / 1 / 2. The `cli` and `campaign`
modules are created here and added to `.wingfoil/dna.yaml` (REQ-ARC-05).

Validation also checks that every scenario the campaign names exists and loads (task-001).

Out of scope: the `Background` of `campaign.feature` (recorded dry-run costs) serves F1.2 and F1.3
(W5), not F1.1. The third F1.1 scenario ("the same campaign file identifies the same campaign … as a
new execution") is covered here at the level of identity and execution numbering. Its end-to-end form,
with stored results, is checked by task-003.

**Done** means: `bench campaign validate` accepts the example campaign of `campaign.feature` and
prints its identity; it rejects an unpinned harness naming the arm and the field; tests, coverage and
lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `campaign.feature` @F1.1 "A campaign file pins every variable" — accepted, identified by a digest of
  its content. **red-first**
- `campaign.feature` @F1.1 @error "A campaign with an unpinned harness is rejected" — the message names
  the arm and the unpinned field. **red-first**
- `campaign.feature` @F1.1 "The same campaign file identifies the same campaign" — identity is stable
  under key reordering and formatting (canonical JSON); the next execution number follows the ones
  already stored. **red-first**
- REQ-FMT-01 error path — a campaign without the baseline arm is rejected. **red-first**
- REQ-FMT-03 — `latest` and branch names are rejected; released versions and commit SHAs are accepted.
  **red-first**
- REQ-CLI-01 — exit 0 on a valid file, 1 on an invalid one, 2 on a usage error. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `742654a`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W1 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-002-campaign-file-and-validation` → `2d88edd`. Declared: `draft → pending`, required fields checked,
  one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty stderr, 1 file,
  diff limited to `status: draft` → `status: pending`. Matches (subject without transition: N9).
