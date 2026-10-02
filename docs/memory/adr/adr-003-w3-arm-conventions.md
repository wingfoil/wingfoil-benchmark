---
id: adr-003-w3-arm-conventions
type: adr
title: "W3 arm conventions"
status: approved
---

## Context

Wave W3 of release v0.1 gives the benchmark its arms: arm definitions and the setup phase
([task-012](../task/task-012-arm-definitions-and-the-setup-phase.md)), the WingFoil under test and
approval authority ([task-013](../task/task-013-wingfoil-under-test-and-approval-authority.md)), the
operating manuals ([task-014](../task/task-014-operating-manuals.md)) and the baseline-docs generator
([task-015](../task/task-015-baseline-docs-generator.md)).
[adr-001](adr-001-w1-toolchain-and-runner-conventions.md) and
[adr-002](adr-002-w2-runner-and-adapter-conventions.md) cover the runner, the sessions and the
credentials; neither covers a harness inside the container.

This ADR records what the spike [task-011](../task/task-011-wingfoil-in-the-run-container-spike.md)
**found** against WingFoil `3df305e` and Claude Code 2.1.280 in the run image (its Execution notes hold
the evidence, probes P0–P8), and the **defaults the wave builds on**, derived from those findings. Two
of the defaults are choices rather than consequences; they are marked as such so the approver can
change them at this ADR's gate.

What the spike found, in one line each:

- the WingFoil build is reproducible byte for byte (same SHA-256 in two containers, on the host, and
  for the vendored tarball);
- installing the tarball alone resolves 17 of 111 dependencies to other versions than the lockfile's;
  installing with the lockfile matches all 109;
- `wingfoil init` needs `--template` and a git identity in the repository's `git config`, and makes a
  commit of its own;
- a scenario's configuration can be copied in as files and WingFoil reads it back the same; only
  `memory history` differs;
- approval authority is keyed on `git config user.email`, case-insensitively; a member can only be
  declared by editing `dna.yaml`;
- the MCP server of `3df305e` offers Resources and Prompts, and no Tools;
- `--setting-sources project` loads the workspace's `CLAUDE.md`; `--mcp-config` and
  `--strict-mcp-config` are accepted on `--resume`, and the server reconnects.

## Decision

### The WingFoil under test (REQ-RUN-14, task-013)

1. **Built by SHA from the configured clone, in the run image's base.** The runner resolves the
   campaign's pin to a full SHA in the configured local clone, then `git archive <sha>` → `npm ci` →
   `npm pack` inside a container of the run image's pinned `node:22-bookworm` digest. It never reads the
   clone's working tree or `HEAD`, which another session may be moving (task-011 saw it move). Nothing
   is written to the clone.
2. **Installed with the lockfile's dependency versions.** From the tarball plus the archive's
   `package-lock.json`, `npm ci --omit=dev --ignore-scripts`, once per commit. The result is packed as
   one installed artefact and cached by the runner under its own git-ignored cache directory, keyed by
   the full SHA. A run only unpacks it: no network, about 3 seconds.
3. **Outside the workspace, called `wingfoil`.** The artefact is unpacked in the container under
   `/home/node/`, with a `wingfoil` wrapper (`exec node …/dist/cli.js "$@"`) first on the `PATH`. Nothing
   of WingFoil lands in `/workspace`, so no step's patch contains it. The setup and the manual call
   `wingfoil`, **never `npx wingfoil`**: `npx` does not see the wrapper and goes to the registry, where
   one day it would find a release instead of the pin.
4. **What `run.json` records:** the full commit, and the SHA-256 of the tarball and of the installed
   artefact. The build is reproducible today, so the digests are a check rather than an identity; they
   make a future non-reproducible build visible instead of silent.
5. **Independence from the managing WingFoil** is a property of provenance and path: built from the
   clone, installed outside `vendor/` and the host's `PATH`. It cannot be shown by a difference in
   content, because at `3df305e` the two are the same bytes.

### The wingfoil arm's setup (REQ-RUN-03, REQ-RUN-17, dl-005; task-012, task-013)

6. **The git identity lives in the workspace's `.git/config`.** WingFoil reads `git config`, not the
   environment. The setup writes `user.name "Benchmark Approver"` and
   `user.email approver@benchmark.localhost` into the repository's own config, and the arm's `dna.yaml`
   declares that member with the `approver` role (REQ-RUN-17). The runner never passes `GIT_AUTHOR_*` or
   `GIT_COMMITTER_*` into the container: with them, an approval commit would be authored by one identity
   and name another as approver (task-011 Q5). The runner's own commits keep their fixed identity through
   `git -c` on its side, as today.
7. **Choice — the same identity in every arm.** baseline and baseline-docs get the same repository-local
   identity, although they have no use for the `approver` role. Otherwise only the wingfoil arm's agent
   could commit, and "the agent can commit" would be an arm difference nobody chose. The alternative is
   to set it in the wingfoil arm only, as REQ-RUN-17's wording alone would suggest.
8. **Order of the setup:** `wingfoil init --template Kanban`, then the arm's own configuration (the
   Benchmark Approver member, bindings), then the scenario's `arms/wingfoil/` overlay, then the manual
   as `CLAUDE.md` (task-014). `Kanban` because the benchmark's own process is Kanban and the template
   brings the `task` machine and `kanban-delivery`; a scenario that needs another template says so in
   its own configuration.
9. **Choice — the scenario's configuration is copied, not replayed.** `scenarios/<id>/<version>/arms/wingfoil/`
   is an overlay tree with the workspace's own paths (`.wingfoil/dna.yaml`, `.wingfoil/roles.yaml`,
   `.wingfoil/directives/custom/*.md`, `docs/memory/<type>/<id>.md`), copied onto the workspace after
   `init` and committed once as `chore(wingfoil): apply the scenario configuration`, authored by the
   Benchmark Approver. WingFoil reads it back exactly as if it had been built by commands. What is lost
   is the per-element history: an approved decision shows one commit with `operation: null`. The
   alternative, replaying `dna set`, `directive create/assign` and `memory add/submit/approve` per
   element, gives a genuine trail but turns every scenario's configuration into a script, and the
   decisions it would "approve" were not taken during the run anyway. This settles dl-005's layout.
10. **The history the runner scores:** `seed`, then the setup's commits (the harness's own, such as
    `init`'s, and the ones above), then a runner commit `setup` — always present, possibly empty — then
    `step 01` onwards. Step 01's patch is taken against `setup`, so a step's patch never contains the
    arm's environment. `run.json` records the `setup` commit. baseline and baseline-docs have the same
    shape, with their own (shorter) setup.
11. **The setup is recorded as time only in v0.1.** Every v0.1 setup is a shell script that runs no
    agent, so its Claude Code usage is zero and its cost is nil; REQ-RUN-03's fields exist and are
    zero. Unpacking the installed artefact counts as setup time; building it does not, because it is
    done once per campaign and is the same for every run.

### MCP and the manual (REQ-RUN-12, task-012, task-014)

12. **The MCP config lives outside the workspace** (`/home/node/mcp.json`, written by the setup), with
    the wrapper's absolute path as its command. Both command lines, the first and the resume, carry
    `--mcp-config <that file> --strict-mcp-config`.
13. **At `3df305e` the agent reads through MCP and acts through the CLI.** The server offers the
    Resources `wingfoil://dna`, `wingfoil://workflows`, `wingfoil://memory/{type}[/{id}]`,
    `wingfoil://dna/{section}`, `wingfoil://workflows/{name}`, and seven role Prompts; it has no Tools.
    The wingfoil manual maps "record a decision", "approve", "look up a rule" to CLI commands and MCP
    reads accordingly.
14. **The manual is `CLAUDE.md`, loaded by `--setting-sources project`** (observed: the codeword
    instruction was followed in the first session and on the resume). REQ-RUN-12 holds as written.

## Consequences

- **Amendments proposed to the approver** (task-011 Execution notes, "For the approver"): K5 in the
  scenarios README no longer claims "mutating MCP Tools" for `3df305e`; REQ-RUN-14 adds the
  lockfile-faithful install and the `wingfoil`-not-`npx` rule. With dl-005's REQ-FMT-04 change, these
  make requirements 1.5.
- **A bug is proposed** for Claude Code's auto-memory (`/home/node/.claude/projects/-workspace/memory/`),
  which lives in the container for the whole run and could carry state from one step's session to the
  next, outside the repository (REQ-RUN-04). It is not W3's; it affects every arm equally.
- **task-012's Context is superseded on one point:** it lays the arm's `environment` over the seed
  *before* the `seed` commit. Decision 10 moves it into the setup, after `seed`, so the `seed` commit is
  the same in every arm and only the setup differs. task-012's design follows this ADR.
- The runner gains a cache directory for installed WingFoil artefacts, git-ignored, and a
  configuration key for the WingFoil clone's path (task-013 names both).
- The reference campaign runs on the latest *released* WingFoil (sequencer decision 3), not `3df305e`.
  Decisions 1–5 are written for any commit; decision 13 is specific to `3df305e` and is to be
  re-checked for the release actually pinned, by re-running `spikes/task-011/p6-mcp.sh` against it.
- WingFoil friction met on the way is in the usage-notes inbox, N30–N34.

## Amendment 1 (calibration task-049, 2026-10-02)

The WingFoil under test becomes the released **v0.2.2** (`12537b62`), the version the reference campaign
pins ([task-049](../task/task-049-wingfoil-v0-2-2-as-the-harness-under-test.md)).

- **Decision 13, re-checked on v0.2.2: it holds.** The server declares `resources` and `prompts` only;
  `tools/list` answers "Method not found"; the seven role Prompts and the Resources `wingfoil://dna`,
  `wingfoil://workflows`, `wingfoil://memory/{type}[/{id}]`, `wingfoil://dna/{section}`,
  `wingfoil://workflows/{name}` are those of `3df305e`. `p6-mcp.sh` could not be re-run as it stands — the
  probes' chain fixes `3df305e` and the `0.1.0` tarball's name — so its six requests were sent to
  `wingfoil mcp` of the `wingfoil@0.2.2` package, in a project `init --template Kanban` made; task-049's
  Execution notes hold the output.
- **The setup's approver member (decisions 6, 8):** declared with `wingfoil dna add team.members`, which
  v0.2.2 provides and which commits by itself, only when no member has the Benchmark Approver's e-mail.
  v0.2.2 reads approval authority from the `dna.yaml` committed at `HEAD`, so the commit is required, not
  only tidy.
- **v0.2.2's write guard** refuses `approve`, `reject` and `deprecate` on a document with uncommitted
  changes; `submit` carries them. The manual's sequence is unaffected and stays as it is.

