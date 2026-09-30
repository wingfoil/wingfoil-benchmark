---
id: task-047-manual-publish-and-transcript-assets
type: task
title: "Manual publish and transcript assets"
status: draft
release: v0.1
wave: W11
features: [F5.6]
acceptance: [results.feature]
requirements: [REQ-CLI-09, REQ-RES-04, REQ-RES-06, REQ-NFR-01]
---

## Context

Third and last task of wave **W11 — Publish** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). The
W11 plan-phase decisions are in [task-045](task-045-site-build-and-landing-page.md). This task delivers
**F5.6 manual publish**: it publishes the site built from stored results to GitHub Pages, only when
explicitly requested (features 1.2, J2.8: "publishing is a deliberate step, never automatic"). By W11
decision 4, it also delivers REQ-RES-06's transcripts as release assets.

What exists:

- `site/`, built by `bench site build` (task-045, task-046).
- Transcripts (`transcript.jsonl`) are git-ignored (`results/**/transcript.jsonl`), and scrubbed of known
  secrets before storage (REQ-NFR-01). No code compresses them, records a release asset in `run.json`, or
  attaches one. A run read from a clone shows "transcript not on disk" (task-043).
- The GitHub repository `wingfoil/wingfoil-benchmark` is private, with no Pages and no `gh-pages` branch
  (checked read-only on 2026-09-30).

Scope:

- **`bench site publish`** (REQ-CLI-09, REQ-RES-04) pushes exactly `site/` to the `gh-pages` branch of the
  repository's remote, and is the only way anything is published.
  - It refuses while the repository is private, naming why. How visibility is read (for example `gh api`)
    is this task's design; a probe that cannot tell is a refusal, never a publish.
  - It refuses when `site/` is missing, or does not come from a scored execution.
  - Its commit on `gh-pages` names the execution it was built from, so the published pages can be traced to
    the results store.
- **Nothing is published otherwise** (`results.feature` @F5.6 "Publishing is explicit"): no other command,
  test or build step pushes, and `bench site build` never does.
- **Transcripts as release assets** (REQ-RES-06, W11 decision 4): a command compresses an execution's
  transcripts into one archive, named for the GitHub release `<campaign-id>-<n>`, and records the asset in
  each run's `run.json`. It prints the `gh release` command that attaches it and does not run it. The
  archive is checked for known secret values before it is written (REQ-NFR-01). `bench run show` then
  names the asset when the transcript is not on disk. The command's name and the `run.json` field are this
  task's design, and are stated in the requirements.
- **Tests** use a local bare repository as the remote and a stubbed visibility probe. No test calls
  GitHub.
- **Acceptance:** `results.feature` @F5.6 has two scenarios: "Publishing is explicit", and "Publishing
  deploys exactly the built site". They get tests titled `@F5.6 <Scenario name>`.

Out of scope:

- Making the repository public, enabling Pages, creating the GitHub release and uploading the archive.
  These are the approver's actions at plan-003 step 6 (W11 decision 2).
- The public half of W11's wave check: plan-003 step 6.

**Done** means:

- `bench site publish` deploys exactly `site/` to `gh-pages`, and refuses while the repository is private.
- An execution's transcripts can be packed as one release asset, recorded in `run.json`.
- The two @F5.6 scenarios are green.
- Tests, coverage and lint pass; `npm run test:bin` covers the commands.
- W11's offline wave check (task-045, decision 2) is recorded in rel-v0-1's W11 section, with the public
  half marked as due at plan-003 step 6.

## Acceptance criteria

Classified in the design phase.

- `results.feature` @F5.6 "Publishing is explicit": with a built site and no publish requested, nothing is
  pushed anywhere.
- `results.feature` @F5.6 "Publishing deploys exactly the built site": `gh-pages` holds exactly `site/`,
  and the published pages show the same numbers as the results store for that execution.
- REQ-RES-04: publishing is refused while the repository is private, and when visibility cannot be read.
- `bench site publish` is refused with no `site/`, naming what is missing.
- REQ-RES-06: an execution's transcripts give one archive named for `<campaign-id>-<n>`, each run's
  `run.json` records the asset, and the `gh release` command is printed, not run.
- REQ-NFR-01: an archive holding a known secret value is refused.

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
