---
id: bug-009-the-runs-ignore-rule-also-ignores-every-run-record-under-results-which-req-res-06-says-are-committed
type: bug
title: "The runs/ ignore rule also ignores every run record under results/, which REQ-RES-06 says are committed"
status: draft
---

## Context

`.gitignore` line 4 reads `runs/`, from the repository's bootstrap (`561117e`, 2026-09-22). Its intent is the
runner's working directories, `runs/<campaign-id>/<n>/…` and `runs/dry-runs/<n>/…` at the root (task-021: "git-ignored
like a campaign's"). Without a leading `/`, a gitignore pattern with only a trailing slash matches a directory
of that name **at any depth**, so it also matches `results/<campaign-id>/<n>/runs/` and
`results/dry-runs/<n>/runs/`, where the runner stores each run's records. Found on 2026-10-02 in
[task-050](../task/task-050-calibration-of-v0-1-dry-runs-measured-costs-and-the-revised-budget.md), when its
first real dry run (`results/dry-runs/1`) was to be committed (the approver's design choice 3).

## Expected

REQ-RES-06: `run.json`, `score.json`, `usage.json`, `diff.patch`, `commits.json` and `aggregate.json` are
committed; only `transcript.jsonl` is git-ignored (`results/**/transcript.jsonl`, line 13). The runner's
workspaces under the root `runs/` stay ignored.

## Actual

`git check-ignore -v --no-index` on main `a6f68fa`:

- `results/<id>/1/runs/S1@1.0/baseline/m/r1/run.json` and `score.json` → ignored by `.gitignore:4:runs/`;
- `results/dry-runs/1/runs/S1@1.0/baseline/m/r1/run.json` → ignored by the same line;
- `results/<id>/1/aggregate.json` → not ignored;
- `runs/<id>/1/…/workspace/x` → ignored (intended).

So a campaign's execution would be committed as its `campaign.yaml` and `aggregate.json` only, without a run
record. Nothing showed it so far: no real campaign or dry run had been stored in this repository, and the tests
build stored runs in temporary directories. A clone could not run `bench run show`, `bench site build` (it
reads each run's `run.json`, REQ-RES-02) or `bench finding` on a published execution.

## Evidence

- `git check-ignore -v --no-index` as above; `git status` after task-050's first dry run shows `?? results/`
  with only `results/dry-runs/1/dry-run.yaml` addable.
- `git log -S'runs/' -- .gitignore`: the line dates from `561117e`.

## Suggested handling

`/runs/` (anchored to the root), within task-050, which needs it to commit its dry runs (the approver's choice,
2026-10-02), with a test that fixes the rule: a run's records under `results/` are not ignored, its transcript
and the root `runs/` are.

## Resolution

<!-- Filled by the task that fixes it. -->
