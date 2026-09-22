# Competitor landscape — input material (2026-09-22)

**Status:** INPUT — not a decision. Nothing in this file is approved. It feeds the remaining phases
of `benchmark-inception` (plan-001): features, sequencer, experiment-design. Changes it implies for
approved documents are brought to review and recorded as review decisions there.

**Provenance:** competitor research supplied by the approver on 2026-09-22 (verified by its author
against GitHub releases and official documentation on that date), translated to English.
**Re-verified by this repository on 2026-09-22:** latest release tags and dates of Spec Kit (v1.0.9,
2026-09-21), OpenSpec (v1.13.1, 2026-09-17) and BMAD Method (v6.12.0, 2026-09-04); MIT license of Spec
Kit and OpenSpec; Claude Code integration of Spec Kit (`specify init --integration claude`) and
OpenSpec; Spec Kit's `specify workflow run` engine with gate steps and run state in `state.json`;
OpenSpec's telemetry being on unless disabled (`openspec config set telemetry.enabled false`, or
`OPENSPEC_TELEMETRY=0` / `DO_NOT_TRACK=1`). Every other statement below is **as received**. Re-verify it
at the source before citing it in a document: these projects release weekly.

---

## Tool status

| Tool | Status | Form | License | Notes for the benchmark |
|---|---|---|---|---|
| **GitHub Spec Kit** | v1.0.9 (2026-09-21), releases every few days | Python CLI `specify` (uv) + slash commands / skills for ~47 agents, Claude Code included | MIT | Since 1.0 it has a **real workflow engine** (`specify workflow run`: YAML steps, gates, loops, fan-out, pause/resume). A gate stores approve/reject in `state.json`, with no identity and no reason. Artifacts in `.specify/memory/constitution.md` and `specs/<feature>/{spec,plan,tasks}.md`. |
| **BMAD Method** | v6.12.0 (2026-09-04), v7 in prerelease | Package of skills/prompts (`npx skills add` or Claude Code plugin) | MIT + trademark | Strong personas (Analyst, PM, Architect, Dev, UX). States in `sprint-status.yaml` (backlog → ready-for-dev → in-progress → review → done), updated by the LLM **with no validation in code**. Output in `_bmad-output/`, context in `AGENTS.md`. |
| **OpenSpec** (Fission AI) | v1.13.1 (2026-09-17), weekly releases | Node CLI `@fission-ai/openspec` + `/opsx:*` commands | MIT (**telemetry on by default**) | Strongest on **brownfield**: delta specs (ADDED/MODIFIED/REMOVED/RENAMED) are merged by code at archive time. State is derived from folder position and from which artifacts exist. |
| **AWS Kiro** | IDE 1.1 / CLI 2.22 (September 2026) | IDE, headless CLI, Web | **Proprietary**, paid, **own models** | Specs in `.kiro/specs/`, steering in `.kiro/steering/`. Property-based testing from EARS requirements, which measures correctness, not reproducibility. |
| **Agent OS** | v3.0.0 (2026-01), activity nearly stopped | Command package (shell) | MIT | Since v3 it **only injects standards**; the SDD workflow was delegated to the agent's plan mode. |
| **Taskmaster AI** | 0.43.1 (2026-03), effectively in maintenance | npm CLI + MCP server | MIT + **Commons Clause** (not OSI) | **Calls LLMs itself** (main/research/fallback models). Has a status enum, but any transition is allowed. |
| *GSD Core* (emerging) | v1.14.0 (2026-09-14) | Prompt package + support CLI | MIT | State in `.planning/STATE.md`, atomic commits per task, fresh-context subagent per step. |

As received: no tool records approvals in git with who, when and why. No tool validates state
transitions against a state machine. No tool declares or measures reproducibility across runs.

## Implications to evaluate (proposals, not decisions)

1. **First competitor arm candidates:** Spec Kit (the most widespread reference, with a workflow
   engine) and OpenSpec (brownfield, scriptable CLI). BMAD is third: its personas are close to
   WingFoil's roles, but it is heavy to automate without a human.
2. **Probable exclusions,** to be justified in the method:
   - Kiro imposes its own models and IDE. This breaks "agent and model id fixed within a
     comparison" and the 20–30 € campaign budget.
   - Taskmaster calls its own LLMs, so the model is not fixed either, and it is in maintenance.
   - Agent OS is no longer a workflow harness. At most it is a variant of `baseline-docs`.
3. **Pinning:** competitors release weekly, some every few days. The campaign file must pin the
   exact version of every tool, as it already does for WingFoil.
4. **Telemetry:** OpenSpec enables it by default. The arm setup must disable it, and that choice is
   published as part of the setup.

## Tensions for review and experiment design

- **Identical, harness-neutral prompts:**
  - Approved documents say that step prompts are identical and name no harness (brief §4,
    is/is-not DOES / DOES NOT, journey J3 step 3).
  - Spec Kit, OpenSpec and BMAD are driven by explicit slash commands or skills
    (`/speckit.specify`, `/opsx:propose`, …).
  - A decision is needed on *how* a neutral prompt activates a tool, and whether that cost counts as
    setup or as intervention.
- **Category bias:**
  - WingFoil's unique points sit mostly in category E (validated state machines, approvals with a
    reason in commits, directives per role). A benchmark written by WingFoil's maintainer risks
    measuring exactly what only WingFoil does.
  - Fairness needs scenarios where competitors are strong: D (brownfield changes, OpenSpec) and B /
    C (workflow orchestration, Spec Kit).
  - Governance metrics must be tool-neutral, for example "is an illegal transition prevented?" or
    "can who approved and why be reconstructed from the repository?".
- **The WingFoil arm measures what exists, not what is specified:**
  - The pinned WingFoil 0.1.0 (`7a65580`) has no `memory submit/approve/reject/deprecate` verbs
    and no workflow engine (only a read-only `workflow list`), and its MCP server is read-only.
  - Scenarios must not assume unreleased WingFoil features. If they do, they are marked "expected
    failure" and published as losses.
- **Determinism:**
  - No tool measures reproducibility across runs, and WingFoil's Determinism Index is not measured
    yet.
  - This is an opportunity for an original metric: equivalence across repetitions and across
    agents, with a defined oracle. It needs an operational definition, not a rhetorical one.

## Sources

- Spec Kit: https://github.com/github/spec-kit · docs/reference/workflows.md · docs/concepts/spec-persistence.md
- BMAD: https://github.com/bmad-code-org/BMAD-METHOD · https://docs.bmad-method.org
- OpenSpec: https://github.com/Fission-AI/OpenSpec · docs/concepts.md · docs/cli.md
- Kiro: https://kiro.dev/docs/specs/ · https://kiro.dev/docs/specs/correctness/ · https://kiro.dev/license/
- Agent OS: https://github.com/buildermethods/agent-os
- Taskmaster: https://github.com/eyaltoledano/claude-task-master (LICENSE, src/constants/task-status.js)
- GSD Core: https://github.com/open-gsd/gsd-core
