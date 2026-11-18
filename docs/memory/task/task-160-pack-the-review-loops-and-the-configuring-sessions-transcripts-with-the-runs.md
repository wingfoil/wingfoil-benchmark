---
id: task-160-pack-the-review-loops-and-the-configuring-sessions-transcripts-with-the-runs
type: task
title: "Pack the review loops' and the configuring sessions' transcripts with the runs'"
status: backlog
release: v0.3
wave: validation
features: [F5.6, F7.5, F4.9]
acceptance: []
requirements: [REQ-CLI-11, REQ-RES-06, REQ-NFR-01, REQ-NFR-05]
fixes: [bug-054-bench-transcripts-pack-leaves-out-the-review-loop-s-and-the-configuring-sessions-transcripts-that-req-cli-11-requires]
tags: ["v0.3","transcripts","release-assets"]
---

## Context

This task fixes [bug-054](../bug/bug-054-bench-transcripts-pack-leaves-out-the-review-loop-s-and-the-configuring-sessions-transcripts-that-req-cli-11-requires.md) before the reference campaign (plan-005 step 5), as the approver chose on
2026-11-18. REQ-CLI-11 says what `bench transcripts pack` puts in `transcripts.tar.gz`. Two of its amendments were never
built:

- **1.50:** the configuring sessions' transcripts, under `configuring/<id>@<version>/<harness>/<n>/` in the asset.
- **1.58:** each run's review-loop transcripts, `review/<n>/reviewer.jsonl` and `fixer.jsonl`, under the run's path.

`packTranscripts` in `src/results/transcripts.ts` collects only `steps/*/transcript.jsonl`. On the validation execution
`2ee46ad9e617/1` the asset holds 65 transcripts of the 83 it should: 14 reviewer, 1 fixer and 3 configuring transcripts
are left out, and the command exits 0. These files are git-ignored, so the asset is the only place a reader can get
them.

**Done** means an execution's asset holds every transcript REQ-CLI-11 names, each checked for secrets, and the command
says how many of each kind it packed and which it could not find.

## Acceptance criteria

<!-- A fix in the pack: unit tests in test/unit/results/transcripts.test.ts, each red first. No Gherkin scenario. -->

1. **The review loops:** a run's `review/<n>/reviewer.jsonl` and `fixer.jsonl` are in the asset under the run's path,
   for every round, and for an earlier attempt's loop if it has one.
2. **The configuring sessions:** for each configuration the execution's runs read (`configured.of` on their scenario
   version), sessions 1 to `configured.records` of `results/configuring/<id>@<version>/<harness>/` are in the asset
   under `configuring/<id>@<version>/<harness>/<n>/transcript.jsonl`, once each however many runs read them.
3. **The same checks as a step's transcript:** a secret, or the shape of an Anthropic key, in any of them refuses the
   pack, naming the asset path and line and never the value. A link is refused. A refused pack changes nothing.
4. **The records:** a configured arm's run and its docs control's record the asset in `run.json`, as REQ-CLI-11 says,
   also when the configuring transcripts are the only ones of theirs on disk.
5. **What is missing is named:** a review or configuring transcript absent from the packing machine is skipped and named
   in the output, as a run without transcripts is. Which review transcripts to expect comes from `review/loop.json`: one
   reviewer per round, and one fixer per round marked `fixed`.
6. **The output:** the command prints how many transcripts it packed of each kind (steps, review loops, configuring).
7. **Reproducible:** the same transcripts give the same archive bytes (REQ-RES-06).
8. **On the real execution (characterization, after the merge):** `bench transcripts pack 2ee46ad9e617/1` on main packs
   83 transcripts (65, 15 and 3), nothing is missing, and the only change to the thirteen `run.json` files is the
   asset's new digest. No release is created.
9. **Checks:** `scripts/pre-review.sh main` on the task's branch, an independent read-only review (dl-020), and the full
   suites on the approver's go.

## Design

- **Collect by kind, then share the rest.** `packTranscripts` builds one list of `{ source, assetPath }`, so that
  files outside the execution directory can be packed. The copy aside, the secret scan, the link check and `tar` then
  read that list, and nothing else in the pack changes.
- **The asset's paths cannot collide:** a run's paths start with `runs/`, the configuring sessions' with `configuring/`.
- **Which runs hold transcripts:** a run counts as holding some when any of its steps', its loop's or its
  configuration's transcripts is packed. A run with none of them still loses its record of the release, as it does
  today.
- **The result gains counts and the missing paths,** and `transcripts` stays the total, so existing readers keep
  working.
- **Executions already released are not packed again.** The published ones predate the review loop and the configured
  arms, and this task changes no campaign's records but the validation's.
- **No requirement changes:** the code catches up with REQ-CLI-11 as it stands.
- **No spending:** no agent runs, and no campaign or dry run is started.

## Execution notes
