---
id: task-014-operating-manuals
type: task
title: "Operating manuals"
status: in-progress
release: v0.1
wave: W3
features: [F2.7]
acceptance: [runner.feature]
requirements: [REQ-RUN-12, REQ-FMT-05]
---

## Context

Fourth task of wave **W3 — Arms** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It builds on
task-012 (the `manual` field of an arm definition) and task-013 (a wingfoil arm with a working
WingFoil and MCP server), and follows adr-003.

Scope of F2.7:

- **The three operating manuals.** One fixed file per arm, published with the benchmark: it maps a
  step's intent to the harness's commands. For wingfoil: WingFoil's CLI and MCP tools, as `3df305e`
  offers them, including the approval commands the agent runs after the neutral approver's reply
  (REQ-RUN-17). For baseline and baseline-docs: no harness, so the manual is only what every arm shares.
  They are written against observed behaviour (task-011), not against WingFoil's documentation, and
  the approver reviews their text at this task's review gate, because they shape the results.
- **Activation (REQ-RUN-12).** Each arm's manual is copied as `CLAUDE.md` into the workspace, before
  the `seed` commit. Whether the pinned agent loads it with `--setting-sources project` is question 7
  of the spike.
- **Its size.** The manual's size in tokens is measured with a **fixed tokenizer approximation** and
  recorded per run in `run.json`, because a longer manual is also more context (experiment design §2).
  Which approximation, and how it is pinned so that it cannot drift between campaigns, is this task's
  design decision.
- **Identical prompts.** The step prompt is byte-identical in every arm, and the test proves it across
  the three arms rather than assuming it from the code path.
- **The shared project description.** The experiment design gives every arm "the same one-paragraph
  project description". The design decides where it comes from and how it is composed with the manual
  into `CLAUDE.md`. If the scenario format needs a new field for it, that is an amendment for the
  approver, not a silent addition.

Out of scope: the rules and decisions of a scenario (task-013, task-015), a competitor arm's manual
(v0.2), and the method page that publishes the manuals (W11).

**Done** means: `runner.feature` @F2.7 passes against the fake agent, with T1's step 1 prepared in the
three arms; tests, coverage and lint pass; the approver has reviewed the manuals' text.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `runner.feature` @F2.7 "Each arm is activated by its operating manual, and prompts stay identical" —
  identical prompt bytes in every arm, each arm's manual in its environment, each manual's size in
  tokens recorded with the run. **red-first**
- REQ-RUN-12 — the manual is `CLAUDE.md` in the workspace, and the token count is stable: the same
  manual gives the same count on every run. **red-first**
- REQ-FMT-05 — an arm whose `manual` names a missing file is rejected when the campaign is checked,
  not when the run starts. **red-first**

## Design

Follows [adr-003](../adr/adr-003-w3-arm-conventions.md) decisions 3, 8, 13 and 14; builds on task-012
(the `manual` field, the setup phase) and task-013 (a working WingFoil in the wingfoil arm).

**Classification, revised.** The first two criteria are red-first. The third — a `manual` naming a
missing file rejected at the campaign check — is **characterization**: task-012's arm loader already
does it (`file 'manual.md' does not exist`, reported at `arms[<i>]`). The test is kept and named after
this criterion.

### Two questions the Context left open, now settled

1. **The shared project description** needs no new field. S1's spec puts it in the **seed**: "a README
   with a one-paragraph project description, the same text for every arm". The seed is the same in
   every arm by construction, so the description is too; the baseline's "minimal instruction file"
   (experiment design §2) is its manual. `CLAUDE.md` is therefore the arm's manual alone, not a
   composition.
2. **The tokenizer approximation** (approver, 2026-09-25, design phase): **`ceil(UTF-8 bytes ÷ 4)`**,
   recorded as method `bytes-div-4`, version 1. It needs no dependency, gives the same number on every
   machine for ever, and what it is for — comparing the arms' manuals, a confound (experiment design
   §2) — needs a stable relative size, not the model's own count. `run.json` names the method, so the
   number is never read as the model's.

### Activation (REQ-RUN-12)

In the setup phase, after the arm's environment and before its script, the runner copies the arm's
manual to `CLAUDE.md` at the workspace's root; it goes into the `setup` commit, so no step's patch
holds it. If the workspace already has a `CLAUDE.md` — from the seed or the arm's environment — the run
fails naming where it came from, rather than replace a file the scenario or the arm meant the agent to
read. (Keeping such files out of seeds is the leak scan's, W4.)

`run.json` gains `manual: { file: "CLAUDE.md", sha256, bytes, tokens, method: "bytes-div-4",
method_version: 1 }`. The digest ties a published number to the text it measured.
`core/tokens.ts` holds the approximation, one function and its method name.

### The three manuals (F2.7)

One file per arm, `arms/<arm>/manual.md`, published with the benchmark. Two rules shape them:

- **A common core, byte-identical in every arm**: what every agent is told regardless of the harness —
  one request per session, only the repository carries over, the project is described in `README.md`.
  A test checks the core is the same text in all three.
- **The arm's own section maps a step's intent to its harness**, and says nothing a harness does not
  offer:
  - **baseline:** nothing beyond the core;
  - **baseline-docs:** where the project's rules are, as Markdown: `PROJECT_RULES.md` at the
    workspace's root, which task-015's generator writes into this arm's environment;
  - **wingfoil** (against `3df305e` as observed in task-011): call `wingfoil`, never `npx wingfoil`;
    before changing code, read the rules for the developer role (`wingfoil directives list --role
    developer`) and the approved decisions (`wingfoil memory search --type decision-log --status
    approved`), also readable over MCP (`wingfoil://dna`, `wingfoil://memory/decision-log`); track each
    request as a task and record design decisions as decision-logs (`memory add` → body → `memory
    submit`); never approve on one's own initiative: ask for approval and stop; after the reply
    "Approved. Proceed.", run `wingfoil memory approve <id> --reason "<that reply>"` (REQ-RUN-17);
    never edit `.wingfoil/` or a `status:` line by hand. No MCP Tool is mentioned: there is none at
    `3df305e` (adr-003 decision 13).

The manuals do not pre-empt the neutral approver's policy (they do not say what happens to a
question): the policy is the same for every arm and applied by the runner, and repeating it in the
manuals would only make them longer. The approver reviews the text at this task's gate.

### Tests

- **Acceptance** (fake ports): `@F2.7 Each arm is activated by its operating manual, and prompts stay
  identical` — step 1 of one scenario prepared in the three arms: the prompt bytes are identical, each
  workspace's `CLAUDE.md` is its arm's manual, and each `run.json` carries its manual's tokens.
- **Unit:** the approximation (ASCII, multi-byte UTF-8, empty text); the `manual` record; the refusal
  of an existing `CLAUDE.md`; the missing-manual check (characterization); the three real manuals
  share the common core byte for byte, and the wingfoil manual never writes `npx wingfoil`.
- **Docker:** the W1 run's workspace holds `CLAUDE.md`, and the W3 run's wingfoil workspace holds the
  wingfoil manual.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `d3cc75b`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W3 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-014-operating-manuals` → `65a4023`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
