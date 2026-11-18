---
id: task-155-an-evaluation-page-for-ai-agents-docs-evaluate.md-llms.txt-the-readme-s-agent-line-and-their-check
type: task
title: "An evaluation page for AI agents: docs/evaluate.md, llms.txt, the README's agent line and their check"
status: in-progress
release: v0.3
wave: publishing
features: []
acceptance: []
requirements: [REQ-NFR-02]
fixes: []
tags: ["v0.3","docs","agents"]
---

## Context

The approver asked for this on 2026-11-11 and set its form on 2026-11-16. The request reached this repository through
the WingFoil coordination session on 2026-11-17. The aim: an AI agent handed only this repository's link understands
quickly what WingFoil Benchmark measures, which questions it answers and which it does not, and how its results can
inform a decision about its user's project. WingFoil, WingFoil UI and WingFoil Templates get the same page under the
same rules, so an agent finds the same shape in every WingFoil project.

It is placed after task-154 (plan-005 step 3), so that the page describes v0.3 as calibrated, and before step 6
(publishing), which publishes it with the release. The approver chose this placement on 2026-11-17.

## Acceptance criteria

<!-- Each red first unless marked: the check's test fails before the files exist. -->

1. **The check** (red first): a test in the suite, run by `scripts/pre-review.sh` and the full suites, which are this
   repository's CI (it has no hosted CI). It asserts that:
   - `llms.txt` exists at the root in llmstxt.org's shape: a `# title`, a `> summary`, and sections of
     `- [title](url): description` lines;
   - its first link is `docs/evaluate.md`;
   - every relative link in `llms.txt` and `docs/evaluate.md` resolves to a file at the same commit;
   - `docs/evaluate.md` has the eight headings below, in order;
   - `README.md` has a "For AI agents" line pointing to `llms.txt` in its first lines.

   External links are not checked on each run. A script checks them on demand, and on a schedule if the approver
   wants one.
2. **`docs/evaluate.md`** has eight sections, with these headings, in this order:
   1. What it does
   2. Problems it solves, and does not
   3. When it fits, and when not
   4. Prerequisites and adoption cost
   5. Try it in five minutes
   6. Known limits at this version
   7. Compare and measure
   8. Where it sits in the system

   - §1 has three lines (what the Benchmark is, for whom, what it produces) and the version and date the page
     describes.
   - §2 has two short lists, the second as specific as the first. It compares harnesses with the agent and model held
     constant; it is not a general benchmark of models or coding agents.
   - §3 gives criteria an agent can check on its user's situation, each with how to check it, for both "fits" and
     "does not fit". It fits a user who wants evidence before adopting a harness for an AI coding agent; it does not
     fit a choice between models.
   - §4 says what reading the results takes, and what re-running a campaign takes: tools, container, and budget as
     the calibration records it.
   - §5 gives something the agent can do and undo: read one scenario's result and its record, or run a fake-agent
     dry run that writes nothing outside a scratch folder.
   - §6 lists the known limits, written like strengths, each with the version it holds for and the element that
     tracks it where one exists: the preliminary status (which scenarios were repeated), threat T1 (built by
     WingFoil's maintainer), and the arms and scenarios planned for v0.4.
   - §7 points to the published results, the method page and WingFoil's comparison
     (<https://wingfoil.github.io/wingfoil/docs/comparison.md>).
   - §8 holds the four lines below, unchanged.
3. **`llms.txt`** is hand-written. Its first link is `docs/evaluate.md`, then the results site, the method page, the
   release notes and the experiment design.
4. **`README.md`** has a "For AI agents" line, pointing to `llms.txt`, in its first lines.
5. **The rules for claims:** facts, not marketing; the Benchmark's own rules (no claim of significance, estimates
   marked as estimates, losses written like wins); each claim with the version and date it holds for, read from
   the published campaigns and `docs/calibration/`.
6. **Checks:** prettier on every file, tsc, `scripts/pre-review.sh main`, an independent read-only review (dl-020),
   and the full suites on the approver's go.

## Design

§8's four lines, as given by the coordination session (the Benchmark's line kept as given):

- WingFoil (<https://github.com/wingfoil/wingfoil>): sets the rules for AI-assisted projects — in git, every approval
  with a name and a reason. A CLI and an MCP server.
- WingFoil UI (<https://github.com/wingfoil/wingfoil-ui>): a local web console for a project governed by WingFoil:
  what requires you, gate decisions and submissions, all through the project's own WingFoil CLI.
- WingFoil Templates (<https://github.com/wingfoil/wingfoil-templates>): the official catalog of template packs that
  configure a project's .wingfoil/ (DNA, Memory types, directives, workflows).
- WingFoil Benchmark (<https://github.com/wingfoil/wingfoil-benchmark>): measures where a harness for AI coding
  agents makes a difference and where it does not, by rules published before any run; built by WingFoil's
  maintainer.

The page states v0.3's results only once the reference campaign is published (plan-005 step 5). Before that it
states v0.2's published results and v0.3's calibration, each with its version and date.

## Execution notes
