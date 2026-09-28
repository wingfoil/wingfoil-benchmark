---
id: task-031-third-party-oracle-material-pinned-by-commit-or-sha256
type: task
title: "Third-party oracle material pinned by commit or sha256"
status: backlog
release: v0.1
wave: W7
features: []
acceptance: [scenarios.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-FMT-09]
---

## Context

First task of wave **W7 — First content** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), whose
"Ends with" is "S1 and S2 scored in all three arms". It delivers no feature: it implements
[dl-002](../decision-log/dl-002-third-party-oracle-material-without-a-git-commit.md) (approved), which W1
left "due before W7" and the approver made **W7's first task** on 2026-09-28. S1 (F6.1, task-032) cannot
be written against today's format: `oracle.third_party` requires a 40-hex `commit`
(`src/core/scenario.ts`), and S1's RFC examples have none.

Scope, as dl-002 decided (option 1, a content hash for non-git material):

- **A `third_party` entry is pinned by exactly one of `commit` (40-hex, a git source) or `sha256` (of
  the material as vendored into the oracle)**, with `name`, `url` and `license` as today. Neither or
  both is a validation issue naming the entry.
- **The pin is checked, not only declared:** `bench scenario validate` recomputes the `sha256` of the
  vendored material and refuses a mismatch, naming the entry. What the hash covers — which files of the
  version directory an entry vendors, and how it names them (a `path` field or the suite's directory) —
  is this task's design, as is whether a `commit` entry's vendored copy is tied to its files too.
- **The license:** `license` is an SPDX expression today. The RFC examples come under the IETF Trust
  Legal Provisions, which have no SPDX identifier; whether a `LicenseRef-…` is accepted, and how it is
  documented, is decided here. *Which* license applies to RFC 6901 §5 and RFC 7386 Appendix A is
  confirmed in task-032, as dl-002 says, not assumed here.
- **S1's full SHA:** `json-patch-tests` `2a928f9` resolved to its 40-character commit (from the upstream
  repository, read-only) and written into S1.md.
- **Amendments with a recorded review decision:** the scenario specs README §4 (to 1.2: "pinned to a
  commit, or by the sha256 of the vendored material when it has none") and S1.md (to 1.2: the full
  SHA, and §6's RFC examples pinned by `sha256`); requirements.md REQ-FMT-04 (the next amendment, 1.10)
  if its wording ("third-party pins with licenses") needs the choice spelled out.
- **The fixtures and the hash:** a fixture scenario with one entry of each kind; the content hash
  (REQ-FMT-09) already covers the vendored files, as it covers the whole version directory. No scenario
  version with stored results declares a `third_party` entry, so none is affected (F3.4).

Out of scope: vendoring S1's material itself (task-032); scoring third-party suites (they run as hidden
tests in a suite, through task-027's path).

**Done** means: a scenario pins non-git material by `sha256` and git material by a full `commit`,
`bench scenario validate` refuses a missing, doubled or wrong pin, README and S1.md are amended with
S1's full SHA; tests, coverage and lint pass.

### W7 plan-phase decisions (accepted by the approver, 2026-09-28, `4dbb6c9`)

1. **Four tasks, in this order:** task-031 third-party pins (dl-002); task-032 S1 conformance scenario
   (F6.1); task-033 S2 injected-bug scenario (F6.2); task-034 results store and aggregation (F5.1). The
   wave's "Ends with" holds after task-033; task-034 aggregates the wave check's campaign, so the check
   is made once, after task-034.
2. **dl-002 is its own task, first** (the approver's decision of 2026-09-28): it changes the format and
   the validator and amends two approved documents, a review of its own, and task-032 writes S1 on the
   format it leaves.
3. **The content tasks follow `scenario-authoring`** (plan-003), phases goal, seed, prompts, oracle and
   validate. **`calibrate` is plan-003 step 3's**, not W7's: the real-agent dry runs of S1 and S2 in every
   arm, with the approver's consent and a ledger line each, happen in calibration with S3 and S8.
   **`register` follows calibration too:** S1@1.0 and S2@1.0 stay changeable until calibration has run
   (no result of theirs is stored in this repository during W7, see 4), so a difficulty change found by
   calibration is not a new version.
4. **The wave check and `scenarios.feature` @F6.1/@F6.2 run on the fake agent.** Each content task adds
   scripted fake sessions that write a reference solution into the workspace, so that a run's
   snapshots hold code the hidden tests can pass; the check scores S1 and S2 in the three arms and
   aggregates them, in a temporary repository, as W6's did. The outline's "recorded dry-run cost" is
   the fake's (zero); real costs are calibration's. **No real-agent half** (`real-agent-check` not
   taken) and **no spending in W7.**
5. **S2's reference fixes are hold-out content.** They are the answer key, which S2.md keeps out of
   this repository: task-033 writes them, and the fake sessions that replay them, in
   `WingFoil2-Benchmark-HoldOut`, and its tests that need them skip when no hold-out is configured, as
   task-016's did. S1's reference solution is public (the conformance suite is), in `test/fixtures/`.
6. **S2's M-D2 content checks are written in W7 and scored in W8.** task-033 declares the false-report
   and the duplicate checks as `oracle.checks` (REQ-SCO-06's patterns); running them is F4.8's (W8).
   W7 scores what hidden tests measure: M-D1 (defects fixed), M-D3 (regressions) and the documented
   behaviour behind the false report.
7. **Aggregation's rules come from what W5 and W6 left** (task-034): every value with its runs and `n`
   (REQ-FMT-07), dry runs never read (REQ-RES-01), an expected failure and a `not_reached` final
   snapshot counted as losses with the reason named, the Opus slice reported apart (T14), hold-out
   results apart and `holdout.scored: false` shown.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- REQ-FMT-04 as amended — a `third_party` entry with `sha256` and no `commit` is valid; with both, or
  neither, an issue naming the entry. **red-first**
- dl-002 — a `sha256` that does not match the vendored material is refused by `bench scenario
  validate`, naming the entry. **red-first**
- REQ-FMT-04 — a `commit` that is not 40-hex is still refused (S1's `2a928f9`). **characterization**
- REQ-FMT-04 — the license of non-SPDX material as an SPDX `LicenseRef-…`. **characterization**
  (design: the expression check already accepts it)
- REQ-FMT-04 — an entry names the files it vendors, which exist, lie in a suite and are vendored by no
  other entry; `sha256` pins exactly one file. **red-first** (added in the design)
- REQ-FMT-09 — a change in a vendored third-party file changes the version's hash.
  **characterization**
- `scenarios.feature` @F3.1, @F3.2 and @F3.4 stay green. **characterization**

## Design

**Classification confirmed**, with two changes. The license criterion is **characterization**: the
existing `isSpdxExpression` does not check identifiers against the SPDX list, and SPDX's own form for a
license outside the list, `LicenseRef-<idstring>` (letters, digits, `.` and `-`), already matches its
`SPDX_ID`, so a test only fixes that it is accepted. And one **red-first** criterion is added, for the
`files` an entry vendors (below). Everything else stays as classified.

### The entry — `commit` or `sha256`, and the files it vendors (REQ-FMT-04 as amended)

```yaml
oracle:
  third_party:
    - name: json-patch-tests
      url: https://github.com/json-patch/json-patch-tests
      commit: 2a928f9044aad35c74e2788d498bcf2c6b91adea
      license: Apache-2.0
      files: [oracle/patch/tests.json, oracle/patch/spec_tests.json]
    - name: RFC 6901 section 5 examples
      url: https://www.rfc-editor.org/rfc/rfc6901#section-5
      sha256: <64 hex, of the file's bytes>
      license: LicenseRef-…            # which one: task-032 (dl-002)
      files: [oracle/pointer/rfc6901-examples.json]
```

In `src/core/scenario.ts`, `thirdParty` stays a strict object:

- `name`, `url` and `license` unchanged;
- `commit`: optional, 40 lowercase hex, the message unchanged (S1's `2a928f9` is still refused);
- `sha256`: optional, 64 lowercase hex, `must be a 64-character SHA-256 in lowercase hex`;
- **`files`: required**, a non-empty list of relative paths (the existing `relativePath`), with no
  duplicates by `samePathKey`. It is what the entry vendors into the oracle: dl-002 pins "what is
  actually used", and a license is recorded for something, so the entry names that something. It is
  required for `commit` entries too, since they are vendored as well; no stored scenario declares an
  entry, so nothing breaks.

A `superRefine` on the entry adds, each an issue on the entry's path:

- neither `commit` nor `sha256`: `oracle.third_party[i]`: `must be pinned by commit or by sha256`;
- both: `oracle.third_party[i]`: `must be pinned by commit or by sha256, not both`;
- `sha256` with more than one file: `oracle.third_party[i].files`: `must name one file when pinned by
  sha256`. **One file per `sha256` entry**, so that the pin is the file's plain SHA-256 and anyone
  can check it with `sha256sum`, with no hashing convention of the benchmark's to learn. S1's two RFC
  sources are two entries.

Across entries, on the `oracle` object: a file named by two entries is an issue on the later one
(`oracle.third_party[i].files[j]`: `is vendored by oracle.third_party[k] too`). Two licenses for the
same bytes cannot both be right.

### The loader — the files exist, sit in a suite, and match their `sha256`

In `src/scenario/load.ts`:

- **Each file is a declared path**, kind `file`, `oracle.third_party[i].files[j]`, checked by
  `fileIssues` like any other. It must exist and stay inside the version directory.
- **Each file lies inside a declared suite's directory**, checked on real paths after `fileIssues`,
  with the issue `'<file>' is in no suite of oracle.suites`. Vendored material is oracle material:
  inside a suite it is hidden from the seed and the prompts by the existing overlap rules, leak-scanned
  by `oracleFiles`, and mounted read-only for scoring. Outside every suite, nothing would guarantee
  any of that. A check (REQ-SCO-06) is a pattern file of the benchmark's, not third-party material.
- **A `sha256` entry's file is hashed and compared**, and on a mismatch the issue is
  `oracle.third_party[i].sha256`: `does not match <file>`. The loader does it, not only
  `bench scenario validate`: `campaign run`, `dry-run` and `bench score` all load the scenario, so
  material that changed after it was pinned stops every one of them, and the scorer checks it "byte for
  byte" as dl-002 wants.
- **A `commit` entry is not checked against its source.** That would need the network and the upstream
  repository at run time, which REQ-SCO-01 and the determinism directive rule out. Its files are covered
  by the version's content hash (REQ-FMT-09) once the version is registered. How they were taken from
  the commit (`git show <commit>:<path>`) is recorded in S1's authoring task, so anyone can repeat it.

Order of issues: schema, identity, suite steps, declared paths on disk (the vendored files after the
checks, in declaration order), arms, then the vendored files outside a suite and the `sha256`
mismatches, then the overlaps, as today. The last two need files that exist, so they run only when
there is no issue before them.

`Scenario.oracle.thirdParty` becomes `readonly ThirdParty[]`: `{ name, url, license, pin: { commit } |
{ sha256 }, files }`, with `files` absolute like every other loaded path. The union makes "exactly
one" a fact of the type and not a convention. Nothing reads it downstream today; scoring and the site
(W11, the licenses on the method page) will.

### The hash and the leak scan

- **REQ-FMT-09:** unchanged. `scenarioHash` covers every file of the version directory, and the
  vendored files are among them. A test fixes it for a vendored file.
- **REQ-FMT-08:** unchanged. A vendored file sits in a suite, so `oracleFiles` scans it. That the
  vendored JSON is full of literals is task-032's concern (its Context).

### S1's full SHA (read-only, from upstream)

`git clone --filter=blob:none https://github.com/json-patch/json-patch-tests` into a scratch directory,
outside the repository, then `git rev-parse --verify '2a928f9^{commit}'` →
**`2a928f9044aad35c74e2788d498bcf2c6b91adea`**. It is unambiguous, and it is still upstream's `HEAD`:
"Merge pull request #46 from cyangle/change_after_copy", 2025-02-21. At that commit `tests.json` has
95 cases (3 `disabled`) and `spec_tests.json` 17 (1 `disabled`), as S1.md §6 says. Its `package.json`
and README say Apache-2.0. Nothing is vendored here. task-032 takes the two files from this commit.

### The amendments (each with a recorded review decision)

- **Scenario specs README 1.2, §4:** "Third-party test material is pinned to a commit when it comes from
  a git repository, or else by the SHA-256 of the file as vendored into the oracle; the entry names the
  files it vendors, which lie in a suite, and records their license, as an SPDX identifier or a
  `LicenseRef-` when the license has none (dl-002)."
- **S1.md 1.2, §6:** `json-patch-tests` pinned at `2a928f9044aad35c74e2788d498bcf2c6b91adea`; the RFC 6901
  §5 and RFC 7386 Appendix A examples are vendored as one file each and pinned by its `sha256`, with
  their license confirmed at authoring (task-032).
- **Requirements 1.10, REQ-FMT-04:** "third-party pins with licenses" becomes "third-party material as
  `{name, url, commit | sha256, license, files[]}`, pinned by exactly one of the two (dl-002)". The
  traceability matrix is unaffected.

### Tests

- **Unit, `test/unit/scenario/load.test.ts`**, red first: an entry with `sha256` only is valid; neither
  and both are refused; `sha256` with two files; a `sha256` of the wrong length or case; `files`
  missing, empty or repeated; a file named by two entries; a file that does not exist, is outside the
  version directory, or is in no suite; a `sha256` that does not match; the loaded `pin` for each kind,
  and absolute `files`. Characterization: `2a928f9` refused as a commit; `LicenseRef-IETF-Trust`
  accepted; a change in a vendored file changes `scenarioHash`.
- **The fixture** (`test/support/scenario-fixture.ts`): the complete scenario declares one entry of each
  kind, with a vendored file in each suite and the `sha256` computed from the fixture's own bytes.
- **The command:** `bench scenario validate` on a scenario whose vendored file was edited after it was
  pinned exits 1 and names `oracle.third_party[i].sha256`. This is dl-002's criterion, tested where
  task-016 and task-017 tested the command.
- **Acceptance:** `scenarios.feature` @F3.1, @F3.2 and @F3.4 green on the updated fixture. No scenario
  is added to the approved `.feature` file: dl-002 is a decision, not a feature, and its criteria are
  the requirement's and the command's tests above.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `6c8d148`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W7 tasks of release v0.1` (`02edf51`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-031-third-party-oracle-material-pinned-by-commit-or-sha256` → `0dab965`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
