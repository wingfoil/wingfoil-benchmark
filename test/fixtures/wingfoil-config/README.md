# Wingfoil configuration snapshots

`S8/` is the wingfoil arm's configuration for scenario S8 as the runner's snapshot step kept it
(task-015, task-038, task-049): `wingfoil init --template Kanban` by WingFoil v0.2.2, S8's
`arms/wingfoil/` over it, and the Benchmark Approver declared by `wingfoil dna add`. It was taken from a
real dry run of S8@1.0 in the baseline-docs arm against the WingFoil clone
(`results/dry-runs/<n>/generated/S8@1.0/`), not written by hand, so the generator's acceptance test
(@F2.5) reads what WingFoil actually writes. `S8.PROJECT_RULES.md` is what the
generator rendered from it; the test compares the two.

T2's snapshot served the same test until W8, while T2 stood in for S8; it was removed in task-038.

Refresh both together, from a real run, when the pinned WingFoil or S8's configuration changes.

Refreshed in task-049 for v0.2.2: only `dna.yaml` changed — `dna add` keeps the comments and the flow style
`init` wrote, which the setup's former script re-dumped away — and `S8.PROJECT_RULES.md` came out the same.
