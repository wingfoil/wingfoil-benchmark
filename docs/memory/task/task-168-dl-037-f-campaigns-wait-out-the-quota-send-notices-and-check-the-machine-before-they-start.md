---
id: task-168-dl-037-f-campaigns-wait-out-the-quota-send-notices-and-check-the-machine-before-they-start
type: task
title: "dl-037 F: campaigns wait out the quota, send notices and check the machine before they start"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: []      # e.g. [REQ-FMT-01, REQ-FMT-02]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["campaign","runner","dl-037","v0.4"]
---

## Context

[dl-037](../decision-log/dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota.md)'s option F, approved, and the retrospective's decision on the machine ([rel-v0-3](../release/rel-v0-3.md),
"What to change" 5: reboots, a full disk, sleep during a dry run, systemd-oomd killing the session inside
campaign-009). Today a run at the subscription's quota ends `quota exhausted`, the campaign stops (REQ-RUN-13) and
nothing tells the approver.

**Done** means: a campaign with `quota_wait: true` waits until the reset and goes on, the approver is told when a
campaign stops, fails a run or ends, and a campaign does not start on a machine that cannot hold it.

## Acceptance criteria

1. Red first: with the fake agent replaying a quota message, a campaign with `quota_wait: true` waits until
   the reset read from the message (else from the campaign file), reruns the run as `--resume` does, keeps the earlier
   attempt under `attempts/<k>/`, and records the wait's start and end in its log; past `quota_wait_max_hours` it
   stops as today.
2. Red first: a notice (`notify-send` when present, else a log line) when a campaign stops (quota past its wait,
   ceiling, `fail_fast`, interrupt), when a run fails, and when it ends.
3. Red first: a preflight refuses to start a campaign, with the reason, when sleep is not inhibited, free memory or
   free disk is below the campaign's stated minimum; `--dry-run` prints the same checks.
4. The agent's time is unchanged by a wait; the wall time shows it.
5. No real-agent session: 0 €.
6. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
