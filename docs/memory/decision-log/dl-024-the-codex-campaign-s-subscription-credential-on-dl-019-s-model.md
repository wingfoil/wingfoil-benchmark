---
id: dl-024-the-codex-campaign-s-subscription-credential-on-dl-019-s-model
type: decision-log
title: "The Codex campaign's subscription credential on dl-019's model"
status: draft
tags: ["codex","security","campaign"]
---

## Context

[dl-022](dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)
approved a Codex-only campaign, arm A (the baseline arm on S1, S2, S3 and S8 at 1.0, Codex's models Sol, Terra and
Luna), on the maintainer's ChatGPT Plus subscription, which ends on **2026-11-13**. It asks first for a decision on the
Codex credential on [dl-019](dl-019-the-codex-spike-s-subscription-credential-mounted-read-write-from-a-dedicated-directory-outside-the-repository.md)'s
model. dl-019 is closed: its scope ended with task-094's sessions and its credential was deleted.

Open points left by task-094 for any later use: dl-019's scope (bound 1) is not enforced by code; the
adapter's thread map is never pruned; the clearing of `CODEX_HOME`'s sqlite stores before every step was marked for
the approver to confirm and never confirmed; `codex logout` must run with the directory mounted, not the single file.

## Options

- **A. A new bounded exception on dl-019's model**, for task-102's spike and dl-022's Codex campaign only.
- **B. An OpenAI API key** (`CODEX_API_KEY`), billed per token; the subscription unused.
- **C. No Codex campaign.**

## Proposal

**A**, with dl-019's bounds 2–7 and 9 restated unchanged (a dedicated directory `$HOME/.codex-bench/`, mode 700, holding
only `auth.json`, mode 600; the approver logs in by hand; a fresh `CODEX_HOME` per run with only `auth.json`
bind-mounted read-write; one Codex session at a time; the token values scrubbed from the transcript before and after
each session; delivery sessions name the path only, never read, print, copy or list the file; the secret scan after every stage;
the disclosure on the method page and the comparison), and bounds 1 and 8 replaced by:

1. **Scope:** task-102's consented sessions (one per model) and the dry runs and runs of the Codex campaign files that
   extend `baseline-across-agents` with `agent: codex`, from the main checkout, until the campaign's last run or
   2026-11-13, whichever comes first.
2. **Enforced by code:** the runner refuses a Codex run past 2026-11-13 or from a campaign outside the scope; the
   adapter's thread map is cleared at the end of each run.
3. **Stores:** `CODEX_HOME`'s sqlite stores are cleared before every step, so that no step sees another's history.
4. **End:** the approver runs `codex logout` with the directory mounted, then deletes the directory; the ledger
   records the date.

## Consequences

- task-102 (the spike) and the Codex campaign start only after this is approved.
- REQ-NFR-01's exception is restated for this scope (requirements amended in task-101 or task-102, whichever comes
  first), and the method page states the subscription and its limits.
