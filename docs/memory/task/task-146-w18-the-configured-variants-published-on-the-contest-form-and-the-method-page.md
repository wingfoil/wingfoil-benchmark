---
id: task-146-w18-the-configured-variants-published-on-the-contest-form-and-the-method-page
type: task
title: "W18: the configured variants published, on the contest form and the method page"
status: draft
release: v0.3
wave: W18
features: [F5.5, F7.2, F7.5]
acceptance:
  - "results.feature#The contest form covers a configured arm's configuration"
  - "results.feature#The method page states the configuring agent and each configuration"
requirements: [REQ-RES-02, REQ-RES-10]
fixes: []
tags: ["v0.3","configured","site"]
---

## Context

W18's last task (plan-005, configured variants, F7.5). Its "Ends with" in [rel-v0-3](../release/rel-v0-3.md), every
arm in a dry run, is met by task-144; what remains of
[task-138](task-138-w18-s-requirements-and-acceptance-configured-variants-f7.5.md)'s criterion 6 (T12, REQ-RES-02 and
REQ-RES-10 as amended in 1.50) is publishing: the method page states the configuring agent and each configuration,
and the setup contest form covers a configuration. Task-138 drafted the two scenarios in its Design; they are not in
`results.feature` yet.

State read on 2026-11-12 (main `fe6f0641`):

- `.github/ISSUE_TEMPLATE/contest-setup.yml` lists the six configured arms (task-142) but does not ask whether the
  setup or the configuration is contested, and its text speaks of a setup only.
- `src/site/method.ts` gives a configured arm a setup page (its base arm's manual and script, the configuration
  copied over the workspace) and its docs control what it kept; nothing states the configuring agent, its prompt, a
  configuration's files and patch, or the files a docs control did not render.
- `site-content/method.md` says "There are seven arms" and has no word on configured variants.
- [configuring.md](../../calibration/configuring.md) §3 holds what each 1.1 configuration changes from its tool's
  defaults, §4 the domain-knowledge note (S1's RFC numbers) and the boundaries note (S2); §3 also says the command's
  leak scan covers its prompt only, which task-145 changed.

No published execution ran a configured arm yet: the reference campaign will be the first. The block is built and
tested on fixtures; no `site/` page changes in this task, and `bench site publish` stays the approver's. Code, prose
and tests only; nothing spent.

## Acceptance criteria

<!-- Each red first unless marked: a failing test before the code; `acceptance` lists the scenarios as written. -->

1. **The contest form covers a configuration** (red first, `results.feature`, the form's test in
   `test/unit/site/method.test.ts`): a required dropdown "What is contested" with `the setup` and `the
   configuration`; the opening text says that a configuration is scenario content, so an accepted correction changes
   the configuring prompt, its profile or the arm, and every harness's configuration is written again in a new
   scenario version, run as a new campaign; the contested values stay published (REQ-RES-10 as amended in 1.50).
2. **The method page states the configuring agent** (red first, `results.feature`): for an execution that ran a
   configured arm, a generated block names the configuring agent, its model and caps, from `configuring/profile.yaml`,
   and quotes `configuring/prompt.md` in full with its SHA-256; both read as the configurations' records name them by
   SHA-256, from the repository's history when the working tree's differ, refused when no commit holds them.
   An execution with no configured arm gets no block.
3. **Each configuration** (red first, the same scenario): for each configuration of the scenario versions the
   execution ran, its files with their SHA-256 and the session's patch (`configured/<arm>.patch`, the difference
   from the workspace after the base arm's setup: the tool's defaults), its record's cost (M-K3's one-off part), the
   files its docs control did not render (REQ-RUN-11 as amended in 1.50), and the harness arm's `configuration`
   places with their sources (REQ-FMT-05 as amended in 1.50). A patch is published as a material page, linked from
   the block, not inlined.
4. **The prose** (`site-content/method.md`, characterization of the rendering: the method page's existing tests stay
   green): the arms section lists thirteen arms, the six configured ones described once (a harness arm whose
   scenario version holds a configuration written by the configuring agent, copied over the workspace after the
   setup; its docs control from the configured arm); a subsection "Configured variants" says what a session sees
   (the seed and the installed harness), that the prompt is the same for every harness, that a configuration is
   scenario content (pinned by the version's hash, leak-scanned, never rewritten once the version has run), and the
   two properties of a configured arm from configuring.md §4, stated as properties of the variant, not leaks: it
   carries what its configuring agent knows of the domain beyond the seed (S1's standards by number), and it may
   name what the README implies, such as S2's boundaries to test; T12's line names the configuring agent too. What
   each 1.1 configuration changes from its defaults is summarized from configuring.md §3, linked to the generated
   block for the files.
5. **configuring.md** 0.x: §3's sentence on the command's leak scan says that since task-145 `configure` also scans
   the configuration it writes; nothing else changes there.
6. Checks green (prettier, tsc, eslint, `scripts/pre-review.sh main`); an independent review (dl-020); the full
   suites on the approver's go. No requirement changes are expected (REQ-RES-02 and REQ-RES-10 as amended in 1.50
   already say it); if the work finds one needed, it stops and asks.

## Design

- `.github/ISSUE_TEMPLATE/contest-setup.yml`: a `dropdown` `subject` after `arm`; the markdown text gains the
  configuration's path to a new scenario version. The form's name and file stay (the setup pages link it).
- `src/site/configuring.ts` (new): `configuringSection(root, model, history)` reads, for each run scenario version
  holding a configuration of a configured arm the execution ran, its `configured/<arm>.json` (the newest `written`
  record, the one the version's hash pins), its `.patch`, and the profile and prompt by the records' SHA-256
  (`recordedManual`'s way through the history port); returns the block's HTML and the material pages
  (`configuration-<id>@<version>-<arm>.html` with the patch in `<pre>`). Several prompt or profile digests among
  the records: each named, the prompt quoted once per digest.
- `src/site/method.ts`: the block goes in through `renderMarkdown`'s `blocks` as `configuring`, beside `execution`
  and `material`; `site-content/method.md` holds `<!-- configuring -->` in the new subsection, so an execution
  without a configured arm renders a sentence saying none ran.
- The docs control's unrendered files: from the docs generator's `kept`/rendered paths already used by
  `docsControlHtml`, inverted over the configuration's files.
- Tests: a fixture execution in `test/unit/site/` with `speckit-configured` and `speckit-docs-configured` on a 1.1
  copy holding a configuration and its record (`test/support/configured-fixture.ts`), and a history double for the
  changed-prompt case.

## Execution notes

## Review
