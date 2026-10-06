---
id: task-063-eligibility-register-and-criteria
type: task
title: "Eligibility register and criteria"
status: in-progress
release: v0.2
wave: W12
features: [F7.4]
acceptance: [competitors.feature]
requirements: [REQ-FMT-01, REQ-FMT-11, REQ-RES-09]
---

## Context

F7.4, the first feature of W12 ([rel-v0-2](../release/rel-v0-2.md)): the published criteria a tool must meet to get an arm, written and applied
**before** any competitor arm is built, so that tools are admitted by a rule (T1).

**Scope:**

- `site-content/eligibility.md`, the five criteria (experiment design 1.2 §2);
- `eligibility/register.yaml` (REQ-FMT-11) with its schema. Entries for WingFoil v0.2.2, Spec Kit, OpenSpec and BMAD
  at their current versions, each criterion with its evidence, from
  [X_competitor-landscape-2026-10-05.md](../../01_vision/X_competitor-landscape-2026-10-05.md) and the spikes;
- `campaign validate` refuses a harness arm whose tool is not admitted at the pinned version (REQ-FMT-01);
- the eligibility page (REQ-RES-09, its eligibility half; the setup pages come with each arm).

**No real agent, no spending.** **Done** means: `competitors.feature` @F7.4 green.

## Acceptance criteria

- `competitors.feature` @F7.4: admitted, excluded (error), version not assessed (error), every assessed tool
  published. **Red-first.**

## Design

### Classification of the acceptance criteria

All four `competitors.feature` @F7.4 scenarios are **red-first**: nothing on `main` reads a register. Their tests go
in a new `test/acceptance/competitors.test.ts`, one `it` per scenario, titled as the traceability test requires.

### The register (REQ-FMT-11)

`eligibility/register.yaml` at the repository root, outside `arms/`:

```yaml
criteria: [agent-and-model, pinnable, headless-container, workflow-harness, no-own-llm]   # fixed order, REQ-RES-09
entries:
  - tool: wingfoil
    version: v0.2.2
    date: 2026-10-06
    criteria:
      agent-and-model: { result: pass, evidence: "…" }
      …                                    # all five, each pass or fail with its evidence
    verdict: admitted                      # or excluded
    reason: "…"
```

- **Schema** in `src/core/eligibility.ts` (strict, as `campaignSchema` and `armSchema`): the five criterion ids fixed
  in code, each required in every entry; `verdict` `admitted | excluded`; an `admitted` entry must pass all five and
  an `excluded` one must fail at least one (the verdict follows the criteria, never a choice: T1); one entry per
  `tool` + `version`.
- **Loader** `loadRegister(repoRoot)` in `src/campaign/` (a middle module both `runner` and `site` may import), with
  `readYamlFile` and `parseWith`.
- **The check** `eligibilityIssues(harnesses, arms, register)` in `src/core/eligibility.ts`, pure, beside
  `harnessCoverage`. For each arm that requires a harness, with the campaign's pin `{tool, version}`:
  - no entry for that tool and version → `harnesses.<arm>.version: <tool> <version> is not assessed in
    eligibility/register.yaml: assess it before a campaign pins it` (T15);
  - an `excluded` entry → `harnesses.<arm>: <tool> <version> is excluded by the eligibility register: it fails
    <criterion> (<evidence>)`, one issue per failing criterion — the scenario's "names the tool and the criterion".
  - The match is on the exact pinned string: a tag and a commit of one release are two assessments, so a campaign
    names the version the register names.
- **`checkCampaign`** runs it after `harnessCoverage`, only when that found nothing (a wrong or missing harness is
  reported once, by the existing rule). A campaign with no harness arm needs no register; one with a harness arm and
  no register is refused (`eligibility/register.yaml: not found …`). `scenario dry-run`'s profile check is left as is:
  REQ-FMT-01 is about campaigns, and dry runs are how a version is studied before it is assessed.

### The entries, as of 2026-10-06

Re-verified today on the registries: WingFoil v0.2.2 (`12537b62`, the latest tag), Spec Kit v1.1.0 (GitHub; PyPI
lags at 1.0.13), OpenSpec 1.14.0 (documented on 2026-10-05; 1.14.1 was published on 2026-10-05 at 23:28 UTC and is
not assessed), BMAD 6.12.1.

| Tool | Version | Verdict | Evidence base |
|---|---|---|---|
| wingfoil | v0.2.2 | admitted | v0.1's campaign ran it with Claude Code in the run container (`c82a5e74885b`); built from a pinned tarball (REQ-RUN-14) |
| speckit | v1.1.0 | admitted | its documentation (competitor re-verification 2026-10-05); task-065's spike re-assesses it in the run container |
| openspec | 1.14.0 | admitted | its documentation (2026-10-05); its telemetry is on by default, turned off by the arm's setup (a parity rule, not a criterion) |
| bmad | 6.12.1 | **excluded** | `headless-container` fails: its planning phases are facilitated dialogues; only `bmad-dev-auto` is documented as unattended |

Each criterion's evidence is a sentence with its source. Spec Kit and OpenSpec are admitted on documentation, said
so in their evidence; a spike or the arm's own task that finds otherwise amends the entry (a new date). The BMAD
verdict is a reading of the criteria the approver may contest (F7.2).

### The published criteria and the page (REQ-RES-09, its eligibility half)

- `site-content/eligibility.md`: the five criteria in words, how a tool is assessed (one entry per version, WingFoil
  too, the verdict follows the criteria), and a `<!-- register -->` placeholder.
- `bench site build` reads the register (REQ-RES-02 as amended) and writes `eligibility.html`: the text, then a
  table — tool, version, one column per criterion (pass/fail), the verdict and the reason — then each entry's
  evidence. **No date**: REQ-RES-02 keeps `site/index.html` the only page with one; an assessment's date stays in the
  register, and the evidence prose names none. The landing page links it beside the method page. A missing
  `site-content/eligibility.md` or register fails the build, as a missing method page does.
- The page reads the repository's register **as it stands when the site is built**, as the method page reads
  `site-content/method.md`, and says so: every execution's site shows the current assessments, while each campaign
  was checked, when it ran, against the register of that day. Keeping a per-execution copy is a larger change, not
  needed by REQ-RES-09.

### Fixtures

`writeArmsNamed` (`test/support/arm-fixture.ts`), which every test repository with arms goes through, writes a
register admitting the harness pins the tests use (`TEST_REGISTER`: wingfoil `3df305e`, `v0.2.2`, `abc1234`, `0.2.0`;
openspec `1.0.0`) unless the repository has one, so that existing tests keep their meaning; the site fixture and the
Docker test of W3 copy the repository's `eligibility/`. Tests that need another register write their own.

### Tests

- unit: the schema (strict, all five criteria, verdict consistency, duplicates), the check (each message, the
  harness-coverage precedence, no register needed without harness arms), the loader, the page (the table, the
  reason, escaping);
- acceptance: the four scenarios;
- `npm run test:bin` and `test:docker` at the end (`campaign validate` and `run` change).

## Execution notes

- `npx wingfoil memory add --type task --title "Eligibility register and criteria"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-063-eligibility-register-and-criteria`, `status: draft`.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-063-…` → `2c8fef7`, in the linked worktree `WingFoil2-Benchmark-task-063` with its
  own `npm ci`. Declared: `backlog → in-progress`, one commit. Observed: exit 0, JSON `from`/`to` as declared, one
  file, `status` only. Matches.

### Build

1. Versions re-verified on 2026-10-06 before writing the register: `npm view @fission-ai/openspec` 1.14.1 (published
   2026-10-05 23:28 UTC), `npm view bmad-method` 6.12.1, PyPI `specify-cli` 1.0.13, GitHub `github/spec-kit` latest
   v1.1.0 (2026-10-02), WingFoil's latest tag v0.2.2 = `12537b62`. OpenSpec is assessed at 1.14.0, the version its
   documentation was read at; 1.14.1 is not assessed (a campaign pinning it is refused until it is, the rule F7.4
   adds).
2. `6334ee2` `test(eligibility)`: the four @F7.4 acceptance tests (`test/acceptance/competitors.test.ts`) and the
   schema's and check's unit tests, first. Red: three of four acceptance tests and every unit test (no module); the
   first acceptance test, "A tool admitted at the pinned version can have an arm", passed already, as nothing refused
   then — it stays as the guard against a check too strict.
3. `9be7eb5` `feat(eligibility)`: `src/core/eligibility.ts` (`registerSchema`, `eligibilityIssues`,
   `ELIGIBILITY_CRITERIA`), `src/campaign/register.ts` (`loadRegister`), `checkCampaign`'s call after a clean harness
   coverage, `src/site/eligibility.ts` and `eligibilityShell`, the landing's link, `eligibility/register.yaml`,
   `site-content/eligibility.md`. Fixtures: `writeArmsNamed` writes `TEST_REGISTER` (the harness pins the tests use:
   wingfoil `3df305e`, `v0.2.2`, `abc1234`, `0.2.0`, openspec `1.0.0`) unless the repository has a register; the site
   fixture copies the repository's `eligibility/`. Two site tests changed: the page list and count (12 pages), and the
   "no date anywhere" check, loosened to allow the register's dates on the eligibility page — **reverted by review
   round 1** (finding 2): the page now shows no date and the check is main's again.
4. `84ce5a8` README: the `eligibility/` directory and what `validate` checks of it.
5. `npx tsx src/cli/main.ts campaign validate campaigns/v0-1-reference.yaml` (wingfoil `v0.2.2`): valid, as before.

### Review

- **Round 1** (independent read-only Explore subagent, on `6ec8ef2`; targeted tests only, the suites running
  elsewhere): one blocking finding. It checked REQ-FMT-11's fields, the messages against the scenarios, the page
  against REQ-RES-09, WingFoil's evidence against `c82a5e74885b` and `12537b62`, today's versions, module boundaries
  (eslint clean) and the fixtures. Findings and outcomes:
  1. **blocking** — the Docker test of W3 runs `campaigns/arms.yaml` (wingfoil `v0.2.2`) in a repository with no
     register, now refused. **Fixed:** it copies the repository's `eligibility/` (which admits `v0.2.2`); the suites
     re-run below.
  2. should-fix — `eligibility.html` showed dates (the "Assessed" column, and dates in the evidence prose), against
     REQ-RES-02's "only `site/index.html` holds a date"; a test had been loosened to allow them. **Fixed** by
     conforming (option a): no date column, no dates in the evidence prose (they stay in each entry's `date`), and the
     strict "no date anywhere" test restored.
  3. should-fix — the page reads the repository's current register at build time, so an older execution's site
     shows later assessments. **Fixed by stating it:** the Design and the page say the register is the one of the
     build, and each campaign was checked against its own day's; a per-execution copy is left out (REQ-RES-09 does
     not ask for it).
  4. should-fix — `checkCampaign`'s wiring was untested. **Fixed:** an invalid register with a harness arm (reported
     at its field), an invalid or absent one without (ignored), a wrong pin reported once by harness coverage; and a
     stray harness on a plain arm in the core check.
  5. nit — BMAD's exclusion read thin against OpenSpec's admission, both having questions. **Fixed:** the evidence
     says why they differ (BMAD's facilitations ask for the project's content, which only a person holds; OpenSpec's
     ask for choices the neutral approver answers), and the reason says it is a reading open to contest (F7.2).
  6. nit — the site unit tests came with the implementation. **Not changed:** the acceptance scenario for the page
     was red first, as the notes say.
  7. nit — the Design named `writeRepo` for the fixture, the build used `writeArmsNamed`. **Fixed** in the Design.
- **Round 2** (a new independent read-only Explore subagent, on `807856a`): not clean. It confirmed findings 1, 3,
  4, 5 and 7 resolved (W3's pin admitted; the build-time statement accurate and its link the repository's; the new
  wiring tests meaningful; BMAD's evidence consistent with OpenSpec's and the landscape). Findings and outcomes:
  1. **blocking** — restoring the strict date check, `807856a` also deleted the tail of `build.test.ts` (the refusals
     test, the escaping block, the idempotence test's 120 s timeout): an edit anchored on the wrong closing line.
     **Fixed:** the file is rebuilt from main's, with only this task's changes (the page in the list, 12 pages, the
     landing's link); its diff against main is those five lines, eslint clean, 9/9.
  2. should-fix — the Build notes still said the date check allowed the register's dates. **Fixed:** they say round
     1 reverted it.
  3. nit — five re-written evidence lines past 120 columns. **Fixed:** re-wrapped.
- **Round 3** (a new independent read-only Explore subagent, on `2f72216`): **clean**. It checked `build.test.ts`
  against main (only this task's five lines), swept every removed line of the branch (each an intended replacement),
  and compared the re-wrapped register with `807856a`'s as parsed values (identical). One nit, **not changed**: a few
  table rows of this file pass 120 columns.
- Final checks: `npm run lint` clean; `npm test` 83 files, 1285/1285, coverage 98.09 % statements, 90.99 % branches
  (`register.ts` 100 % statements); `npm run test:bin` 8/8 after `test(bin)`, which gives the site's page count as 12
  (the bin run had found the one count the unit tests do not hold); `npm run test:docker` 18/19 with W6 (scoring)
  failing while a stale earlier run of the suites still competed for Docker — W6 re-run alone: passed. W3, the test
  the register touches, passed.
