---
id: task-085-profile-pages-and-stable-urls
type: task
title: "Profile pages and stable URLs"
status: backlog
release: v0.2
wave: W14
features: [F5.7]
acceptance:
  - "comparison.feature#A result profile filters the landing page"
  - "comparison.feature#A published link keeps showing the same values"
requirements: [REQ-RES-08, REQ-RES-02, REQ-RES-04]
fixes: []
---

## Context

F5.7, for Dana (the adoption decider, persona 2), served from this release.

**Scope:**
- REQ-RES-08: `site-content/profiles.yaml`, copied and versioned from `docs/01_vision/04_personas.md` §2; for each
  profile, `profile-<profile>.html`: the landing page restricted to its categories, with a headline generated over
  them only; no client script;
- **stable URLs:** every execution, comparison and profile page keeps its URL across later publications, and a
  published page keeps its values (the scenario "A published link keeps showing the same values"): checked against
  what `bench site publish` (REQ-RES-04) keeps on `gh-pages`.

**Done** means: both scenarios' tests green with the fake agent.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `comparison.feature#A result profile filters the landing page`: classified red-first or characterization in the design phase.
- `comparison.feature#A published link keeps showing the same values`: classified red-first or characterization in the design phase.

## Design

<!-- Written in the design phase. -->

## Execution notes

## Review notes
