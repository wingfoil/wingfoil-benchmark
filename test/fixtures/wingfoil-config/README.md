# Wingfoil configuration snapshots

`T2/` is the wingfoil arm's configuration for scenario T2 as the runner's snapshot step kept it
(task-015): `wingfoil init --template Kanban` by WingFoil `3df305e`, T2's `arms/wingfoil/` over it, and
the Benchmark Approver declared. It was taken from a real run of `test/fixtures/campaigns/arms.yaml`
against the WingFoil clone, not written by hand, so the generator's acceptance test reads what WingFoil
actually writes. `T2.PROJECT_RULES.md` is what the generator rendered from it; the test compares the two.

Refresh both together, from a real run, when the pinned WingFoil or T2's configuration changes.
