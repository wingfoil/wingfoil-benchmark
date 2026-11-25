---
id: task-181-an-external-evidence-page-on-the-site-from-a-register-of-sources-with-their-grades-and-a-verification-date
type: task
title: "An external-evidence page on the site, from a register of sources with their grades and a verification date"
status: pending
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-RES-09, REQ-RES-02, REQ-NFR-05]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["site","results","v0.4"]
---

## Context

[plan-006](../../plans/plan-006-release-v0.4.md)'s external-benchmarks triage (the approver, 2026-11-25), row 9: the
site gains a page of external evidence, apart from the results, as soon as possible, since it costs little. The
sources are those of [X_external-benchmarks-2026-11-25.md](../../01_vision/X_external-benchmarks-2026-11-25.md). An
external figure is context and a source of hypotheses, never a result: the page says so, and no results page reads
the register.

**Done** means: the site builds a page listing each external source with who ran it, its date, its grade (A–D, as the
vision note defines them), what it measured, the figures cited with their marks, and the date the figure was last
verified at its primary source; the page is linked from the method page and kept apart from every result.

## Acceptance criteria

1. A register under `eligibility/` or `site-content/` (its place decided in the Design, next to
   `eligibility/register.yaml`): one entry per source with name, URL, kind, date, who ran it, grade, the figures it
   gives and, for each figure, `verified: <date>` or `unverified` (red-first: a loader test refuses an entry without a
   grade or a figure without its verification state).
2. Only verified figures are rendered as figures; an unverified one is rendered as "not yet verified", never as a
   number (red-first).
3. `bench site build` writes the page deterministically (REQ-NFR-05), linked from the method page, with the statement
   that the figures are not the benchmark's results (red-first: a site test).
4. The register's first content: the sources of the vision note, with every figure `unverified` until it is re-read
   at its primary source; verifying them is not part of this task.
5. Checks: `scripts/pre-review.sh main`, the site and docs tests, the full suites on the approver's go; an independent
   review (dl-020).

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
