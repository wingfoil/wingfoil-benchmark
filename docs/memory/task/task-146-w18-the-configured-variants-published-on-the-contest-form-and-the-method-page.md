---
id: task-146-w18-the-configured-variants-published-on-the-contest-form-and-the-method-page
type: task
title: "W18: the configured variants published, on the contest form and the method page"
status: in-review
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

- 2026-11-12: backlog → in-progress on main; worktree `../WingFoil2-Benchmark-wt/t146`.
- **Red first** (`550a2b7f`): `test/unit/site/configuring.test.ts` (five tests of the block, red: no module), the
  form's two tests and the method page's "no configured arm" sentence in `test/unit/site/method.test.ts`, and the two
  scenarios in `results.feature` with their tests in `test/acceptance/configured-arms.test.ts`.
- **The work** (`ae59d5ba`):
  - `.github/ISSUE_TEMPLATE/contest-setup.yml`: the `subject` dropdown after `arm`; the opening text's path from a
    contested configuration to a new scenario version and campaign.
  - `src/site/configuring.ts` (new), `configuringSection`: the profile's agent, model and caps and the prompt in full,
    each with its SHA-256, read by the records' digests (`recordedFile`, `recordedManual` generalized in
    `src/site/recorded.ts`); per configuration its files, the patch as a material page, its sessions' cost, the files
    its docs control does not read (outside the generator's `kept`), and the harness arm's places with sources.
    `RunRecord` gains `scenario` and `version` (`src/site/model.ts`); `methodPages` passes the block as
    `<!-- configuring -->`, or a sentence when no configured arm ran.
  - `site-content/method.md`: the arms sentence; "Configured variants" with four statements (`configured-arms`,
    `configuring-agent`, `configured-defaults`, `configured-properties`), their sources in
    `test/unit/site/method-statements.test.ts`; T12's line.
  - `docs/calibration/configuring.md` 1.1: §3's sentence on the command's leak scan (task-145).
- **Two deviations from the Design, found by the targeted suites:** an arm that is not configured is not loaded
  (the setup-as-it-ran test removes `arms/wingfoil` from the working tree, and the block must not refuse it); and a
  version holding no configuration of a configured arm that ran is said on the page, not refused, since
  `test/unit/site/configured-site.test.ts` (task-142) runs `wingfoil-configured` on a 1.0 stand-in, which may hold
  none, and a campaign refuses such a run anyway.
- Targeted tests green: `test/unit/site/` and `test/acceptance/configured-arms.test.ts`; tsc and eslint clean. No
  `site/` page changes; nothing spent.

## Review

- **Round 1** (an independent read-only agent, in a clone under `mktemp`, 2026-11-12): nothing blocking; tsc,
  prettier, the targeted suites and red-first confirmed. Seven should-fix findings and six nits, all addressed:
  1. "Not rendered by its docs control" read the generator's `kept` directories, not what it reads: now a file is
     not rendered when the generator's output, the configuration rendered alone with its docs control's options, is
     the same without it. A scratchpad script (`unrendered-146.mjs`) on the twelve 1.1 configurations: none
     unrendered, as the reviewer found by hand. Tests: an OpenSpec schema under `openspec/` and a constitution with
     no principle heading are listed.
  2. The arms are read as their runs recorded them: `setupPages` returns the arms it resolved (working tree or
     history) and the block reads them, the tree's only for an arm no run recorded. Test added.
  3. The method page's session sentence: the project as the setup leaves it (seed, tool, the scenario's rules),
     without manual or MCP server, never a step's prompt, the oracle's hidden tests or the hold-out.
  4. S1's three configurations name the RFCs, and S2's boundaries are "such as": checked against the configuration
     files (every S1 configuration names RFC 6901, 6902, 7396, 8259; S2's wingfoil one has no coupon days).
     `configuring.md` §4 corrected the same way, beyond criterion 5's one sentence: a fact the page now repeats.
  5. Tests on a real profile's shape (model, effort, caps), an escaped prompt, the profile from the history.
  6. The site build reaches the block: `configured-site.test.ts` asserts the configured-variants section names its
     run's version.
  7. Several prompt or profile digests: each configuration names its own; "the same for every harness" only with
     one.
  Nits: no agent header when no configuration was found; the profile's effort shown; the form's later fields cover
  a configuration; "leak-scanned" without "as the seed is"; "The 1.1 versions hold configurations"; S8's rules
  sentence per tool.
- **Round 2** (a second independent agent, on round 1's fixes): nothing blocking. Addressed:
  1. The unrendered files were computed over the configuration alone, while the docs control renders it over the
     setup's workspace: a configuration editing a directive the scenario's roles load, or rebinding roles, was listed.
     Now rendered over the scenario's own configuration for the harness arm (what the setup copies, limited to the
     generator's places), a removed file falling back to the base's; what the tool's init writes is not known to the
     site, and the method page says so. The twelve 1.1 configurations: still none unrendered, the block built from
     the compiled code by a scratchpad script (`unrendered-146b.mjs`, twelve configurations, twelve patch pages).
  2–4. The method page: Spec Kit's boundaries on S1 to S3 only; the patch against the project as the setup leaves it;
     `bench scenario configure` scans what the session wrote.
  5. Tests pinning the docs control's options (every-role, from the tree and as the runs recorded it), the base's
     roles, and a generator that cannot render a configuration (now a refusal naming it, not an exception), each
     checked by mutation. `methodPages` passing the setup pages' arms to the block stays pinned only by the code.
  Nits: no docs control is said as such; the leak scan's summary narrowed.
