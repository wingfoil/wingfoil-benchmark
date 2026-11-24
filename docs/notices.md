# Notices

The external workflow runner's notices for this repository (task-177): the gates, blocks and halts it waits on,
written by the runner between the markers below. The approver rules a gate with the runner's `gate.mjs`, from the
runner's home; a notice is never edited by hand.

## Open

<!-- runner:open -->

<!-- key:gate-trunk-plan-006-release-v0.4-work-item.real-agent-check@task:task-177-the-external-workflow-runner-as-this-repository-s-governance-its-configuration-its-identity-and-its-doctor-the-pilot-s-runner-half -->
### N-002 · 2026-11-24 · trunk:task-177-the-external-workflow-runner-as-this-repository-s-governance-its-configuration-its-identity-and-its-doctor-the-pilot-s-runner-half

- **Status:** open
- **Kind:** gate
- **Opened:** 2026-11-24T09:35:56Z
- **Line:** trunk
- **Element:** trunk:task-177-the-external-workflow-runner-as-this-repository-s-governance-its-configuration-its-identity-and-its-doctor-the-pilot-s-runner-half
- **Reason:** work-item.real-agent-check@task:task-177-the-external-workflow-runner-as-this-repository-s-governance-its-configuration-its-identity-and-its-doctor-the-pilot-s-runner-half waits for the approver
- **Ready:** yes
- **Head:** cf38b865
- **Evidence:** no run recorded on this element
- **Unblock:** `cd <runner home> && node scripts/runner/gate.mjs --line trunk N-002 --reason 'Approved work-item.real-agent-check@task:task-177-the-external-workflow-runner-as-this-repository-s-governance-its-configuration-its-identity-and-its-doctor-the-pilot-s-runner-half at cf38b865: no run recorded on this element'`

<!-- key:gate-trunk-plan-006-release-v0.4-work-item.real-agent-check@task:task-127-adopt-methodology-kanban-1.0.0-with-base-2-and-software-1-keeping-the-benchmark-s-delivery-rules-bug-046 -->
### N-001 · 2026-11-24 · trunk:task-127-adopt-methodology-kanban-1.0.0-with-base-2-and-software-1-keeping-the-benchmark-s-delivery-rules-bug-046

- **Status:** open
- **Kind:** gate
- **Opened:** 2026-11-24T09:35:55Z
- **Line:** trunk
- **Element:** trunk:task-127-adopt-methodology-kanban-1.0.0-with-base-2-and-software-1-keeping-the-benchmark-s-delivery-rules-bug-046
- **Reason:** work-item.real-agent-check@task:task-127-adopt-methodology-kanban-1.0.0-with-base-2-and-software-1-keeping-the-benchmark-s-delivery-rules-bug-046 waits for the approver
- **Ready:** yes
- **Head:** 89abe0a3
- **Evidence:** no run recorded on this element
- **Unblock:** `cd <runner home> && node scripts/runner/gate.mjs --line trunk N-001 --reason 'Approved work-item.real-agent-check@task:task-127-adopt-methodology-kanban-1.0.0-with-base-2-and-software-1-keeping-the-benchmark-s-delivery-rules-bug-046 at 89abe0a3: no run recorded on this element'`

## Closed

<!-- runner:closed -->

<!-- key:gate-trunk-plan-006-release-v0.4-work-item.approve@task:task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design -->
### N-004 · 2026-11-24 · trunk:task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design

- **Status:** closed 2026-11-24T11:45:24Z — the approver ruled the gate
- **Kind:** gate
- **Opened:** 2026-11-24T09:58:36Z
- **Line:** trunk
- **Element:** trunk:task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design
- **Reason:** work-item.approve@task:task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design waits for the approver
- **Ready:** no: the last run task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design/review/1 ended blocked
- **Head:** 1f30d536
- **Evidence:** run task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design/review/1 blocked
- **Unblock:** `cd <runner home> && node scripts/runner/gate.mjs --line trunk N-004 --reason 'Approved work-item.approve@task:task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design at 1f30d536: run task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design/review/1 blocked'`

<!-- key:blocked-trunk-task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design/review/1 -->
### N-003 · 2026-11-24 · trunk:task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design

- **Status:** closed 2026-11-24T09:58:26Z — The reviewer accepted task-162 (9eddfdbe) but its role may not run memory submit; the approver ran the in-progress to in-review submit by hand
- **Kind:** blocked
- **Opened:** 2026-11-24T09:50:52Z
- **Line:** trunk
- **Element:** trunk:task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design
- **Reason:** blocked (run task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design/review/1): the permission layer refused `npx --no-install wingfoil memory submit task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design` ("This command requires approval"); the review accepts the work and is recorded in commit 9eddfdbe, and only that in-progress → in-review submit is left.
- **Unblock:** `cd <runner home> && node scripts/runner/run.mjs --line trunk --close N-003 --how "<what solved it>"`
