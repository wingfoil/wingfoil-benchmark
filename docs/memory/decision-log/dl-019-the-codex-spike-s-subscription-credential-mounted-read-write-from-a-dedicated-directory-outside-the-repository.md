---
id: dl-019-the-codex-spike-s-subscription-credential-mounted-read-write-from-a-dedicated-directory-outside-the-repository
type: decision-log
title: "The Codex spike's subscription credential mounted read-write from a dedicated directory outside the repository"
status: approved
tags: ["security","agent","codex"]
---

## Context

The approver approved, in chat on 2026-10-15, a **Codex agent adapter spike** and a small cross-agent comparison,
outside the v0.2 reference campaign (plan-004 step 3-bis, agreed with the coordination session WFCoord):

- a `codex` adapter (OpenAI's Codex CLI) behind `src/agents/port.ts`, beside `claude-code` and `fake`;
- one scenario (S3), the baseline arm only, Claude Code at task-093's pin against Codex, reading M-R1 and M-R2 across
  agents (experiment design: "from v0.2 they also apply across agents");
- the real sessions on the maintainer's **ChatGPT Plus** subscription, valid until **2026-11-13**, in the week of
  2026-11-02 to 2026-11-06.

The approver's brief says: check first how Codex CLI authenticates headless with a subscription, and stop if it needs
a credential stored on disk or in a way the security rules forbid. It does.

**What OpenAI's Codex documentation says** (read 2026-10-15: `developers.openai.com/codex/auth`, now served at
`learn.chatgpt.com/docs/auth`, and `learn.chatgpt.com/docs/non-interactive-mode.md`):

1. **A personal plan (Plus, Pro) in automation:** seed `~/.codex/auth.json` through secure storage, let Codex refresh
   it in place, and persist the updated file between runs. The file holds access and refresh tokens; the
   documentation says to treat it like a password. Sessions on it use the plan's usage limits, not API billing.
2. **Codex access tokens** (`codex login --with-access-token`), the documented credential for automation without a
   browser, are granted by the admins of ChatGPT Enterprise workspaces (Business per a third-party account). Not
   available on Plus.
3. **`cli_auth_credentials_store`:** `file` (`auth.json`), `keyring`, `auto`, or `ephemeral`, which keeps credentials
   in memory for the current process only. A device-code login (`codex login --device-auth`) under `ephemeral`
   would need the maintainer at a browser for every container and would not reach a `codex exec` started as another
   process: unworkable for the runner.
4. **`CODEX_API_KEY`:** an API key for one `codex exec` invocation, passed in the environment. API billing at list
   rates, not the subscription.
5. **`codex exec --json`:** `turn.completed` reports `input_tokens`, `cached_input_tokens`, `output_tokens` and
   `reasoning_output_tokens`, and no cost. `codex exec resume <SESSION_ID>` continues a session.

**The rules a subscription credential would break:**

- REQ-NFR-01: credentials reach the container "only through environment variables or a read-only mount at run time".
  Codex rewrites `auth.json` when it refreshes, so a read-only mount would leave the next session with expired tokens.
- REQ-RUN-15: the agent's credential is a long-lived token passed in an environment variable, read from a file outside
  the repository. Codex on Plus takes no token in the environment.
- The delivery sessions' rules (the approver's brief): credentials never reach disk, logs, transcripts or results;
  the token enters a container only by name.

The host already keeps the Claude token in a file (`BENCH_AGENT_TOKEN_FILE`, outside the repository); what is new is a
credential that the agent itself **rewrites**, through a **writable mount**, and that grants a refresh, not only a
session.

## Options

- **A. An OpenAI API key in `CODEX_API_KEY`.** A dedicated key in a file outside the repository, passed into the
  container by name, as REQ-RUN-15 passes Claude's token. No rule changes. Every session is billed per token on an
  OpenAI API account, which needs its own credit; the Plus subscription is not used.
- **B. The subscription's `auth.json`, mounted read-write from a dedicated directory, for this spike only.** An
  exception to REQ-NFR-01's read-only mount, bounded below. No per-token spending; the sessions draw on the plan's
  usage limits.
- **C. Defer the Codex spike** past v0.2. Nothing changes; the cross-agent reading of M-R1 and M-R2 waits.

## Proposal

**B**, the approver's choice in chat on 2026-10-15 ("voglio sfruttare l'abbonamento": the subscription is to be used),
with these bounds:

1. **Scope.** Only the real sessions the Codex spike task consents to in its pending → backlog approval, run from the
   main checkout, and only until the last of them or **2026-11-13**, whichever comes first. Not the v0.2 reference
   campaign, not the bridge, not calibration; REQ-RUN-15's Claude default is unchanged. Any other use of a writable
   credential needs a new decision.
2. **Where the credential lives.** A dedicated directory outside the repository and outside every worktree,
   `$HOME/.codex-bench/` (mode `700`), holding only `auth.json` (mode `600`). Never the maintainer's own
   `~/.codex/`, so the spike neither reads nor refreshes the credential the maintainer uses elsewhere, and only one
   copy is ever refreshed.
3. **Who writes it.** The approver logs in once, by hand, with `codex login --device-auth` and
   `cli_auth_credentials_store = "file"`, `CODEX_HOME` pointing at that directory: on the host, or in a throwaway
   container of the spike's image with the directory mounted. Delivery sessions never read, print, copy or list the
   file's content; they name its path only.
4. **How it enters the container.** The runner gives each run a fresh `CODEX_HOME` inside the container, outside
   `/workspace`, with a `config.toml` it writes (`cli_auth_credentials_store = "file"`, no other setting from the
   host). Only `auth.json` is bind-mounted into it, read-write. Codex's own sessions, history and logs therefore stay
   in the container and go with it, and no run sees another's. If a single-file read-write mount does not survive
   Codex's refresh (a write by rename, for instance), the task stops and asks: copying the file in and out would put
   the credential's bytes through the runner.
5. **One Codex session at a time.** The spike's sessions run one after the other, so that two refreshes never race
   on the file.
6. **Scrubbing (REQ-NFR-01).** The adapter reads the file's token values into memory, only to scrub them, before the
   session and again after it, since a refresh during the session writes new ones, and scrubs the transcript of both.
   Every stage that ran Codex ends with a secret scan of the run's output and the spike's directory,
   `grep -rlFf <(…)` over the token values extracted from the file, never printed; an empty extraction or a `grep`
   error fails the scan.
7. **Nothing in the repository or the results.** The runner refuses a credential path inside the repository, a
   worktree or the workspace. `.gitignore` and the leak scan are unchanged; the scan's result is recorded per stage.
8. **The end.** After the last session, or on 2026-11-13, the approver runs `codex logout` with that `CODEX_HOME`
   and deletes `$HOME/.codex-bench/`; the ledger records the date.
9. **Disclosure.** The method page and the comparison say that Codex's sessions ran on a ChatGPT Plus subscription,
   that their cost is API-equivalent from a pinned OpenAI price table (`costBasis: price-table`, flagged as bug-016
   requires), and that an outside reproduction would most likely use an API key, whose routing and limits may differ.

What B takes on:

- **A credential that grants refreshes sits on disk** for about four weeks, outside the repository, readable by the
  maintainer's user and, while a session runs, by the container. Its blast radius is the maintainer's ChatGPT account,
  not the API.
- **The plan's usage limits** may stop a session part-way: the adapter must report Codex's limit messages as
  `quota exhausted` or `rate limited` (REQ-RUN-13), not as failures. Their shape is checked offline from fixtures and
  observed only if it happens.
- **Models:** the Plus plan offers Codex the models it grants, which may differ from the API's list; the spike's free
  reads pin the model before any spending.
- **The subscription's charge** is a note in `docs/calibration/v0.2-ledger.md`, not a per-run cost (sequencer
  decision 1).

## Consequences

- **Requirements amendment, by the Codex spike task:** `agent.name` gains `codex` (`AGENT_NAMES`); REQ-RUN-15 gains a
  Codex paragraph (the subscription's `auth.json` under this decision; `CODEX_API_KEY` as the documented variant);
  REQ-NFR-01 names this decision as the one exception to its read-only mount; REQ-RUN for the adapter (command line,
  usage from `turn.completed`, cost from the price table, resume, limits).
- The Codex spike task's Design applies bounds 1–9 and lists each real session with its model, scenario and cap; its
  pending → backlog approval is the consent.
- The delivery sessions' brief reads this decision beside its "credentials never reach disk" rule, for this spike
  only.
- If the approver later prefers A, only bounds 2–8 fall away: the adapter's usage, cost and price table are the same.
