---
id: task-047-manual-publish-and-transcript-assets
type: task
title: "Manual publish and transcript assets"
status: in-review
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

Classified in the design phase. Everything here is new behaviour.

- `results.feature` @F5.6 "Publishing is explicit": with a built site and no publish requested, nothing is
  pushed anywhere. **red-first**
- `results.feature` @F5.6 "Publishing deploys exactly the built site": `gh-pages` holds exactly `site/`, and
  the published pages show the same numbers as the results store for that execution. **red-first**
- REQ-RES-04: publishing is refused while the repository is private, and when visibility cannot be read.
  **red-first**
- `bench site publish` is refused with no `site/`, or with a `site/` that differs from a fresh build of its
  executions. **red-first**
- REQ-RES-06: an execution's transcripts give one archive for the release `<campaign-id>-<n>`, each run's
  `run.json` records the asset, `bench run show` names it when the transcript is not on disk, and the
  `gh release` command is printed, not run. **red-first**
- REQ-NFR-01: an archive holding a known secret value is refused. **red-first**
- REQ-NFR-05: the same transcripts give the same archive bytes. **red-first**

## Design

Four findings shaped this design:

- **The remote is `git@github.com:wingfoil/wingfoil-benchmark.git`**, private, with no `gh-pages` branch and
  no Pages (read-only check, 2026-09-30). Pages is enabled by the approver at plan-003 step 6 (W11 decision
  5); this task pushes a branch and never calls GitHub's API to change anything.
- **"Is the repository public?" has an answer that needs no token:** an anonymous
  `git ls-remote https://github.com/<owner>/<repo>.git`, with `GIT_TERMINAL_PROMPT=0` and no credential
  helper, succeeds only for a public repository. A private one, a network error or an unknown host all
  fail, and every failure is a refusal: publishing never happens on a doubt.
- **`site/` is git-ignored and rebuilt from committed results** (task-045). So `publish` can check that what
  it is about to push is exactly what the results store gives: it rebuilds each execution under `site/` in a
  temporary directory and compares the bytes. A stale or hand-edited `site/` is refused.
- **Transcripts are git-ignored and already scrubbed** of the token the runner passed (REQ-NFR-01,
  `scrub` in `src/agents/claude-code.ts`); `run.json`'s reader schemas accept a new key.

### `bench site publish` (REQ-CLI-09, REQ-RES-04)

```
bench site publish [--remote <name>]
```

1. `site/` must hold `index.html`, `style.css` and at least one `<campaign-id>/<n>/`, each with
   `results/<campaign-id>/<n>/aggregate.json`; otherwise refused, naming what is missing.
2. Each execution under `site/` is rebuilt into a temporary directory with `buildSite`; any byte that
   differs is refused ("`site/` differs from a fresh build of …: run `bench site build`").
3. The remote (`origin` by default) must be a GitHub URL (`git@github.com:o/r.git` or
   `https://github.com/o/r(.git)`); the anonymous probe must succeed. Otherwise refused: "the repository is
   private, or its visibility cannot be read: publishing waits for a public repository (REQ-RES-04)".
4. In a temporary clone: fetch the remote's `gh-pages` if it exists, replace its whole tree with `site/`'s
   files, commit `site: publish <id>/<n>[, …]` with the built executions named and the root page's target,
   and push `gh-pages` to the remote (never with force). Nothing in the repository's own working tree,
   index or branches changes.
5. It prints the commit and the executions published.

Git runs through a new `publish` port (`ls-remote`, `clone`/`fetch`, `commit`, `push`), so tests drive a
local bare repository and a stubbed probe; no test reaches GitHub.

### `bench transcripts pack <campaign-id>/<n>` (REQ-RES-06)

1. Every run of the execution (its `aggregate.json`'s groups and slices) and each step's
   `transcript.jsonl`; a run with none is listed and the pack goes on.
2. **Secrets:** every transcript is checked for the value of the agent token (`BENCH_AGENT_TOKEN_FILE`,
   REQ-RUN-15, when set) and for the shape of an Anthropic key or token (`sk-ant-`). A match refuses the
   pack, naming the file and line, never the value.
3. **The archive:** `releases/<campaign-id>-<n>/transcripts.tar.gz` (git-ignored), made with GNU tar's
   reproducible flags (`--sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner`) and `gzip -n`, the
   paths relative to the execution (`runs/<scenario>@<v>/<arm>/<model>/r<k>/steps/<NN>/transcript.jsonl`).
   The same transcripts give the same bytes.
4. **`run.json`** of each run gains `transcripts: { "release": "<campaign-id>-<n>", "asset":
   "transcripts.tar.gz", "sha256": "<archive>" }` (the steps it holds are its paths). Written in the
   aggregate's key order, so the file stays canonical.
5. It prints the archive, its SHA-256, the runs without transcripts, and the command it does **not** run:
   `gh release create <campaign-id>-<n> releases/<campaign-id>-<n>/transcripts.tar.gz --title "…" --notes "…"`.
6. `bench run show` says "transcript not on disk; in release `<release>`, asset `<asset>`" when `run.json`
   records one.

### Modules

- `src/site/publish.ts` (new): the checks, the rebuild comparison, the push through the port.
- `src/results/transcripts.ts` (new): the pack, the secret check, the `run.json` update.
- `src/core/ports/publish.ts` (new): the git operations of publishing, with the system implementation.
- `src/cli/site.ts` gains `publish`; `src/cli/transcripts.ts` (new); `src/cli/show.ts` names the asset;
  `USAGE` gains two lines; `.gitignore` gains `/releases/`.
- Tests: the probe's URL forms and refusals; the rebuild comparison; publishing to a local bare repository
  (history kept, exactly `site/`, the working tree untouched); the pack's bytes twice, the secret refusal,
  the `run.json` record, `run show`; @F5.6 ×2 through `main`; `test:bin`.

### Requirements 1.22

- **REQ-CLI-09:** `publish`'s form, its checks and refusals, its output.
- **REQ-RES-04:** the visibility probe, the push without force, the commit naming the executions.
- **REQ-RES-06:** the pack command, the archive, the `run.json` record, the secret check.
- **REQ-CLI** gains `bench transcripts pack` (a new id, REQ-CLI-11).

No ADR.

### Choices to confirm

All three confirmed by the approver as proposed, 2026-10-01.

1. **`publish` rebuilds every execution under `site/` and refuses any difference:** what is pushed is, byte
   for byte, what the committed results give, as @F5.6 asks.
   - *Alternative:* push `site/` as it is, after checking only that it exists. Faster, but a stale or
     edited page could be published.
2. **`gh-pages` keeps its history:** each publish is a commit on top of the remote branch, never a force
   push. The published history is itself a record.
   - *Alternative:* an orphan commit force-pushed each time: a smaller branch, no history.
3. **Visibility is read by an anonymous `git ls-remote` over https,** with no token: it succeeds only for a
   public repository, and any failure refuses.
   - *Alternative:* `gh api repos/<o>/<r>` with the user's `gh` login: reads the `private` flag, but needs
     `gh` installed and authenticated where `publish` runs.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->

### WingFoil commands (declared vs observed)

- `npx wingfoil memory approve task-047-… --reason "…"`, by the approver on main on 2026-10-01 (`2f19583`):
  `pending → backlog`. Matches.
- `node_modules/.bin/wingfoil memory submit task-047-…` in the task's worktree, after the design (`4a03225`)
  and the approver's confirmation of its choices: `backlog → in-progress`, one commit, 1 file, a diff
  limited to `status`. Matches.

### After the reviews

The design held; the reviews made publishing safe against the maintainer's own environment and the pack
all-or-nothing:

- **The probe** runs in an empty directory that is its home, with no configuration of the system, the user,
  the repository or the environment, no credential helper and no netrc.
- **What is pushed is what is checked:** `site/` is copied aside, the copy's whole file set compared with
  fresh builds (a link, a special file or any entry no build gives refused), and the copy staged into an
  empty index of a clone that never checks out the remote branch; every publishing git command runs with
  no ignore or attributes file (attributes from the empty tree only), no line-ending conversion, no hooks,
  no monitor and no template.
- **The pack** checks and tars copies of the transcripts (a link refused), writes each record beside itself
  and renames it into place, and renames the archive last; a failure puts back what it wrote and removes
  what it created.

### Build

- `63af8fa` (red), `aaf2943` `feat`: `bench site publish`, `bench transcripts pack`, the publish port, `run
  show` naming the asset, `buildSite` into any directory; `1386088`: requirements 1.22 and traceability 1.2;
  `bbcbf8b`: task-045's build test no longer calls `publish` a usage error.
- **Checks on the last commit** (`25f50fe`): `npm test` 1194/1194, coverage 98.1%, lint clean, `npm run
  test:bin` 8/8.
- `test:docker` not run: nothing of the runner or the scoring image changed.
- No real remote was contacted by any test or review: the probe is stubbed in tests, and every push goes to
  a local bare repository.

### Review

Five rounds by fresh, read-only agents, each finding fixed test-first.

- **First** (the whole branch): the probe could read a private repository as public through the
  repository's config, `GIT_CONFIG_*` and netrc; a `site/.git` redirected the push; files outside any build
  were pushed; ignore files changed the tree; a check/copy race; a non-atomic pack. `88867fa`, `91cd2e2`.
- **Second:** an attributes file, a monitor and an init template could still change the bytes or run
  programs; a dangling link crashed the check; the pack scanned and tarred different bytes. `d6db6b7`,
  `ad55307`.
- **Third:** a `.gitattributes` on the remote's `gh-pages` ran the maintainer's filter at checkout;
  `GIT_ATTR_SOURCE` and the system attributes file; a failed record write left the pack half done; a
  transcript link packed its target. `ab31e57`, `6b163e0`.
- **Fourth:** a write failing part way cut a record short; `attr.tree` (git ≥ 2.46). `d81edea`, `1b271f4`.
- **Fifth:** no blocking defect; a restore that fails was not named, an empty release directory could
  remain. `fd6cec0`, `25f50fe`.
- `node_modules/.bin/wingfoil memory submit task-047-…` after the notes: `in-progress → in-review`, one
  commit, 1 file, a diff limited to `status`. Matches.
