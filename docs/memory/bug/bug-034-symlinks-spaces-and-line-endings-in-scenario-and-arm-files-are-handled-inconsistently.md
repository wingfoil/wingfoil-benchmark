---
id: bug-034-symlinks-spaces-and-line-endings-in-scenario-and-arm-files-are-handled-inconsistently
type: bug
title: "Symlinks, spaces and line endings in scenario and arm files are handled inconsistently"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3"]
---

## Context

Collected at v0.3's release-planning (2026-10-24) from the smaller items of [rel-v0-1](../release/rel-v0-1.md)'s
Retrospective and the follow-ups left in v0.2's task notes.

## Expected

A scenario or arm file that is a symlink, has spaces in its path, or uses CRLF line endings is either handled the same
way everywhere or refused with a message, as the Designs state.

## Actual

1. A `scenario.yaml` symlink pointing outside its scenario is followed (task-001).
2. Path helpers follow symlinks and split on spaces (task-042, review item 6).
3. A symlink in an arm is hashed by its target, not refused, so the Design and the code differ (task-064).
4. The heading shift of directive files keeps or strips trailing spaces inconsistently, lets an unclosed fence leak
   into the next rule's title, and does not handle CRLF files (task-072).

## Impact

Latent: no published run is affected. Items 1 and 3 bear on the leak scan and on the arm digest's meaning, and the
configured variants of v0.3 add arm files written by an agent.

## Resolution

One task, before W18's configured variants ([plan-005](../../plans/plan-005-release-v0-3.md)).
