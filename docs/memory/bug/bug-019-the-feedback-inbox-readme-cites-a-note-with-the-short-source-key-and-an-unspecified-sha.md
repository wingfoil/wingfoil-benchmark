---
id: bug-019-the-feedback-inbox-readme-cites-a-note-with-the-short-source-key-and-an-unspecified-sha
type: bug
title: "The feedback inbox README cites a note with the short source key and an unspecified sha"
status: pending
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
---

## Context

Asked on 2026-10-11 by the "Coordinamento WFCoord stato processi" session. The approver confirmed it in chat the same
day: "sì, a fine W14 come proposto". Filed at W14's end, after W14's verification (`894ee03`).

## Expected

`docs/wingfoil-feedback/README.md` states the citation form WingFoil uses for a note of this inbox, as WingFoil's
`COLLABORATION.md` `## Credit` sets it (WingFoil task-271, `9ee64234e12f49178acc03ed7e7c4383fc25d73c`): a
`reported_by:` entry is `<service id>/F-<nnn>@<sha>`, with the service's **full** id and the **full** sha of this
repository's commit read. For example:
`svc-020-github-repository-wingfoil-benchmark-the-benchmark-consumer-project-and-its-feedback-inbox/F-001@<full sha>`.
`svc-020` stays the short key that names the source in this repository.

The `wingfoil-cli` directive's rule 6 already says `<service id>/F-<nnn>@<sha>`.

## Actual

The README's **Source key** paragraph (task-087) ends: "WingFoil cites a note as `<source key>/F-<nnn>@<sha>`". It
reads as the short key (`svc-020/F-001@…`) and does not say the sha is the full one. task-087's review left this as a
nit: whether WingFoil cites the short or the full id was then open on WingFoil's side (its task-271).

## Evidence

- `docs/wingfoil-feedback/README.md`, lines 22–24 on main (`894ee03`).
- WingFoil `origin/main` (`32d8871b`, read 2026-10-13), `COLLABORATION.md` `## Credit`: "as `<service id>/F-<nnn>@<sha>`:
  the service's full id, the note's id in that inbox, and the full sha of the consumer commit read".
- task-087's Review notes, round 1, the nit left.

## Suggested handling

A small task changes the paragraph's last sentence to the full form, with the example above, and keeps `svc-020` as
the short key. `**Last sync:** none` is unchanged: this is not a sync (directive `wingfoil-cli`, rule 7).
