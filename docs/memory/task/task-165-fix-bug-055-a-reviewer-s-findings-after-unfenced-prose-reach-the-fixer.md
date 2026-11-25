---
id: task-165-fix-bug-055-a-reviewer-s-findings-after-unfenced-prose-reach-the-fixer
type: task
title: "Fix bug-055: a reviewer's findings after unfenced prose reach the fixer"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-RUN-21]
fixes: [bug-055-a-reviewer-s-findings-after-prose-unfenced-end-the-review-loop-as-failed-and-its-should-fix-never-reaches-a-fixer]
tags: ["bug","review-loop","v0.4"]
---

## Context

[bug-055](../bug/bug-055-a-reviewer-s-findings-after-prose-unfenced-end-the-review-loop-as-failed-and-its-should-fix-never-reaches-a-fixer.md): when a reviewer writes prose before its findings without a fence, the review
loop ends as failed and its should-fix findings never reach a fixer. Placed in W20 by the approver's decision of
2026-11-22 ([rel-v0-3](../release/rel-v0-3.md)).

**Done** means: the loop finds the findings whatever prose comes before them, and fails only when there are none.

## Acceptance criteria

1. Red first: a reviewer answer with prose then unfenced findings is parsed into its findings; today it fails.
2. Characterization: fenced findings, no findings, and malformed findings keep today's outcome.
3. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

Bug-055's Fix option 1: a lenient trailing object. `parseFindings` (`src/core/review.ts`) keeps its two forms (the
message as JSON alone, one fenced `json` block) and gains a third, tried only when the message has no fence: the JSON
object that ends the message after prose.

- Scan: `trailingObject` requires the message to end with `}`, then tries each `{` from the first: the first one from
  which the rest of the message, to its end, parses as one JSON value is the findings object. The result then goes
  through the same `findingsSchema` as the other forms, so a malformed object is still refused.
- Cost: one `JSON.parse` per `{` in the prose, at most; reviewer messages are short, so it is negligible.
- Unchanged: a fenced block wins over any trailing object (the scan runs only with zero fences), two fences still
  fail, a message with no JSON still fails.
- Requirement: the bug says option 1 is a leniency the requirements would have to state; REQ-RUN-21 (the review loop's
  findings) is the one this task cites, and the leniency is documented in the function's doc comment and in the
  refusal message, which now names all three forms in one constant (`ACCEPTED_FORMS`) next to that comment.

## Execution notes

- Red first, then green (533d1c89): `test/unit/core/review.test.ts` gained the prose-then-unfenced case, which failed
  before the change; fenced, bare, no-findings and malformed messages keep their outcome (8/8 tests pass).
- Review park (2026-11-25), three points, all fixed in the follow-up commit: (1) an unformatted test line reached
  review: `npm run format` fixed it, and `npm run pre-review -- main` now runs before every commit; (2) the refusal
  said "neither JSON alone nor a fenced json block": it now reads from `ACCEPTED_FORMS`, kept beside the doc comment
  listing the forms (the old text remains only in recorded results and the bug's report, which are history); (3) this
  Design and these notes were empty, now written.
- Observed: `npm run pre-review -- main`: prettier, eslint, tsc and the targeted tests passed (8/8, then 35/35); its
  related-tests stage ran past 10 minutes and was left to finish in the background. The full suites wait for the
  approver's go (AC3).
- `wingfoil` commands behaved as declared.
