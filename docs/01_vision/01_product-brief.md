# Product Brief — WingFoil Benchmark

**Version:** 0.1
**Date:** 2026-09-22
**Status:** Draft
**Source:** kickoff session with the approver (Roberto Pompermaier), 2026-09-22

---

## 1. Problem

WingFoil claims to make AI-assisted software development more deterministic and of higher quality,
through Project Memory, DNA, Directives, Workflow and a CLI + MCP interaction layer. Today there is
no evidence of **where** that claim holds: in which project phases, for which kind of user, and at
what cost. Without that evidence:

- adopters cannot tell whether WingFoil is worth its setup and token overhead for *their* situation;
- the maintainer cannot tell which parts of WingFoil to optimize, or when a release makes things worse;
- anyone comparing WingFoil with competing tools has nothing reproducible to compare against.

## 2. Purpose, in priority order

1. **Show adopters where WingFoil makes the difference.** Quick, eye-catching results that can be
   used in the first public posts to spark curiosity.
2. **Guide WingFoil's own development.** Detect where WingFoil helps, where it costs more than it
   gives, and whether a release improves or regresses.
3. **Support adoption decisions.** Give whoever decides whether to adopt WingFoil a clear picture
   of which project phases it really helps with, and which problems it solves.

## 3. Audiences

- **Adopter / evaluator:** reads published results to decide whether, and for what, to use WingFoil.
- **WingFoil maintainer:** runs campaigns on WingFoil releases to steer development.
- **Scenario author:** designs new scenarios, their seeds and their oracles.
- **Competitor comparer:** compares WingFoil with competing tools (e.g. Spec Kit, BMAD) on equal terms.

## 4. What is measured

Each scenario executes the same sequence of steps, with identical prompts, in several **arms**:

- **baseline:** a plain agent with a minimal `CLAUDE.md`;
- **baseline-docs:** the same information as the WingFoil arm, in free-form Markdown, to separate
  "WingFoil helps" from "more context helps";
- **wingfoil:** WingFoil initialized and configured, with MCP;
- **competitor arms:** other tools, when they are added.

Arms are compared on:

- **quality:** hidden acceptance tests, spec adherence, code quality, duplication, maintainability
  (measured as the cost of the next change);
- **cost:** tokens, money, wall time, turns, human interventions;
- **determinism:** how similar repeated runs are, across repetitions and across agents.

Results are grouped by **category** (project phase) and **persona**, so each reader can find the
part that concerns them:

- A. Inception & Specification
- B. Planning & Management
- C. Development
- D. Maintenance & Quality
- E. Governance & Compliance
- F. Knowledge & Continuity
- G. Collaboration

## 5. Two tiers of scenarios

- **Micro scenarios:** small, with objective oracles; run at every WingFoil minor release.
  Candidates:
  - implement a third-party spec with an official conformance suite;
  - injected-bug hunt;
  - multi-session evolution;
  - fictional domain;
  - spec authoring from an interview;
  - plan-then-execute;
  - legacy refactoring;
  - directive compliance;
  - parallel agents.
- **Macro projects:** complete applications, run at every WingFoil major release, with a reduced
  smoke run at each minor:
  - a mobile calculator app (single component);
  - a bookmarks dashboard (web app with backend and database);
  - a situation-awareness system for a specific domain (complex data ingestion and reports).

## 6. Constraints

- **Budget:** 20–30 € per campaign preferred, 100 € hard ceiling. This drives how many repetitions
  and arms a campaign can afford.
- **Agents:** only Claude Code (paid) is available today. Codex may be added once the benchmark
  produces results.
- **Isolation:** every run executes in Docker. The agent sees only the scenario seed, never the
  oracles, the other arms, or this repository.
- **Separation from WingFoil:** nothing about the benchmark lives in the WingFoil repository. The
  WingFoil that manages this repository is pinned (`vendor/`) and independent of the WingFoil under
  test.
- **Hold-out:** a private sibling repository, `WingFoil2-Benchmark-HoldOut`, keeps hold-out
  scenarios and oracles unpublished, against overfitting and training contamination.
- **Stack:** TypeScript / Node.js 22.12+.
- **Language:** English for all documents.
- **License:** MIT.

## 7. Distribution

Results are published as **GitHub Pages** of this repository and linked from the WingFoil
`README.md`. The repository starts private and becomes public at the first published result. The hold-out
repository stays private.

## 8. Success signals

- A first public result (labelled preliminary), based on at least the micro scenarios S1–S3 with
  Claude Code, clear enough to be quoted in a post.
- Each published claim can be reproduced from a pinned campaign definition (scenario version,
  WingFoil version, agent and model id).
- The maintainer can point to at least one WingFoil change driven by a benchmark finding.

## 9. Decisions from the brief review

- **Competitor comparison is fair.** Every tool, WingFoil included, gets equivalent setup effort:
  it is configured by following its own official documentation. It receives the same step prompts
  and the same budget. Its setup is scripted and reproducible, and its setup cost is reported
  separately from the per-step cost.
  *(The approver said "fair". The concrete rules are the facilitator's reading of that, to be
  confirmed in the experiment design.)*
- **The repository becomes public at the first published result.**
- **Results with a single repetition per arm are published, labelled as preliminary.**
