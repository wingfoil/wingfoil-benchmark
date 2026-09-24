---
id: task-005-fresh-session-steps
type: task
title: "Fresh-session steps"
status: approved
release: v0.1
wave: W2
features: [F2.2]
acceptance: [runner.feature]
requirements: [REQ-RUN-04, REQ-RUN-05, REQ-ARC-04, REQ-NFR-03]
---

## Context

Second task of wave **W2 — Agent in the loop** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It builds on task-003 (one container per run) and does not need the spike's answers: everything here
runs against a fake agent.

Scope of F2.2:

- **One session per step.** `AgentPort` stops being "run these commands" and becomes "run one
  session": the request carries the step's prompt, the model and the session id; the outcome carries
  the session id, its events and whether the session ended while waiting for input. Nothing of a
  session reaches the next one — only the repository carries state (REQ-RUN-04, partly: the real
  command line is task-006).
- **A snapshot per step (REQ-RUN-05).** After each step the runner commits the workspace with the
  message `step <NN>`, in the same isolated git environment as the seed commit, and stores that
  commit's patch as `steps/<NN>/diff.patch`. A step that changed nothing still gets its commit, so
  every step leaves a snapshot to score (experiment design §3.4).
- **The fake agent becomes a recorded-session fake.** Its script declares, per scenario and step, a
  session: the events it emits and the commands it runs in the container. It replaces the W1 script
  seam, which task-003 declared temporary. This is what lets W2's "Ends with", and later waves, run
  the whole pipeline without spending a token.
- **A multi-step fixture** (a T-scenario with five steps) for the acceptance test. `runner.feature`
  @F2.2 names S3, which is benchmark content and arrives in W8; the fixture stands in for it until
  then, with the same shape (five steps).
- Per-step artefacts are written in their REQ-FMT-06 places under
  `results/<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>/steps/<NN>/`. F5.1 (W7)
  completes the layout (`run.json` in full, `score.json`, `aggregate.json`).

Out of scope: usage and transcripts of a real agent (task-006), interventions and the approver policy
(task-007), cap enforcement (W5), arm setups (W3).

**Done** means: `runner.feature` @F2.2 passes against the fake ports — five sessions for a five-step
scenario, no state carried, a `step <NN>` commit and a `diff.patch` per step; tests, coverage and
lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `runner.feature` @F2.2 "Each step starts a new agent session" — one session per step, no
  conversation state from one to the next, and a commit per step naming only the step number.
  **red-first**
- REQ-RUN-05 — the commit message is exactly `step <NN>`, and `steps/<NN>/diff.patch` holds that
  commit's patch. **red-first**
- REQ-RUN-05 error path — a step that changes nothing is still committed and still has a (empty)
  patch, so step numbering never skips. **red-first**
- REQ-NFR-03 — a session that fails ends its run without stopping the campaign, as in W1.
  **characterization** (task-003's behaviour, kept honest across the new session seam)

## Design

Conventions from [adr-001](../adr/adr-001-w1-toolchain-and-runner-conventions.md) and
[adr-002](../adr/adr-002-w2-runner-and-adapter-conventions.md). Builds on task-003 (`runner`,
`agents`, `core/ports`).

**Classification confirmed:** the three new criteria are red-first; REQ-NFR-03 is characterization —
task-003's behaviour, re-asserted across the new seam rather than re-implemented.

### One correction to this task's Context

The Context says the fake agent's script declares "the events it emits and the commands it runs".
The events have **no consumer until task-006**, where usage and transcripts are read, and W1's review
was explicit that an export without a caller is a defect. So this task gives the fake a **session per
step** (an id and the commands it runs); the recorded events arrive with the code that reads them.
What this task must prove — one session per step, no state between them — needs the id, not the
events.

### The port becomes session-shaped (F2.2)

```ts
interface StepRequest {
  readonly scenarioId: string;
  readonly step: number;          // 1-based, as the scenario numbers them
  readonly prompt: string;        // the text of the step's prompt_file
  readonly model: string;         // the campaign's model for this run
  readonly sessionId: string;     // a fresh UUID per step
  readonly run: (command: readonly string[]) => Promise<ProcessResult>;
}

interface StepOutcome {
  readonly sessionId: string;     // what the agent reports, to be checked against the request
}
```

`StepOutcome.commands` of W1 disappears: it was the fake's own detail, and nothing scored it.
`sessionId` is returned rather than assumed, so a test can prove the agent used the session it was
given instead of one of its own. Usage, transcript and "the session ended waiting" join `StepOutcome`
in task-006 and task-007.

**The prompt is read by the runner**, from `scenario.steps[i].promptPath`, and passed as text. Reading
it in one place is what will make F2.7's "byte-identical in every arm" true by construction rather
than by care. A prompt that cannot be read fails that run, like any other preparation failure.

**Fresh sessions.** One `randomUUID()` per step. Nothing of a session reaches the next: the port takes
no history and returns none, so "no conversation state is passed" is a property of the interface, not
a rule someone has to remember. Only the repository carries state, which is what F2.2 is about.

### A snapshot per step (REQ-RUN-05)

After each step, in the workspace, through the git port:

1. `commitAll(workspace, 'step NN', { allowEmpty: true })`;
2. `patchOf(workspace, 'HEAD')` → written to `steps/<NN>/diff.patch` under the run's results
   directory.

Three decisions in that:

- **`NN` is two digits**, matching `steps/<NN>/` in REQ-FMT-06, so a path and a commit message name a
  step the same way. The message is exactly `step 01`, `step 02`, …: neutral, and naming only the
  step number, as the acceptance scenario requires.
- **A step that changed nothing is still committed**, with `--allow-empty`. Otherwise `git commit`
  fails, and step numbering would skip exactly where an agent did nothing — the case scoring most
  needs to see. The seed commit keeps its current behaviour: a seed with no files is an error worth
  surfacing.
- **`patchOf` is a new port method**, `git show --format= --patch <ref>`, not `git diff HEAD~1 HEAD`:
  every step has a parent (the seed commit), but reading the commit itself is one fewer assumption.

### Where a run's output goes

`runner` gains the results path beside the workspace path it already computes:

- workspace: `runs/<campaign-id>/<n>/<scenario>@<ver>/<arm>/<model>/r<k>/workspace` (git-ignored),
- output: `results/<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>/steps/<NN>/`.

The two share the run's name, computed once. `run.json`, `score.json` and `aggregate.json` are F5.1
(W7); this task creates only what it writes.

### A failed step ends its run

Unchanged from task-003 and stated because it is a choice, not an oversight: a step that throws makes
that run `failed`, and the campaign carries on (REQ-NFR-03). Steps depend on each other — step 3 works
on what step 2 left — so continuing past a failure would measure something the scenario never
described. The snapshots of the steps that did run stay on disk and stay scoreable.

### The fake agent (the W2 seam)

The script gains a session per step:
`{ "<scenario id>": { "<step>": { "session": "<id>"?, "commands": ["…"] } } }`. When `session` is
absent the fake echoes the id it was given, which is the ordinary case; naming one is how a test makes
the fake return **the wrong id**, so that the runner's check has something to catch. W1's array form
is not kept: one shape, changed in one place, with the fixtures updated with it.

### Tests

- **Acceptance** (`test/acceptance/runner.test.ts`), `@F2.2`: a five-step scenario, against fake
  ports — five calls, five distinct session ids, no history on any request, and one `step NN` commit
  per step with its patch. `runner.feature` names S3, which is content and arrives in W8; the fixture
  **T1** stands in for it with the same shape (five steps).
- **Unit:** the prompt is read from `promptPath` and passed through; `NN` formatting; the empty-step
  commit; `patchOf`'s command line; a step whose reported session id differs from the one requested;
  a prompt file that cannot be read.
- **Fixtures:** `test/fixtures/scenarios/T1/1.0/` (seed, five prompt files) and a campaign naming it.
  T0 stays as it is, so the Docker test of W1 keeps running unchanged.

## Execution notes

### Build

- **TDD order, in the history:** the acceptance test and the unit tests first (red `fc0b695`, ten
  failures, each for its stated reason), then the code (`ce553e7`). The acceptance test failed on the
  prompt the request did not carry, which is the assertion the task exists for.
- **Two refinements to the Design, both smaller than it assumed:**
  1. **No `T1` fixture on disk.** The acceptance test builds its five-step scenario with the existing
     temporary-repository helpers, as the `@F2.1` tests already do; `completeScenarioYaml` and
     `writeRepo` gained a step count. A scenario version directory under `test/fixtures/` is only
     needed when a real container runs it, which is task-007's integration test. Writing one now
     would have been a fixture with no reader.
  2. **The design named `patchOf(workspace, 'HEAD')` and that is what it is**, but the step's output
     directory had to be threaded through the run: `RunResult` gains `outputDir`, computed beside the
     workspace from the same run name, so the two never drift apart.
- **"No conversation state is passed" is asserted as a shape**, not as an absence: the acceptance test
  checks that a step request has exactly `model`, `prompt`, `run`, `scenarioId`, `sessionId`, `step`.
  An absence cannot be tested — a later change could add a history field and every "it is not there"
  assertion would still pass.
- **The session check earns its place.** The runner refuses an outcome whose `sessionId` is not the
  one it gave. The fake can be scripted to return another, so the check has something to catch; without
  that the branch would be untestable and, worse, an agent quietly resuming its own session would look
  exactly like a compliant one.
- **A failure found by lint, not by me:** the prompt-read error threw without a `cause`
  (`preserve-caught-error`). Fixed in place.
- **Cleaned up while here:** the unused `eslint-disable` in `test/unit/runner/run.test.ts`, a W1
  leftover reported as a warning since task-004. It was on this task's own file and cost one line.
- **Suites after the build:** `npm test` 316 passed (14 files), coverage 100% statements / 99.24%
  branches / 100% functions; `npm run test:bin` 4 passed; **`npm run test:docker` 1 passed** — W1's
  "Ends with" still holds with the new script shape and the per-step commits; `npm run lint` clean,
  including the warning that had been there since W1.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `f8a35c0`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W2 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-005-fresh-session-steps` → `7ef149e`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
- `npx wingfoil memory approve task-005-fresh-session-steps --reason "…"` → `2f7d1b6`, run after the
  approver's explicit consent in chat. Declared: `pending → backlog` gate, approver role checked,
  subject with `[from → to]`, `Approver:`/`Reason:` body, only `status` changed. Observed: exit 0,
  empty stderr, subject `wf(task): approve task-005-fresh-session-steps [pending → backlog]`,
  both trailers present, 1-line diff. Matches.
- `npx wingfoil memory submit task-005-fresh-session-steps` → `28f2c6f`, on the branch
  `task/task-005-fresh-session-steps`. Declared: `in-progress → in-review`, a gate the approver
  decides, one commit `wf(task): submit <id>`. Observed: exit 0, empty stderr, 1 file, diff limited to
  `status: in-progress` → `status: in-review`. Matches.

### For the reviewer

The four criteria of the Acceptance criteria section, and where each is proved:

| Criterion | Where |
|---|---|
| `@F2.2` one session per step, no state between them, a commit naming only the step number | `test/acceptance/runner.test.ts` |
| REQ-RUN-05, the message is `step <NN>` and the patch is that commit's | the same test, plus the git port's unit tests |
| REQ-RUN-05, a step that changed nothing is still committed | `test/unit/ports/docker.test.ts`, the `--allow-empty` call |
| REQ-NFR-03, a failing step ends its run and not the campaign (characterization) | `test/unit/runner/run.test.ts`, unchanged from task-003 |

Worth an adversarial look, in order of how much they would cost if wrong:

1. **The session check** (`run.ts`, `executeStep`). It compares what the agent reported with what it
   was given. If an adapter ever reports a session it did not actually use, the check passes and F2.2
   is unguarded — the check is only as good as the adapter's honesty, and task-006 writes the first
   real one.
2. **The shape assertion** on a step request. It is a deliberate tripwire: adding a field to
   `StepRequest` breaks it, which is the point. A reviewer should decide whether that is the right
   trade for the friction it will cause in task-006 and task-007, which both add fields.
3. **`--allow-empty` on every step commit**, including steps that did change something. It is
   unconditional for simplicity; the alternative — ask git whether anything changed — is a second
   call per step and a second thing to get wrong.
4. **`patchOf` uses `HEAD`**, read immediately after the commit. Nothing else writes to that
   repository between the two calls, but the coupling is implicit rather than stated in a type.
5. **The prompt is read per step, per run.** A five-step scenario in three arms with three
   repetitions reads the same five files 45 times. Cheap, but a reviewer may prefer it read once per
   scenario — and may also argue that reading it per run is what makes a mid-campaign edit visible
   rather than silently half-applied.

Full suites at HEAD: `npm test` 316, `test:bin` 4, `test:docker` 1, `lint` clean.

### Review, round 1

- **Reviewer:** an independent reviewer that did not write the code, read-only, working on an export
  of HEAD with `node_modules` linked so every finding could be proved by a probe.
- **Result:** no blocker, **3 majors, 3 minors, 1 question, 2 nits** — and every major test-only. The
  production code could not be made to misbehave; the suite could not be made to notice when it did.
- **The three majors are one defect wearing three hats:** `--allow-empty`, the ref given to `patchOf`,
  the order of commit-then-patch, and the REQ-FMT-06 output location were all **covered but
  unasserted**. The reviewer mutated each and all 316 tests stayed green. It is the same class as
  task-003's finding 7, which this task's own "For the reviewer" section claimed to have learned from
  — and pointed at `test/unit/ports/docker.test.ts` as proof of the `--allow-empty` criterion, which
  proves the *port forwards* the flag, not that the *runner sets* it. Coverage said 100%; three new
  statements ran in every test without one assertion constraining what they did.
- **Fixed** (`f3b7e00`): the git double records the commit options and the patch call in the same
  transcript, so the acceptance test's `toEqual` pins the flag and the order together; the patch's
  exact bytes are asserted instead of `toContain`; `outputDir` is asserted literally in a unit test
  rather than derived from itself. **Each fix was verified by re-running the reviewer's mutation and
  watching exactly one test go red, then reverting it.** Four mutations, four reds.
- **Minor, fixed:** a scenario is capped at 99 steps (red first) — `steps/100` sorts before
  `steps/99` and `step 100` breaks the message shape mid-run; the two failure paths the reviewer
  wrote and found passing are now in the suite (a failing step commit, a failing `patchOf`), with the
  double's commit failure scoped to step commits because the seed commit is a different moment of the
  run.
- **Minor, not a change:** `RunResult.outputDir` had no production reader. It now has an assertion on
  the contract, which is the reason to keep it; W7's `run.json` is its first reader.
- **Nits, fixed:** the shadowed `yaml` in the campaign fixture; the CLI's refusal message and the
  command's doc comment still spoke of W1.
- **Open, for the approver (the reviewer's question):** adr-002 decisions 11 and 13 say that from W2
  the per-step artefacts include a minimal `run.json` and that the fake replays recorded stream-json
  sessions. This task does neither, and says so. Neither decision is violated — task-006 is also W2 —
  but nothing yet guarantees the wave cannot end without them.
- **Suites after the round:** `npm test` 320 passed, coverage 100% statements / 99.24% branches;
  `npm run test:bin` 4; `npm run test:docker` 1; `npm run lint` clean.

### Review, round 2

- **Result: approvable.** The reviewer re-ran its own four mutations rather than trusting my report —
  four mutations, four reds — and confirmed all nine round-1 findings closed, with nothing weakened:
  the round-1 positive controls still turn a test red each. It then attacked the new assertions along
  the four lines I asked it to and found **one real hole**, plus one small debt and two nits.
- **N-1, the hole, fixed** (`e64a29b`): the double answered every `patchOf` call with the same string,
  so the five expected values in the acceptance test were **one value**. A snapshot filed under
  another step's number read as correct. Its probe: numbering the step directory in reverse
  (`steps.length + 1 - step.n`) left all 320 tests green — step 1's snapshot in `steps/05`, step 5's
  in `steps/01`, and W7's scorer would read one as the other. A per-call counter makes each answer
  distinct; I re-ran that mutation and it now fails exactly one test.
- **N-2, fixed as an amendment** (`6414e37`, requirements 1.4): the 99-step cap had no requirement
  behind it, only a code comment. REQ-FMT-06 now states that `<NN>` is two digits and that a scenario
  has at most 99 steps, so an author of benchmark content meets the bound in the specification rather
  than in an error message.
- **N-3 and N-4, fixed:** the `failing` docstring still said those calls break a run *outside* its
  steps, while `commit` and `patch` break it inside one; and the patch-failure test's
  `some(call.includes('step 01'))` was satisfied by every passing run — it is now a `toEqual` on the
  whole four-entry transcript, which proves what its comment claimed.
- **Two things the round found that I had not claimed.** The round-1 fixes also pinned the *absence*
  of `--allow-empty` on the seed commit, which nothing checked before. And `run.ts` and
  `workspace.ts` are byte-identical to the version reviewed in round 1 — the fixes really were
  test-only, apart from `.max(99)` and the CLI wording.
- **On finding 7:** accepted as closed, with the caveat recorded here: nothing mechanical enforces
  it. No test checks ADR decisions against tasks, so adr-002's decisions 11 and 13 are exactly as
  safe as task-006's Context surviving its own scoping.
- **Carried, not fixed** (pre-existing, task-003's `prepareWorkspace`): an empty seed fails with
  git's own words — `nothing to commit, working tree clean` — instead of saying that the seed
  directory of that scenario is empty. It belongs to whichever task owns `prepareWorkspace` next.
- **Suites after the round:** `npm test` 320, coverage 100% statements / 99.24% branches;
  `npm run test:bin` 4; `npm run test:docker` 1; `npm run lint` clean.
