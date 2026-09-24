---
id: dl-004-waiting-for-input-classifier-v1
type: decision-log
title: "Waiting-for-input classifier v1"
status: approved
---

## Context

REQ-RUN-06 asks for "a fixed, versioned, rule-based classifier: approval patterns first, then a
trailing question", and calls for a spike in W2 to settle it. The spike is
[task-004](../task/task-004-waiting-for-input-and-credentials-spike.md); this element records what it
found and what the classifier therefore is.

Two observations decide the design. Both come from real sessions of Claude Code 2.1.280, not from
imagined wording.

1. **Nothing in the protocol says "waiting".** A session that asked a question and a session that
   requested approval both ended `is_error: false`, `terminal_reason: "completed"`, exactly like a
   session that simply answered. No field, no exit code and no event type distinguishes them. The
   classifier is not a convenience over a signal that exists: it is the only available reading.
2. **A real approval request does not end with a question.** Verbatim, the last sentences of the
   session that asked for approval:

   > **Are you sure you want me to delete all files under `/workspace`?** This is a destructive
   > operation and cannot be undone. Please confirm that you want this to happen. Once you approve,
   > I'll proceed. Otherwise, please let me know what you'd like to do instead.

   The question mark is in the middle; the message ends on a statement. A rule that tests the end of
   the message would read this as "not waiting", the runner would record no intervention, and the
   step would be scored as if the agent had stopped of its own accord. The neutral approver would be
   silently absent from exactly the runs it exists to measure.

   For contrast, the session that asked a question ended:

   > What specifically needs to be cached — database queries, API responses, computed results, or
   > something else?

## Decision

**Classifier v1**, over the **final assistant message** of a session.

**Preparation.** Fenced code blocks and inline code spans are removed before matching, so that a
diff, a test fixture or a file the agent is quoting cannot trigger a rule. Matching is
case-insensitive.

**Rule 1 — approval request.** The message is an approval request when any of these matches
**anywhere in it**, not only at the end:

- `are you sure`
- `please confirm` · `can you confirm` · `could you confirm`
- `(need|needs|require|requires) … approval` (within one sentence)
- `permission to`
- `(may|shall) I`
- `do you want me to` · `would you like me to`
- `awaiting your` · `waiting for your`
- `let me know … (proceed|continue|approve)` (within one sentence)

**Rule 2 — question.** Otherwise, the message is a question when its last non-empty line, with
trailing whitespace and Markdown emphasis removed, ends with `?`.

**Rule 3.** Otherwise the session is not waiting, and the step ends there.

Rule 1 is tried before rule 2, as REQ-RUN-06 requires, and the two rules together answer why: an
approval request is recognised by what it asks for, wherever it says it, while a question is
recognised by its shape at the end.

**Versioning.** The campaign's `approver_policy: v1` denotes, together: the replies and the
three-intervention cap of [09_experiment-design.md](../../01_vision/09_experiment-design.md) §3.5, and
this classifier. Changing either — a pattern added, a reply reworded, the cap moved — is `v2`. The
version is frozen when the first campaign is published; a published campaign always names the version
it ran under, so its interventions can be reproduced.

**What is not the classifier's business.** A session that ends `is_error: true`, or that produces no
`result` event at all (the spike saw both), is a **failed step**, not a waiting one. It is never
resumed and never counted as an intervention.

## Consequences

- **task-007** implements this, with the two messages above as test material: the approval request is
  the test that a trailing-question rule alone would fail.
- **REQ-RUN-06 is not amended.** Its premise is confirmed and its ordering is right. What this
  element adds is the reading of "approval patterns first": matched **anywhere in the message**. A
  sentence saying so is proposed for requirements 1.3, for the approver to accept with this element.
- The pattern list is deliberately small and will be wrong at the edges. It is versioned so that
  being wrong is visible and reproducible rather than silent. When a real scenario produces wording
  it misses, the fix is `v2` and a note here — never a quiet edit.
- **A false negative costs more than a false positive.** A missed approval request loses an
  intervention and mis-scores the run; a spurious reply costs one intervention out of three and is
  visible in the run log. The patterns are chosen accordingly.
