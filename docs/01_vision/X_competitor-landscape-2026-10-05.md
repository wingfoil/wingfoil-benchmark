# Competitor re-verification — 2026-10-05

**Status:** input to v0.2's release-planning ([plan-004](../plans/plan-004-release-v0-2.md) step 1), not an approved
document. It updates [X_competitor-landscape-2026-09-22.md](X_competitor-landscape-2026-09-22.md) for the tools
v0.2 considers.

**How it was made:** an agent read the primary pages through web fetches: the tools' repositories, release pages and
documentation, and the npm and PyPI registries. It installed and ran nothing. Fetch summaries paraphrase the pages,
so the points marked *(re-check)* are verified again before any task cites them, and every arm's spike verifies them
on the pinned version.

## GitHub Spec Kit — likely eligible

- **Release:**
  - latest tag **v1.1.0** (2026-10-02), a release every 1–4 days (v1.0.9 on 09-21 → v1.0.13 on 09-29);
  - MIT;
  - PyPI `specify-cli` may still list 1.0.13 *(re-check)*.
- **Install:**
  - Python ≥ 3.11; `uv tool install specify-cli==X.Y.Z` or the git tag;
  - an offline wheel bundle is documented (`docs/install/air-gapped.md`), and `init` needs no network with the
    bundled assets.
- **Claude Code:** `specify init <dir> --integration claude` installs **skills**, `.claude/skills/speckit-<cmd>/SKILL.md`,
  and `.specify/` (templates, scripts, workflows, a constitution skeleton). **Changed since 09-22:**
  - the commands are hyphenated skills: `/speckit-constitution`, `-specify`, `-plan`, `-tasks`, `-implement`,
    `-converge`;
  - there are bug and assess processes (`/speckit-bug-assess|fix|test`).
- **Two ways to follow its process:**
  1. **the agent follows the skills,** started by the benchmark's runner as for every arm:
     `/speckit-constitution` → `/speckit-specify` → (`/speckit-clarify`) → `/speckit-plan` → `/speckit-tasks` →
     (`/speckit-analyze`) → `/speckit-implement`;
  2. **the workflow engine:** `specify workflow run speckit -i spec="…"`. **It spawns the agent itself**
     (`integrations/base.py`, `dispatch_command()` → `claude -p <prompt> --model <model> --output-format json`). The
     model comes from each step's `model` field, and the executable is overridable. The details are to re-check,
     among them whether it passes permission flags.
- **Gates:** they "prompt on a TTY; pause otherwise". They are answerable non-interactively
  (`specify workflow resume <run_id> --input <verdict>=approve`, or a default verdict), and `specify workflow status
  --json` reads them. A gate stores no identity and no reason (09-22).
- **Own LLMs or keys:** none; it shells out to the configured agent. **Telemetry:** none found.
- **Eligibility (F7.4 draft):**
  - pinnable, headless and with Claude Code: yes;
  - with the engine, the campaign's model must be forced into every step, and the nested sessions must be metered.

## OpenSpec (Fission AI) — likely eligible

- **Release:** latest **v1.14.0** (2026-09-30), roughly weekly; MIT.
- **Install:** Node ≥ 20.19; `npm install -g @fission-ai/openspec@1.14.0`, exact version, or an `npm pack` tarball.
- **Claude Code:** `openspec init --tools claude --profile core --force`, non-interactive. It writes `.claude/skills/`,
  `.claude/commands/` (opsx), the `openspec/` tree, and AGENTS.md or CLAUDE.md *(re-check which)*. No MCP.
- **Process (core profile):** `/opsx:explore` (optional) → `/opsx:propose <change>` → `/opsx:apply` →
  `/opsx:archive`. The CLI checks state: `openspec status --change <id> --json`, `openspec validate --all --json
  --no-interactive`.
- **Headless:** with stdin closed, `archive` needs `--yes`, or it exits printing the command to re-run.
  `/opsx:apply` asks which change when it is ambiguous, and `/opsx:archive` asks to sync specs. Those are
  conversational questions, which the neutral approver answers. No TTY, browser or human-only step was found.
- **Own LLMs or keys:** none.
- **Telemetry: on by default** (command names and version). It is turned off by `OPENSPEC_TELEMETRY=0` or
  `DO_NOT_TRACK=1`, or `openspec config set telemetry.enabled false`; CI mode turns it off too. The arm's container
  and published setup set it.

## BMAD Method — reserve, doubtful

- **Release:** latest **v6.12.1** (2026-10-04), roughly monthly; MIT plus a trademark. `main` already describes **v7**
  (`npx skills add …`, `bmad setup`, uv), not yet released.
- **Install (v6):** `npx bmad-method@6.12.1 install --directory . --modules bmm --tools claude-code --yes`,
  non-interactive.
- **Process:** persona-led facilitations that ask the user many questions. v6.10 added `bmad-dev-auto` and a loop
  module for unattended runs, but the planning phases still expect dialogue.
- **Doubtful:** pinnable and installable headless, but its dialogue would inflate the neutral approver's
  interventions, and v7 is about to change its surface.

## What this changes for v0.2's planning

1. **Spec Kit's engine raises the "harness launches the agent" question now,** not only with WingFoil's future
   routing (calibration v0.1 §7, dl-008). The Spec Kit arm either follows the skills (option 1: same runner, same
   metering, the engine unused) or uses the engine (option 2: closer to "Spec Kit as its users run it", but the
   runner gives up the steps' sessions). The choice is the approver's, at the triage of rel-v0-2.
2. **Pins move fast.** Spec Kit releases every few days, so the pin is chosen at calibration and frozen as a wheel
   bundle, as WingFoil's was frozen as a tarball.
3. **OpenSpec's telemetry** goes into F7.4's criteria as a parity rule: every arm's tool runs with its telemetry off,
   stated in its published setup.
