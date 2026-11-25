---
id: bug-055-a-reviewer-s-findings-after-prose-unfenced-end-the-review-loop-as-failed-and-its-should-fix-never-reaches-a-fixer
type: bug
title: "A reviewer's findings after prose, unfenced, end the review loop as failed and its should-fix never reaches a fixer"
status: fixed
fixed_by: task-165-fix-bug-055-a-reviewer-s-findings-after-unfenced-prose-reach-the-fixer
tags: ["v0.3","review-loop"]
---

## Context

Found in [campaign-009](../campaign/campaign-009-v0.3-reference-campaign-thirteen-arms-on-sonnet-5.5-with-a-haiku-5.5-slice-and-the-review-loop.md) (`1f70fcaf2ec2/1`, 2026-11-20), the third finding candidate of its results review, filed
at the approver's request. Run S1@1.1 openspec-docs-configured r3 on Sonnet 5.5: one review loop of 82.

## Expected

`review/prompt.md` asks the reviewer to end with one JSON object holding `findings`, "alone or in one fenced `json`
block, and nothing after it". `parseFindings` (`src/core/review.ts`) reads the message itself as JSON or its one fenced
block; anything else is an issue and the loop ends `failed`, by design (REQ-RUN-21 as amended in 1.58). The question
this bug puts is whether a reviewer who breaks only the form, with a valid findings object, should cost the run its
loop.

## Actual

- The reviewer's final message is a prose summary followed by the findings object, unfenced, at its end. It names one
  should-fix: `createPatch`'s array diff allocates an (n+1)×(m+1) table, unbounded on large arrays that mostly differ.
- `parseFindings` reports "the final message holds no findings: neither JSON alone nor a fenced json block"; the loop
  ends `failed` at round 1 (0.0597 €), no fixer runs, and the should-fix stays in the code.
- The run stays `completed`; M-V1 is empty for it and the site shows the loop as failed. The same finding was fixed in
  other runs whose reviewers kept the format.

## Fix (proposed, for the approver's choice)

1. **Accept a trailing object:** when the message neither is JSON nor holds a fenced block, take the last top-level
   `{"findings": …}` object at its end, validated by `findingsSchema` as today. Requirements note; a red test from this
   run's message.
2. **Ask once again:** on a message that does not parse, resume the reviewer's session once with the format
   instruction alone, then fail as today. It costs a turn and changes the loop's record (a repair attempt).
3. **Keep it strict:** the prompt states the form, the loop failing is the measured behaviour of that reviewer; record
   the rate of such failures among the M-V values instead.

Option 1 changes no prompt and no cost; it reads the reviewer more leniently than the prompt asks, which the
requirements would have to say.
