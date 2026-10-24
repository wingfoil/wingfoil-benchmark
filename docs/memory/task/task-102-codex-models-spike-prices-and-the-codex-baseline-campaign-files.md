---
id: task-102-codex-models-spike-prices-and-the-codex-baseline-campaign-files
type: task
title: "Codex models spike, prices and the Codex baseline campaign files"
status: in-progress
release: v0.3
wave: W15
features: []
acceptance: []
requirements: [REQ-ARC-04, REQ-RUN-09, REQ-RUN-13, REQ-RUN-15, REQ-NFR-01]
fixes: []
tags: ["codex","spike","v0.3"]
---

## Context

[dl-022](../decision-log/dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)'s
Codex campaign, arm A: the baseline arm on S1, S2, S3 and S8 at 1.0 (the baseline's digest `964b1354526c`), Codex CLI
0.162.1 on Sol, Terra and Luna at one reasoning effort, on the maintainer's ChatGPT Plus subscription, which ends on
**2026-11-13**. W15 of [plan-005](../../plans/plan-005-release-v0-3.md), after task-101 and after
[dl-024](../decision-log/dl-024-the-codex-campaign-s-subscription-credential-on-dl-019-s-model.md) (the credential) is
approved. A spike: no feature, no acceptance scenario.

**The pending → backlog approval of this task is the consent for its real sessions:** one Codex session per model (3),
each on S3's first step, from the main checkout, under dl-024. The dry runs and the campaign are consented separately
in `campaign-cycle`.

**Done** means: the three models' ids, effort levels and quota indicator verified; their list prices in the price
table; dl-024's code bounds in place; `campaigns/codex-baseline.yaml` and its dry-run profile, validating.

## Acceptance criteria

1. Terra's and Luna's model ids under Codex 0.162.1, the reasoning effort accepted by all three, and how the Plus
   quota shows in Codex's output, each read from one real session and recorded in the Execution notes. **Spike.**
2. Their list prices in `src/agents/openai-prices.ts`, with the source and the date read. **Red-first** (the price
   table's tests).
3. dl-024's bounds enforced: a Codex run past 2026-11-13 or from a campaign outside its scope refused; the adapter's
   thread map cleared at the end of each run; `CODEX_HOME`'s sqlite stores cleared before every step. **Red-first.**
4. A failed or killed Codex invocation recorded at its bound, not as zero
   ([bug-032](../bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md), the Codex case), checked
   offline from fixtures. **Red-first.**
5. `campaigns/codex-baseline.yaml` extending `baseline-across-agents` (or, with dl-022's fallback, a whole file) with
   `agent: codex`, the three models and S1–S8 at 1.0, and its dry-run profile; both pass `bench campaign validate`
   and `estimate`. **Characterization.**

## Design

- **The phases**, as task-094's (`spikes/task-094/probe.sh` is the model):
  - **Free, no session:** Codex 0.162.1's model presets and effort levels read from its released source; Terra's and
    Luna's list prices read from OpenAI's pricing page; both recorded with their source and the date read. If a
    model is not offered to Codex 0.162.1, or has no list price, the task stops and asks.
  - **Offline code** (criteria 2–5), reviewed by an independent agent before any real session, one round at a time
    under dl-020.
  - **The three real sessions** (the consent of this task's pending → backlog approval): `spikes/task-102/probe.sh`
    runs S3@1.0 step 1 in the baseline arm, outside the runner, once per model (Sol, Terra, Luna) at the effort F1
    reads, `step_time_s` 1800 s. **Spending: 0 €** (the Plus quota); API-equivalent expected well under 1 USD a
    session, recorded and flagged `price-table`. A failed session is not repeated without new consent. The secret scan
    after each session. One line of `docs/calibration/v0.3-ledger.md` each.
  - The approver logs in by hand first (dl-024, dl-019 bound 3): `CODEX_HOME=$HOME/.codex-bench`, `codex login
    --device-auth`, `cli_auth_credentials_store = "file"`. The session names the path only.
- **dl-024's bounds in code:**
  - `bench campaign run` and `bench scenario dry-run` refuse `agent.name: codex` after **2026-11-13** (the clock
    injected, so that the test is not dated), and a Codex campaign that does not extend
    `presets/baseline-across-agents.yaml` (dl-022's fallback, a whole file, would need the approver's word and an
    amendment of dl-024 first); a Codex dry-run profile must hold the baseline arm only.
  - The agent port gains an optional `endRun()`, called by the runner after each run; the Codex adapter clears its
    thread map there.
  - `CODEX_HOME`'s stores are already emptied before every step but `auth.json` and `config.toml`
    (`src/agents/profile.ts`, task-094): characterization.
- **A failed Codex invocation's cost** ([bug-032](../bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md),
  its Codex case): when the stream holds no `turn.completed`, the adapter says its usage is not reported, and the
  runner counts the step at its bound, as it does a killed one (`cost_reported: false`). bug-032's other cases stay
  with W16.
- **The campaign files:** `campaigns/codex-baseline.yaml` extends `presets/baseline-across-agents.yaml` with `agent:
  codex` (the version and effort F1 pins), `models` (Sol by default, Terra and Luna as slices over every scenario of
  the baseline arm, so that one execution holds the three) and the budget in API-equivalent euro; its dry-run profile
  `campaigns/codex-baseline.dry-run.yaml`, written whole (task-101: profiles do not extend presets).
- **Requirements 1.35:** REQ-NFR-01's exception restated for dl-024's scope; the Codex refusals (REQ-RUN-15);
  `endRun` (REQ-ARC-04); the failed invocation's bound (REQ-RUN-09).

## Execution notes

- `npm run -s wingfoil -- memory add --type task --title "…" --tags "…"` on main, at v0.3's release-planning
  (2026-10-24). Declared: the element from the template in `draft`, one commit. Observed: as declared.
- The body committed by hand (`e7a5e1e2`), then `memory submit` (draft → pending). Declared and observed: one commit,
  `status: pending`.
- The approver's pending → backlog in chat (2026-10-24). `memory submit` (backlog → in-progress, `e8805f6b`) on main,
  after the Design. Declared and observed: one commit each.
- **The free phase (2026-10-24, no session, no credential)**, in the main checkout's ignored `spikes/task-102/out/f1/`:
  - `@openai/codex` `latest` is **0.164.0** (2026-10-23); dl-022 pins 0.162.1, task-094's, which is kept.
  - Codex's `models.json` at `rust-v0.162.1` (task-094's copy) and `rust-v0.164.0` lists the same models on the Plus
    plan, and **no generation-6 Terra**: Sol as `gpt-6.1-sol`, `gpt-6-sol`, `gpt-5.6-sol`; Terra only as
    `gpt-5.6-terra`; Luna as `gpt-6-luna`, `gpt-5.6-luna`; `gpt-6-astra` beside them. The Design's stop: asked.
    **The approver's choice in chat: option A**, the latest of each name, `gpt-6.1-sol`, `gpt-5.6-terra`,
    `gpt-6-luna`, at `medium` (every one offers it; Luna has no `ultra`).
  - Their list prices from OpenAI's pricing page, Standard tier, short context, read from the page's raw data
    (`pricing.html`): Terra 2 / 0.2 cached / 2.5 write / 12 output, Luna 0.1 / 0.01 / 0.125 / 0.5 USD per million
    tokens; Sol unchanged. WebFetch's summary gave the same figures, but Terra's row is only in the page's data, so the
    raw extract is the source (`sources.txt`).
- **Build** (on `task/task-102`): requirements 1.35 (`8b541d7a`); red (`d59f1c1e`); code
  (`0186ed6c`: prices, `costUnknown`, `endRun`, dl-024's scope); the campaign files and their test
  (`3361fec1`); the probe (`spikes/task-102/probe.sh`), rehearsed with a stub for one model, then for three after
  review round 1, and
  with a planted value, which the scan found.
- **Tests changed with the code, disclosed:** `test/unit/cli/codex-credential.test.ts`'s Codex campaign run now
  extends the preset, since dl-024 refuses one that does not; `test/unit/agents/codex.test.ts`'s characterization of
  a session failed after a `turn.completed` used `failed.jsonl`, which has none: rewritten on an inline stream before
  the code commit; `codex-baseline.test.ts`'s model list deduplicated when the slices were split (review round 1).
- **Criterion 5:** both campaign files pass `bench campaign validate`; `estimate` refuses the campaign until its dry
  runs exist (11 of 12 keys have none; S3 on Sol is task-094's), as it should before the dry runs.

- **The approver's login** (dl-024, dl-019 bound 3), by hand on 2026-10-24, with the two commands the probe's LOGIN
  stage printed (`install -d -m 700 $HOME/.codex-bench …`, then `codex login --device-auth` in the probe's image with
  the credential bind-mounted). The session named the path only and never read, printed or listed the file.
- **The three real sessions** (2026-10-24, the consent of task-102's pending → backlog, `c5e55182`):
  `BENCH_SPIKE_CONFIRM=1 ../WingFoil2-Benchmark-wt/task-102/spikes/task-102/probe.sh SOL SCAN TERRA SCAN LUNA SCAN`
  from the main checkout, the worktree's probe and `dist/` at `50fab163`. Each `completed` in one turn, no
  intervention, exit 0; every secret scan clean, the final one included; no container left. API-equivalent
  (`price-table`), 0 € spent:

  | Session | Model | Events | Wall time | Fresh in | Cached in | Out | USD |
  |---|---|---|---|---|---|---|---|
  | SOL | `gpt-6.1-sol` | 28 | 87.8 s | 6 376 | 170 624 | 3 763 | 0.0674 |
  | TERRA | `gpt-5.6-terra` | 23 | 79.4 s | 13 384 | 132 864 | 3 516 | 0.0955 |
  | LUNA | `gpt-6-luna` | 18 | 29.8 s | 6 675 | 100 864 | 2 883 | 0.0031 |

  Figures from each session's `adapter.json` and `duration-ms.txt` (`spikes/task-102/out/<SESSION>/`). Three lines of
  `docs/calibration/v0.3-ledger.md`, created by this task.
- **Criterion 1, read from the sessions:** the three model ids are accepted by Codex 0.162.1 on the Plus plan;
  `model_reasoning_effort="medium"` is accepted under `--strict-config` by all three (no error on stderr, one line
  each); **the Plus quota does not show** in the `--json` stream (only `thread.started`, `turn.*` and `item.*` events)
  nor on stderr while it lasts: it shows only when it ends, as the usage-limit message the adapter already reads as
  `quota exhausted`. What is left of it is read by the approver on the account's usage page, before each stage of the
  campaign.

### Review

Under dl-020; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, the offline work `git diff main...HEAD`, before any session):
  - **blocker:** the probe overwrote its EXIT trap per session, leaving earlier sessions' containers running with the
    credential mounted. Fixed: each session's container is removed at its end, and an exit handler removes every
    container started (`8f64396a`); the three-model rehearsal leaves none.
  - **should-fix:** the edited Codex test and `test/docker/codex.test.ts` were dated and the docker one refused by
    dl-024; the scope check had no test where it is wired; Terra's and Luna's slices ran S1 once against Sol's three;
    a quota stop with no `turn.completed` counted as zero; `endRun`'s `finally` path untested. Fixed: the clock moved
    to `Io.now` and injected in both tests, the docker test extends the preset; three CLI tests with an injected
    clock (date, preset, profile), each building nothing; the slices split (S1 × 3, the others × 1); `costUnknown` for
    any outcome with no `turn.completed`, the runner keeping the stop and counting the bound; a test that `endRun` is
    called on a failed run. **Not fixed, stated:** no port double makes `executeRun` itself throw (a failing
    container, git or agent is a failed run; a failing `list` throws before any run), so the `finally` stays
    defensive and untested. Red `9d00bee8`, fix `8f64396a`.
  - **nits, fixed:** a Codex dry run must read `campaigns/codex-baseline.dry-run.yaml`; REQ-NFR-01 1.35 states "the
    campaign's last run or 2026-11-13, whichever comes first" and the main checkout, which the probe now checks; the
    probe's final scan uses every session's values, scans the workspaces' git history, and `secrets()` no longer
    quotes a malformed file; criterion 5's wording above. **Stated for the approver:** a Codex invocation refused at
    once (a model id or a login refused) now counts at its bound, about 5 € API-equivalent a run, capped by
    `fail_fast` at three runs; so does a session stopped at the Plus quota before any `turn.completed`, the expected
    way the quota ends, recorded with `cost_reported: false`.
- **Round 2** (a new independent agent, the fixes' diff `e404242c..HEAD`):
  - **blocker:** the probe's history scan piped `git log` into `grep -q` under `pipefail`: a match killed `git log`
    with SIGPIPE and read as clean (reproduced 5 of 5). Fixed without a pipe (process substitution, grep's status
    read), a git that cannot read the workspace meant to fail the scan (exit 3), which round 3 found only partly
    true; checked by hand on a workspace with a planted value buried under 30 commits: found 3 of 3 (exit 4).
  - **should-fix:** a rate-limited invocation was marked `costUnknown`, which the runner's wait never reads. Fixed:
    the adapter marks only a failure and a quota stop; a rate limit is waited out and resumed, and REQ-RUN-09 1.35
    says so. **Should-fix:** the dry-run profile rule compared the basename only, so a copy elsewhere passed. Fixed:
    the profile's path in the repository is compared, with a CLI test of a copy under `spikes/`.
  - **nits, fixed:** the approver's statement above includes the quota stop; the notes' wrap; a malformed
    credential now stops the probe with a message.
  - Red `e0425edc`, fix in the commit after it.
- **Round 3** (a new independent agent, round 2's fixes):
  - **Incident:** the reviewer's own scratch helper ran `git -C "" reset --hard HEAD~1` with an empty path, in its
    cwd, the main checkout: `main` moved from `e8805f6b` to `bb344642` at 19:21 (reflog). No commit was lost (none
    came after) and the checkout was clean; uncommitted work of another session there, if any, could not be told.
    Restored by `git merge --ff-only e8805f6b`. Later reviewers are briefed to work in a fresh temporary directory,
    and the reflog is checked after each round.
  - **should-fix:** the history scan read `git log` in a process substitution whose status is never checked, so a
    store with missing objects scanned as clean; and `git log -p --all` missed a value only in the object store (a
    commit reset away, a staged file deleted). Fixed: `git fsck --connectivity-only` first (exit 3), then every
    object, packed or loose, reachable or not, through `git cat-file --batch-all-objects --batch` into a file grep
    reads and that is removed at once (on a signal only from round 4's fix on). Checked by hand on five workspaces:
    reset away, staged and deleted, buried under
    30 commits (each exit 4), clean (exit 0), objects removed (exit 3).
  - **nits, fixed:** the port's `costUnknown` comment and REQ-RUN-09 1.35 on a rate limit that outlasts the waits.
    **Stated:** the unit test of a copied profile was green at the red commit (the bug was the caller's basename;
    the CLI test is the red evidence); a `--profile` given through a symlinked working directory is refused, safely.
- **Round 4** (a new independent agent, sandboxed in a temporary directory; the reflog unchanged after it): the scan's
  detection reproduced on ten stores (committed and reset away with its reflog expired, staged and deleted, packed,
  in a commit message, clean, missing or truncated objects, an empty `.git`, no `.git`).
  - **should-fix:** the dump survived a signal (SIGINT, SIGTERM, SIGHUP) in `out/`, the objects uncompressed, and
    pointed every later scan at itself; the notes' "removed at once" was untrue then. Fixed: the dump's path kept
    globally and removed by the exit handler, INT, TERM and HUP turned into an exit that runs it, and any stale
    `.scan.*` removed before a scan reads. Checked by hand: a TERM sent while a 1.5 GB dump was being written, exit
    143, no dump left.
  - **nits, fixed:** every repository under a workspace is scanned, nested ones and gitfiles included (checked: a
    value only in a nested repository's pack, exit 4); a `mktemp` failure exits 3; the comment says that an object
    git itself cannot unpack is skipped.
- **Round 5** (a new independent agent, sandboxed; the reflog unchanged after it):
  - **should-fix:** a signal during the exit handler's own scan still left the dump; the INT, TERM and HUP traps made
    bash wait for the running child (a real Codex session for up to 30 minutes, a whole dump) before exiting; bare
    repositories, `--separate-git-dir` stores and orphaned submodule stores were not scanned.
  - **Fixed by simplifying** rather than patching: the objects are streamed from `git cat-file` into grep and never
    written to disk, git's status going to a file that holds no value (a match is found even if git is cut short;
    no match counts only when git read the whole store); no signal trap, since bash runs the exit handler on exit,
    TERM and HUP by itself; every store found by its structure (a `HEAD` file beside an `objects/` directory), work
    trees' `.git`, nested and bare ones alike; `find`'s own failure fails the scan (round 5's nit). Round 4's dump and
    its stale-dump removal are gone with it.
  - Checked by hand, paths with spaces: reset away, staged and deleted, buried and packed, nested, bare (exit 4 each),
    clean (0), objects removed (3); TERM and HUP during a slowed `cat-file` end the probe at once (143, 129) with
    nothing left in `out/`. An INT sent to a background job is ignored by bash, as for any background job; a Ctrl-C
    reaches the probe in the foreground.
- **Round 6** (a new independent agent, sandboxed; the reflog unchanged after it): the streaming, git's status and the
  signals sound (no race: grep sees the end of the stream only after git's status is written).
  - **should-fix:** stores found by a regular `HEAD` beside `objects/` failed open: a `HEAD` that is a symlink, a
    removed `HEAD`, an `objects/` moved away each scanned clean with the value committed. Fixed, failing closed: every
    directory shaped like an object store (`objects/` holding `pack/`, `info/` or a two-hex-digit directory) must
    belong to a store git opens and reads, or the scan fails (exit 3).
  - **nits, fixed:** the failure message read git's status after removing its file; the temporary files (git's
    status, the stores' list, no value) now live in one `mktemp -d` directory removed on every explicit exit and by
    the exit handler (not when a signal ends the exit handler itself: round 7); the status file is emptied before
    each store. **Stated:** after a TERM or HUP the exit handler
    reruns the whole final scan before the probe exits, and a scan cut short leaves its grep and git to finish, writing
    nothing.
  - Checked by hand on eleven workspaces (paths with spaces, `TMPDIR` watched): reset away, staged and deleted,
    packed, nested, bare (exit 4 each); clean, and an agent's own `src/objects/` (exit 0); objects removed, a symlinked
    `HEAD`, no `HEAD`, `objects/` moved (exit 3 each); no temporary file left.
- **Round 7** (a new independent agent, sandboxed; the reflog unchanged after it):
  - **blocker, a regression of round 6:** `find -type d` follows no symbolic link and git does: an `objects/` or a
    `pack/` reached through a symlink scanned clean with a committed value, which round 5's version caught. Fixed:
    `find -L` for the stores and their shape.
  - **should-fix:** "fails closed" was overstated: an `objects/` renamed (`.git/objx`) scanned clean, and "objects/
    moved" failed only when it kept its name. Fixed: the workspace's own `.git`, which the probe made, must be a store
    git opens, so a renamed or moved `objects/` fails the scan. **The limit is now stated in the probe:** bytes that
    are compressed and that no git store names are read by neither grep nor git; the scan guards against a value that
    reaches the results by accident, not against an agent hiding one on purpose.
  - **should-fix:** "removed on every exit path" was untrue when a signal ends the exit handler's own scan. Narrowed
    above; the directory holds no value. The handler's `rm` no longer aborts it under `set -e` (`|| true`).
  - **nit, stated:** an agent's own `objects/` holding `info/`, `pack/` or a two-hex-digit directory (`src/objects/db/`)
    fails the scan, falsely but safely.
  - Checked by hand on round 6's workspaces with the same outcomes but `objects/` moved, now refused by
    the own-store check (3); `objects/` renamed (3); `src/objects/db/` (3, the stated false positive); `objects/` and
    `pack/` through symlinks (4 each); no temporary file left.
- **Round 8** (a new independent agent, sandboxed, scoped to the scan's stated purpose; the reflog unchanged after
  it): no regression, no blocker, no should-fix. **Nits, fixed:** the comment says every symbolic link is followed and
  that a link loop or one into an unreadable host path fails the search, falsely but safely; the stated limit covers
  every compressed file outside a git store (an archive, a bundle), not only git objects; a hand-typed count of
  workspaces removed from round 7's note. **The review of the offline work is closed.** The three real sessions and
  their reading get their own round before in-review.
