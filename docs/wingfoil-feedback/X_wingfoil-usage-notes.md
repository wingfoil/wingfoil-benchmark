# WingFoil usage notes (from bootstrapping this repository)

**Status:** temporary inbox — not Memory. To be read during WingFoil's next `retrospective`
(`additional-points` phase) or `release-planning`, and turned there into official WingFoil Memory
elements (bug / decision-log). Delete each note here once it has an official counterpart.

**Context:** first use of WingFoil on a project other than WingFoil itself — this repository,
bootstrapped on 2026-09-22 with WingFoil 0.1.0 built from WingFoil commit `7a65580`
(`vendor/wingfoil-0.1.0-7a65580.tgz`), `wingfoil init --template Kanban`.

---

## N1 — `init` scaffold lacks what the WingFoil life cycle actually needs

`wingfoil init --template Kanban` produces a `sw-life-cycle` whose `inception`, `specification` and
`sunset` phases are empty (no `include:`, no `produces:`), no inception workflow (WingFoil's own
`lean-inception` exists only in WingFoil's `docs/self/.wingfoil/workflows/custom/`), and no `plan`
Memory type — although WingFoil's own process (dl-019) requires a plan element whenever a workflow
phase starts. A new project cannot follow WingFoil's process out of the box: those assets had to be
copied from WingFoil's `docs/self/` and adapted by hand.

Evidence: `cat .wingfoil/workflows/custom/sw-life-cycle.yaml` in this repo at commit `d5a31a4`;
`grep -n "plan:" .wingfoil/memory.yaml` at `d5a31a4` → nothing.

**Seen a second time (2026-09-24), on another surface.** The three capture workflows this project
scaffolded — `bug-ingest`, `decision-log-ingest`, `adr-ingest` — are still the six-line `init`
skeleton: one `capture` phase, no `actions`, no `role`, no `produces`. They parse, they are
`kind: main`, and none of them can say **which document it would create**, so none can be offered as
something to start. WingFoil's own `bug-ingest` declares `actions: ['memory.add(type: bug)',
memory.submit]`; the scaffold ships the shape without the content.

The sharp edge is narrower than "the scaffold is thin". `memory.add` appears twice elsewhere in this
project's configuration in its bare form, without `(type: …)`, and there it is merely terse: those
phases carry an `element:`, so the type is recoverable. The capture workflows have no `element`, so
there is nothing to recover it from — the same bare form that is a style choice in one place is
missing information in another, and nothing distinguishes the two.

That is the same failure as N18 and `bug-001`: a declaration that parses, is well formed, and does
not say the thing that is needed. Found by a second reader looking at the configuration, not by any
check. Recorded in this repository as `bug-002-ingest-workflows-declare-no-actions`.

**And the tool agrees that nothing is wrong.** `npx wingfoil workflow list` exits 0, emits no
warning, and reports `bug-ingest` as valid with its phase reduced to
`{"name":"capture","optional":false}` — a phase with no actions, no role and no `produces` passes in
silence. So the omission is not merely unreported: a reader who checks with the tool is told the
configuration is fine. That is what makes it worth fixing in the scaffold rather than in each
project.

Suggested kind: decision-log (what should the built-in templates ship?, and should a `kind: main`
workflow whose phases declare no `actions` be reported as unstartable?).

## N2 — `dna.yaml` scaffold does not tell that `category` is required for technologies

The scaffold has `technologies: []` with no example. Adding `- name: TypeScript` fails validation
(`E_VALIDATION stacks.technologies.0.category ... expected string, received undefined`) on every
command that loads the DNA (`dna show`, `paths`, ...). The field is required by the schema
(`src/dna/schema.ts` `TechEntry.category`) but discoverable only through the error.

Suggested kind: bug (scaffold should show a commented example entry with `category`).

## N3 — default `console` output is JSON

Without `--format`, `wingfoil paths`, `wingfoil workflow list`, `wingfoil memory add` print JSON,
both piped and in a real TTY (`script -qc "npx wingfoil paths" /dev/null`). The global option says
`output format (console|json|yaml)` with default `console`, so a human-readable console rendering is
expected.

Suggested kind: bug, or decision-log if JSON-as-console is intended.

## N4 — no documented way to use an unpublished WingFoil pinned to a commit

WingFoil is not on npm yet, and a machine may already have an unrelated `wingfoil` binary on `PATH`
(here: an old `@wingfoil/cli@0.9.0` from a previous prototype), so a bare `wingfoil` silently runs the
wrong tool. Pinning required `git archive <sha>` → `npm ci` → `npm pack` → `file:` devDependency →
`npx wingfoil`. Worth documenting (README / user docs) until the package is published, and
`wingfoil --version` output could include the commit it was built from.

Suggested kind: decision-log (user-docs) or task.

## N5 — positive: `memory add` works end to end on a foreign project

`npx wingfoil memory add --type plan --title "Benchmark inception"` on a custom type declared only in
this repo's `memory.yaml` created `docs/plans/plan-001-benchmark-inception.md` from the custom template
and committed it as `wf(plan): add plan-001-benchmark-inception` (commit `2f42fec`). Custom types,
custom templates, custom roles (`facilitator`, `scenario-author`) and `team.agents` all validated
without changes to WingFoil.

## N6 — package version not bumped: `0.1.0` builds already contain v0.2 features

WingFoil's `package.json` says `0.1.0`, and `wingfoil --version` prints `0.1.0`, but a build from
`7a65580` (and `3df305e`) already ships `memory submit/approve/reject/deprecate/history` and
`directive create/assign/remove`. `git diff --stat 7a65580 3df305e -- src` is empty. WingFoil's own
`CLAUDE.md` §1/§5.1 still says those verbs do not exist (related to WingFoil bug-008 / dl-025). A
consumer pinning "0.1.0" gets a wrong mental model; this benchmark wrote wrong capability claims
because of it and had to correct them. Suggested kind: bug (bump to a `0.2.0-pre.N` version, or print
the commit in `--version`), and a refresh of CLAUDE.md §5.1.

## N7 — `memory history` follows the template copy into an unrelated commit

`npx wingfoil memory history plan-001-benchmark-inception` (this repo, WingFoil `3df305e`) lists commit
`1ead129` first, with `operation: null`, and prints to stderr
`fatal: path 'docs/plans/plan-001-benchmark-inception.md' exists on disk, but not in '1ead129…'`.
`1ead129` only added `.wingfoil/memory/templates/plan.md`; the element file was created by the tool
in `2f42fec`. Likely cause: `git log --follow` rename/copy detection matches the element to the
template it was copied from. `git log -- <path>` (no `--follow`) gives the correct three commits.
Suggested kind: bug.

Confirmed again on 2026-09-24, on a `task` this time, so it is not specific to `plan`:
`memory history task-008-phase-includes-in-the-workflow-configuration` prepends **two** unrelated
commits with `operation: null` — `d5a31a4` (`wingfoil init` scaffolding `.wingfoil/`) and `8d96d99`
(the commit that added the task template and the task machine) — and leaks a `fatal:` line to stderr
for each. Two details worth adding to the report: the exit code is **0**, so a caller sees a clean
success with git's error text on stderr and two phantom entries in the payload; and the noise scales
with the number of commits that touched the template, so it grows as a project edits its templates.
An element's own history is what an audit reads, so phantom entries in it are worse than cosmetic.

## N8 — `finalize` is not a recognized history operation

A hand-written `wf(plan): finalize … [active → done]` commit (modelled on WingFoil's own
`wf(task): finalize …`) is parsed with `operation: null` although from/to/approver/reason are read.
Either `finalize` should be a declared operation, or the docs should say which verb closes a
`waiting`/final transition. Suggested kind: decision-log.

**N7 reproduced (2026-09-22):** `memory history plan-002-benchmark-specification` again lists `1ead129`
(`operation: null`) first and prints the same `fatal:` line; `git log -- <path>` gives the correct 3
commits. Not specific to one element: every element created from a template committed earlier is
affected.

## N9 — `submit` subjects carry no transition, so consecutive submits are indistinguishable

`memory submit` on `plan-002` twice (draft → active, then active → done) produced two commits with the
identical subject `wf(plan): submit plan-002-benchmark-specification` (`c73c6dc`, `40327d7`) and no
body. `approve`/`reject`/`deprecate` subjects carry `[from → to]`, `submit` does not (as WingFoil's
CLAUDE.md §5.1 specifies). `memory history` recovers from/to from the diff, but `git log --oneline`
cannot. Verified behaviour matches the declared contract; the contract itself is the question.
Suggested kind: decision-log (add `[from → to]` to submit subjects too).

## N10 — no verb to close a phase plan with an approval record

Closing `plan-002` (active → done) was only possible with `memory submit`, because this repo's
`plan` machine declares neither a gate nor a `waiting` state on `active`. The resulting commit records
no approver and no reason, although the phase closure was approved by the approver. WingFoil's own
`memory.yaml` declares `plan.active` as `waiting` (engine-only), so there the same command is refused
and — with no workflow engine — no verb can close a plan at all (WingFoil's own plans are closed by
hand-written commits). `plan-001` here was closed by hand with `Approver:`/`Reason:`; `plan-002` by
the tool without them: the same operation left two different audit records. Related to N8.
Suggested kind: decision-log (should `plan` close through a gate, so `approve` records who/why?).

## N11 — slugs drop dots, so version-based ids become `rel-v0-1`

`memory add --type release --title "v0.1"` with `id_pattern: "rel-{slug}"` created `rel-v0-1`
(`255f2e7`): `slugifyTitle` maps every non-`[a-z0-9]` run to `-`. `add` only fills `{n}` and `{slug}`
(`src/core/index.ts` → `generateId(idPattern, { slug, n })`), so a `{version}` token like WingFoil's own
`minor-{version}` cannot be produced by the CLI. Verified behaviour otherwise matches §5.1: one commit
per element, subject `wf(release): add rel-v0-1`, no body, only the new file, `status: draft`.
Suggested kind: decision-log (support declared frontmatter tokens such as `{version}` in `id_pattern`).

## N12 — "illegal transition" names a target the verb would never reach from that state

`memory approve rel-v0-1 --reason …` on a `draft` release (not a gate) is correctly refused — exit 1, no
commit, file unchanged — but the message is `illegal transition draft -> in-development for type
'release'`. `in-development` is the target of the *next* gate (planning), not anything reachable from
`draft`; a reader infers that approve tried to skip `planning`. This is the declared behaviour
(`<to>` is approve's own next legal edge, dl-053), so the contract itself is the question.
Suggested kind: decision-log (say "`approve` is not legal from `draft`: not a gate").

## N13 — `submit` silently commits any uncommitted body edits under a state-only subject

`memory submit <id>` commits the whole file as it is on disk ("commits the document as the author left
it", `memorySubmitFn` and `commitMemoryTransition` in `src/core/index.ts` and
`src/core/memory-transition.ts` at `3df305e`). The post-condition only checks that no *frontmatter*
field other than `status` changed compared with the file *on disk*, so uncommitted edits to the body,
and to frontmatter fields, pass the check. Together with N9 (no `[from → to]`, no body), a whole
element's content can land in a commit whose subject says only `wf(<type>): submit <id>`. The same
applies to `approve`/`reject`: the content is swept into the approval record.
Workaround used here (plan-003, rel-v0-1): content is committed by hand first (`docs(...)`), then
`submit` changes only `status:` (verified: `e5ee231`, `e8ba265`, 1 line each).
Suggested kind: decision-log (refuse a transition when the document has uncommitted changes, or commit
them in a separate commit first).

**N7 reproduced on a release (2026-09-22):** `memory history rel-v0-1` lists two unrelated commits
first, `d5a31a4` and `8d96d99` (both touched only `.wingfoil/memory/templates/release.md`), each with
`operation: null` and a `fatal: … exists on disk, but not in …` line on stderr. The real trail follows:
`255f2e7` add → draft, `e012929` (hand-written content commit, correctly `operation: null`,
draft → draft), `e8ba265` submit draft → planning.

**Workaround, found on 2026-09-24 (task-008):** commit the body edit first, under its own subject,
and `submit` then touches only the `status:` line. Verified — `c1302c3` (`docs(task): design …`)
followed by `937ecaf` (`wf(task): submit …`, 1 insertion / 1 deletion, the status line alone).
It costs one extra commit and it is what the delivery tasks here already do by habit. Worth stating
because it reframes the report: the problem is not that `submit` commits, it is that it commits
*someone else's* pending changes under a subject that claims only a state change, so a reader of
`git log` is told a state moved when in fact content changed too. A caller cannot be expected to
notice; refusing to run with a dirty element file, or naming the extra files in the subject, would
both close it.

## N14 — `dna set` cannot add a module or a path, so DNA list edits bypass the tool

`dna set <key> <value>` writes one scalar string at a dotted key path (`dnaSetFn`, `src/dna/set.ts` at
`3df305e`). `modules` is a list of `{name, path, description}` objects and `paths.*` are lists, so
registering the first modules of this project (task-001, REQ-ARC-05) had to be a hand edit of
`.wingfoil/dna.yaml`, committed by hand (`chore(wingfoil): list the core and scenario modules …`),
with no `wf(dna):` commit and no write-time validation. `dna show` was used afterwards to check that the
file still parses (exit 0, modules and paths as written). A project grows modules release after release,
so this is a recurring edit. Suggested kind: decision-log (`dna module add`, or list-append syntax for
`dna set`).

## N15 — scaffolded templates claim that `submit` fills the placeholders; it does not

The `adr`, `bug`, `decision-log`, `tech-spec` and `release-line` templates scaffolded by `wingfoil init`
(e.g. `.wingfoil/memory/templates/adr.md` here) say: "`wingfoil memory add` copies this scaffold
verbatim; `memory submit` replaces these placeholder comments with real content and fills the required
frontmatter fields." At `3df305e`, `memorySubmitFn` sets `status`, removes `rejection_reason` and keeps
every other byte (its own doc comment and `commitMemoryTransition`'s post-condition). Observed on
`dl-001`, `dl-002` and `adr-001` (`fcca4cc`, `be01f38`, `26c9e85`): 1-line diffs, `status` only. An
author who trusts the template would submit an element with its placeholder comments still in it, and
a required field left empty is refused, not filled. The template text restates
`docs/self/docs/04_memory/design/specs/spec-010-memory-frontmatter-schema.md` ("`memory.submit` fills
`title` and all other required fields and replaces every placeholder comment with real content"), so
the spec itself disagrees with the implementation and with `memorySubmitFn`'s own doc comment.
Suggested kind: bug (spec-010 and the scaffolded templates vs the `submit` contract).

## N16 — no verb amends an approved Memory element

`adr-001` was `approved` when its default 5 needed a clarifying amendment (W1 task-003 review). The
Memory machine has no verb for that: `submit` only walks the sequence forward (and `adr` ends at
`approved`), `approve` is illegal from `approved`, and `deprecate` retires the element instead of
amending it. The amendment was therefore made the way non-Memory documents are handled here: edit the
file, and record the decision in the commit body with `Approver:` and `Reason:` (commit
`docs(memory): amend adr-001 default 5 …`). The element file still says `status: approved`, and
`memory history adr-001-…` shows the commit with `operation: null`, so the amendment is invisible to
the tool's own audit trail. Suggested kind: decision-log (an `amend` verb, or a re-approval edge on
terminal states, so that an approved element can change with the approver's reason recorded).

## N17 — `submit` reads an empty list as a missing required field

A task element with `features: []` and `acceptance: []` — both keys present, both deliberately empty
— is refused: `error: missing required field on submit: features, acceptance`. The value is there and
says something true (this task delivers no feature); the check cannot tell "absent" from "empty".

This matters because the two states mean different things in a process. A field left out is an
omission to catch; an empty list is a claim the author made on purpose. Here the claim was needed:
a spike (a knowledge task) delivers no feature, and the project's own traceability test reads
`features` as "this task delivers these" and demands an acceptance test per scenario of each one.
Listing features to satisfy `submit` would have made that test red; leaving them empty made `submit`
refuse. The two checks could not both be satisfied.

Worked around by dropping `features` and `acceptance` from the task type's `required` list in
`.wingfoil/memory.yaml`, which weakens the check for every task rather than for the one shape that
needs it.

Evidence: `npx wingfoil memory submit task-004-waiting-for-input-and-credentials-spike` at commit
`f1ad2b0`, exit 1 with that message; the same command after `4e242a5`, exit 0.

Suggested kind: decision-log (should a required list field accept an empty value as present? and
should `required` be expressible per element shape rather than per type?).

## N18 — `include` means two different things, and nothing checks which one you wrote

In `spec-003` the key `include` is used for two unrelated things: in the manifest
`.wingfoil/workflows.yaml` it is a list of **file paths**; inside a phase it is the **name** of the
workflow to include. The two forms are both plain strings, so a path written where a name belongs
is well-formed YAML and parses fine — it simply resolves to nothing.

All five phase includes of this repository carried a path. The effect was silent and total: no
sub-workflow was included by any phase, so `sw-life-cycle` had neither an inception nor a
specification and `release-cycle` had neither a delivery loop nor a campaign — the whole composed
life cycle, which is the point of the phase `include`, did not exist. It survived from `428b295`
and `8d96d99` to `6d13a5a` without anything noticing.

`wingfoil workflow list` does not notice either. On a copy of this repository with the path form
restored on `sw-life-cycle › inception`, `npx wingfoil workflow list` exits 0, prints no warning,
and echoes the phase back as `"include": "workflows/custom/benchmark-inception.yaml"` — the tool
resolves the manifest's paths but never resolves, or validates, a phase's include. The defect was
found only because an external reader (the roadmap viewer) checks that every `sub` workflow is
included by some phase. A project that only uses the CLI has no way to see it.

Two things are worth separating here. The **validation gap**: `workflow list` should refuse, or at
least warn, when a phase's `include` does not name a known workflow — the check is cheap, every
workflow name is already loaded at that point. And the **design smell** behind it: overloading one
key with two resolution rules, distinguished only by which file the key appears in, makes the
mistake easy to write, invisible to read (both forms look deliberate) and impossible for the parser
to catch by shape. A distinct key for the phase form, or accepting only names in one place and only
paths in the other with an explicit error on the wrong shape, would have made this unwriteable.

Evidence: `.wingfoil/workflows/custom/sw-life-cycle.yaml` and `release-cycle.yaml` before `6d13a5a`
(five phase includes, all paths); `npx wingfoil workflow list` in this repo, exit 0, no warning, on
the broken form.

Suggested kind: bug (`workflow list` does not validate phase includes) plus decision-log (should
`include` keep two meanings?).

## N19 — a directive's "global" is declared in two places that nothing reconciles

`roles.yaml` has a `global:` list of directive ids; a directive file can also carry `scope: global`
in its frontmatter. Here the three directives listed as global — `documentation`, `doc-versioning`,
`security-secrets` — have no `scope:` key at all (no directive in this repository does), so the two
declaration sites disagree for every global directive we have.

`wingfoil directives list --format json` resolves from `roles.yaml` alone: those three come back
`"global": true`, `"assignment": "global (all roles)"`, and `"warnings": []`. So the CLI is content,
while a reader that checks both sites reports a mismatch. Whichever site is meant to be the source
of truth, the other one is unchecked: nothing tells an author that a `scope: global` frontmatter
would be ignored, or that a directive listed in `roles.yaml` should also declare itself.

Same family as N18: one fact, two places allowed to state it, no reconciliation. Left unfixed here
on purpose — correcting it in this repository would only hide the question.

Evidence: `.wingfoil/roles.yaml` `global:` list vs `grep -rn "^scope:" .wingfoil/directives/`
(nothing) at `6d13a5a`; `npx wingfoil directives list --format json` → `warnings: []`.

Suggested kind: decision-log (which site owns a directive's scope, and should the other be validated
against it — or dropped?).

## N20 — `kind` conflates "startable" with "includable", so composition costs the standalone start

`kind: main` and `kind: sub` decide two independent things at once: whether a workflow can be
started on its own, and whether a phase may `include` it. Only a `sub` is includable, only a `main`
is startable, and no workflow can be both.

Two of this repository's workflows need both, and both lost the same way. `campaign-cycle` runs for
a release's reference campaign (`plan-003` step 5, `release-cycle › campaign`) **and** on its own at
every WingFoil release — its own header said so. `scenario-authoring` is journey J3: the content
tasks F6.x follow it (`plan-003:72`), and a scenario is authored outside a release as often as
inside one. In both cases the approver chose the standalone start and gave up the composition
(`affb511`, `73eacc5`): `release-cycle › campaign` now names campaign-cycle in prose and launches it
by hand, and `scenario-authoring` became a `main` that no phase composes.

That is a real loss, not a tidy-up. The phase `include` is what makes the composed life cycle
navigable — it is how a reader gets from `sw-life-cycle` down to the concrete steps, and how the
viewer draws the tree. Two of the project's seven-phase workflows are now reachable only by knowing
they exist. The alternative was worse: making them `sub` would have made a campaign impossible to
run except inside a release, which is not how campaigns work here.

Note that WingFoil already models "same workflow, two entry points" elsewhere — `release-cycle` is a
`sub` included by `sw-life-cycle › release-cycle` while `bug-ingest`, `decision-log-ingest` and
`adr-ingest` are standalone `main`s. The gap is only that no workflow may sit in both columns.
Splitting the axis — an `includable` flag, or letting `main` be included — would cost nothing that
`kind` currently buys, since the resolver already knows the difference between a phase's `include`
and a top-level start.

Third of the same family as N18 and N19: one key carrying two independent facts (there: one fact in
two places). The shape recurs often enough in this repository to be worth naming.

Evidence: `.wingfoil/workflows/custom/campaign-cycle.yaml` and `scenario-authoring.yaml` at
`73eacc5`; viewer warning `release-cycle › campaign: includes "campaign-cycle", which is kind main
(only sub workflows are include-only)` at `6d13a5a`.

Suggested kind: decision-log (should `kind` keep deciding startability and includability together?).

## N21 — a required field has no way to say "there is nothing true to put here"

N17 reported one half of this: `submit` reads an empty list as a missing field. A second element hit
the other half, and together they show the shape of the problem.

- **Nothing true to declare** (N17's case). `task-004` is a spike: it delivers no feature and
  implements no scenario. `features: []` and `acceptance: []` said exactly that, and `submit` refused
  them as missing.
- **Nothing true to declare, and no way out** (the new case). `task-008` fixes the project's own
  workflow configuration. No requirement covers that: the specification describes the benchmark as a
  product — formats, runner, scoring, architecture — not the process the project runs itself on. Its
  `requirements: [REQ-ARC-05]` is the nearest requirement cited in the right spirit rather than a
  true statement, and its own Context says so under "On `requirements`".

The two cases were answered differently, which is the part worth looking at. For `task-004` the fix
was to drop `features` and `acceptance` from the task type's `required` list (`4e242a5`), because the
approver judged that a task may legitimately deliver nothing. `requirements` stayed required, so
`task-008` had no such door and had to write something not quite true instead. The type now has an
escape for two of its list fields and none for the third, and which fields got the escape was decided
by whichever element happened to hit the wall first.

What is missing is not a looser check but a way to say it: a field that is required *in general* and
can carry an explicit "not applicable", recorded rather than faked. A schema that only knows
"present" and "absent" pushes the author to either weaken the rule for everyone or write a plausible
untruth — and the second is worse, because it reads as data.

Evidence: `docs/memory/task/task-004-…md` and `…/task-008-…md` frontmatter at commit `077156e`;
`.wingfoil/memory.yaml` task type `required` list, and the comment on it.

Suggested kind: decision-log (should a required field accept an explicit "not applicable"? and should
`required` be expressible per element shape rather than per type?). Related: N17, N18, N19, N20 —
all four are checks that cannot tell a deliberate value from a missing one, or one concept from two.

**N23 is this same nerve from the other side.** Here a required field has nothing true to hold and is
filled anyway; there a field holds something true — a git identity — that is not what it appears to
be, because it does not record who actually performed the transition. Both produce a record that
reads as data and is not. A triage that fixes one without the other will leave the failure mode
intact.

## N22 — no verb parks a task, so freeing a WIP slot is a governance question

`kanban-delivery` declares WIP limits in its header — at most 1 task `in-progress` and 1 `in-review`,
because there is a single approver — and says they are not enforced by WingFoil: the `plan` phase
checks them by hand with `memory search --type task --status in-progress`.

The task machine has no way to step back. `sequence: [draft, pending, backlog, in-progress,
in-review, approved, done]`, with gates only on `pending` (reject → draft) and `in-review` (reject →
in-progress). From `in-progress` there is no backward edge at all: `submit` only walks forward,
`reject` exists only at a gate, and `deprecate` retires the element instead of suspending it.

So a task that has started cannot be put down. Freeing the single `in-progress` slot has exactly two
outcomes: finish the task, or grant an explicit WIP exception and run two at once.

What that cost, on 2026-09-24. `task-005` was `in-progress` in one session while `task-008` (the
workflow-configuration fix) sat at `backlog` in another. The approver first decided that task-008
would wait. A later instruction to the other session said "fix first, park task-005" — and the two
could not be reconciled, because parking is not a transition. Both sessions stopped and escalated.
The question only became decidable once it was renamed for what the machine allows: *"park" is a WIP
exception under another name — two tasks `in-progress`, one of them idle.* Put that way the approver
chose in one step (let task-005 run). But it took two sessions holding work, a round trip to the
approver from each, and a re-framing, to answer what a person would call a scheduling question.

The gap is that a scheduling state — started, not being worked — has no representation, so it can
only be expressed by breaking a limit. Same family as N16 (no verb amends an approved element): the
machine models the happy path forward and nothing else, and everything off that path becomes a
decision for the approver instead of a state in the tool.

Evidence: `.wingfoil/memory.yaml` task `states` block and `kanban-delivery.yaml` header at `077156e`;
`task-005` `in-progress` and `task-008` `backlog` at the same commit.

Suggested kind: decision-log (a `hold`/`park` verb or a `paused` state; and whether WIP limits should
be expressible in `memory.yaml` rather than in a comment checked by hand).

## N23 — a transition records a git identity, not who actually performed it

`memory approve` can be run by anyone who can run the CLI, and the approver it records is simply the
git author of the commit. WingFoil has no actor model: nothing distinguishes the agent that did the
work from the approver that passes the gate.

In an agent-driven project those are the same git identity, so the audit trail cannot tell them
apart. Verified on 2026-09-24: `abc266e` (`wf(task): submit task-008`) was made by the agent, while
`077156e` and `dd8dba3` (the two `approve`s) were typed by the human. All three are authored
`Roberto Pompermaier <robypomper@gmail.com>`, and `memory history` reports
`approver: Roberto Pompermaier <robypomper@gmail.com> (approver)` for the approvals — true, but
indistinguishable from what it would say had the agent run them itself.

Here the separation held, but it was enforced **outside WingFoil**: the agent harness refused
`memory approve` as self-approval — twice, including after the user explicitly told the agent to
proceed — and the human ran both commands. Without that external guard, an agent passes its own
gates and the resulting history looks exactly the same.

Worth noting what WingFoil *does* catch: a hand-edit of `status:` is visible, because `memory history`
then reports `operation: null` with no approver and no reason (N16 documents this for `adr-001`). So
the tool distinguishes a transition made through the tool from one made around it — it just cannot
say who made it.

This is not only a hygiene point for this repository. The benchmark measures governance and directive
compliance (F4.8, S8): "the approver approved this" is precisely the kind of property it will want to
score, and today the tool cannot attest it. A benchmark that scores governance with an instrument
that cannot identify actors is measuring the harness around WingFoil as much as WingFoil.

Evidence: `git log --format='%h %an <%ae>'` on `abc266e`, `077156e`, `dd8dba3` at `077156e`;
`memory history bug-001-…` and `… task-008-…`.

Suggested kind: decision-log (should a transition record the acting identity separately from the git
author, and can a gate declare that it may not be passed by the identity that did the work?).

## N24 — positive: a gate transition leaves an audit record that is usable both ways

`memory approve` records what an audit actually needs. `memory history bug-001-…` returns
`operation: approve`, `from: pending`, `to: approved`, `approver: Roberto Pompermaier … (approver)`
and the `--reason` text, as structured JSON. The same transitions read as plain English in
`git log --oneline`, because the tool writes its own subjects:
`wf(task): approve task-008-… [pending → backlog]`. Six commits from `4fd2f03` to `077156e` are a
legible process log with no extra tooling — element created, submitted, gated, accepted — and the
`[from → to]` in the subject means a reviewer never has to open the file to see what moved.

The second half of this is that a transition made *around* the tool is visible: a hand-edited
`status:` shows up in `memory history` as `operation: null`, with no approver and no reason (N16
records this for `adr-001`). So the record distinguishes "went through the machine" from "was edited
by hand" — which is what makes the first half trustworthy rather than decorative.

Caveat, kept separate as N23: the record identifies a git identity, not who performed the
transition.

Evidence: `memory history` on `bug-001-…` and `task-008-…`; `git log --oneline` at `077156e`.

## N25 — positive: process state is plain files in git, and it survives history surgery

On 2026-09-24 `main` was rewound to drop three commits, and another session's active task branch —
based on the commits being dropped — was rebased with `git rebase --onto`. Element states came
through correctly with no reconciliation step: `task-005` stayed `in-progress` on its branch,
`task-008` stayed `backlog` on `main`, and each element's history still resolved.

This is worth stating because it is not free. Had process state lived in an external store keyed by
commit — a database, a server, a service — a rewind and a rebase would have left it pointing at
commits that no longer exist, and someone would have had to repair it by hand. Because an element is
a Markdown file with frontmatter, it moves with the branch that contains it, and two branches can
legitimately disagree about a task's state while both are correct for their own history. That
property also made the whole recovery reviewable: `git show main:<element>` answers "what does main
think this element's state is" with no tool at all.

Evidence: `main` moved `73eacc5` → `2d5c9b8` → `077156e`; `task/task-005-…` rebased with
`--onto`; element states read straight out of both refs afterwards.

## N26 — positive: per-type state machines expressed this project's process, and the WIP limit held

`memory.yaml` let this project define its own machine per element type rather than accept WingFoil's.
The `task` type declares `sequence: [draft, pending, backlog, in-progress, in-review, approved, done]`
with gates on `pending` and `in-review`, adapted from WingFoil's own machine **without** its waiting
states, precisely because no workflow engine exists here and a waiting edge would have had no verb.
The `release` and `campaign` types carry different machines again. All of it validated with no
changes to WingFoil.

It also held under pressure, which is the part worth recording. Two agent sessions working the same
repository hit the single-`in-progress` WIP limit from opposite directions, with conflicting
instructions. Because the limit was declared and the machine had no way to fudge it, neither session
could quietly proceed: both stopped and the question went to the approver, who settled it in one
step. A constraint that merely *documented* the intent would have been rationalised away by two
agents in a hurry; one that could not be expressed away forced the decision into the open, where it
belonged.

The mechanism behind the conflict is the part to keep, because it will recur. Neither session was
wrong: both had asked the same approver, at different moments, and each was acting on the answer it
had. One picture was simply older than the other, and nothing in the repository said so — an element's
`status:` records what the machine did, not what the approver last said about what should happen
next. Two agents in good faith, one shared approver, no timestamp on a decision: that is the failure
mode, not carelessness. What contained it was that the limit could not be fudged, so the stale
picture could not be acted on silently; and that both sessions said out loud what they were about to
do before doing it.

A related trap, since the two are easy to confuse: the limit is "at most 1 `in-progress` **and** 1
`in-review`" — two separate slots, not one. When `task-005` moved to `in-review` the `in-progress`
slot became free and the limit stopped binding at all, while the approver's explicit ordering stayed
in force. A constraint relaxing does not retire a decision that was taken while it was tight; but it
does change the question worth asking, from "may we?" to "did you mean the limit, or the order?".

Caveat, kept separate as N22: the same rigidity means a started task cannot be put down at all, so
"free the slot" has only two answers. The limit being honest is a feature; the missing verb is not.

Evidence: `.wingfoil/memory.yaml` `types.task.states` and the `release`/`campaign` blocks at
`077156e`; `kanban-delivery.yaml` header.

## N27 — positive: `.wingfoil/` is declarative and readable from outside

The whole configuration — workflows, roles, directives, element schema — is plain YAML and Markdown
under `.wingfoil/`, with no build step and nothing generated. That is the only reason `bug-001` was
found: an external reader (the roadmap viewer, a separate program that re-reads the repository per
request) could load the workflow graph and check that every `sub` workflow is included by some phase.
`npx wingfoil workflow list` did not report the defect (N18), so without a format a second tool could
read, a five-line configuration error would still be in place.

The general point: keeping configuration declarative and inspectable means a project is not limited
to the checks its own CLI happens to implement. Anyone can write the check that matters to them
against the files, and a reviewer can diff configuration changes in a pull request like any other
code.

Evidence: `tools/roadmap/start.sh --repo <this repo>` reading `.wingfoil/` directly and reporting
13 warnings at `2d5c9b8`.

## N28 — `workflow list` accepts an action on a Memory type that does not exist, and a role nobody has

While delivering `task-009` (the fix of `bug-002`), the three ingest workflows were given
`actions: ['memory.add(type: <t>)', memory.submit]`, a `role` and a `produces` path. As an
adversarial probe, `adr-ingest` was then edited to `memory.add(type: nonsense)` and `role: nobody`:
`npx wingfoil workflow list` exited 0 with an empty stderr, exactly as for the correct file. Nothing
checks an action's `type` against `memory.yaml`'s types, a phase's `role` against `roles.yaml`, or a
`produces` path against the type's `path:` pattern — so the three declarations can drift from the
schema they describe, and "the tool accepted it" proves nothing about them. The same class as
`bug-001` and `bug-002`: well-formed values that say something false pass validation.

Evidence: `task-009` execution notes; commits `11eeb89`, `3140747`, `132976c`.

Suggested kind: bug (WingFoil: cross-check workflow declarations against the Memory schema and roles).

## N29 — no way to link two Memory elements, and a bug never closes

`bug-005` in this repository: a task cannot name the bug it fixes except in prose, and the `bug`
type's default machine ends at `approved`, so a fixed bug and an untouched one have the same state.
The approver asked why four bugs had no task; three had one, in prose that no search or check reads.
This repository will add a `fixes:` field and a terminal state of its own (triage of release v0.2),
but every WingFoil project that files bugs meets the same gap, and a relation between elements —
`fixes`, `supersedes`, `implements` — is the kind of thing the tool, rather than each project's
frontmatter, should know about.

Evidence: `bug-005-a-bug-cannot-name-the-task-that-fixes-it-and-never-closes`; `memory history` on
`bug-001` / `task-008` and `bug-004` / `task-007`.

Suggested kind: decision-log (WingFoil: element relations and bug resolution).

## N30 — `init --help` does not list the templates, and `--template` is required without a TTY

Found by the W3 spike (task-011, P3), running WingFoil `3df305e` headless in a container. With no TTY,
`wingfoil init` exits 2 with `missing required argument: --template`, which is right — but neither that
message nor `init --help` says which values exist. The names (`Scrum`, the default, and `Kanban`) came
from `src/storage/templates.ts`. A tool meant to be driven by agents and scripts should list its
choices where a script can read them.

Evidence: `spikes/task-011/p3-init.sh`, task-011 Execution notes (Q3), commit `35e35f1` on
`task/task-011-wingfoil-in-the-run-container-spike`.

Suggested kind: bug (WingFoil: `init --help` and the missing-template error name the templates).

## N31 — the MCP server of `3df305e` has no Tools, and `tools/list` fails instead of returning none

`wingfoil mcp` at `3df305e` declares only `resources` and `prompts`; `tools/list` answers
`-32601 Method not found`. `src/mcp/server.ts` says this is deliberate (Tools are P5.2.3), and
`src/mcp/registrar.ts` even explains that `registerCapabilities({tools: {}})` is what makes
`tools/list` return an empty list — but `createMcpServer` does not call it. Two consequences: a client
that probes Tools sees a protocol error rather than "none"; and the benchmark's own specification (K5)
had recorded "mutating MCP Tools" as present in this build, which nobody could check without running
it. A capability listing per build (what the CLI and MCP offer at a commit) would have caught it.

Evidence: `spikes/task-011/p6-mcp.sh`, `out/p6/responses.jsonl`; task-011 Execution notes (Q6).

Suggested kind: bug (WingFoil: advertise the Tools capability with zero Tools); decision-log for
publishing a per-build capability list.

## N32 — approval authority reads `git config`, the commit author comes from the environment

`requireApprovalAuthority` and `requireGitIdentity` read `git config user.email`/`user.name`; git itself
takes a commit's author from `GIT_AUTHOR_*` when set. In the spike's container both were set,
differently: `memory approve` passed as "Benchmark Approver" (config) and wrote a commit *authored* by
"WingFoil Benchmark" (environment), whose body names Benchmark Approver as approver. The audit trail
then carries two identities for one act. With only the environment set, WingFoil refuses with
`git identity not configured` although git would commit happily. WingFoil could resolve the identity
the way git will (`git var GIT_AUTHOR_IDENT`), so that the check and the commit agree.

Evidence: `spikes/task-011/p4p5-config.sh`, `out/p4p5.log`; task-011 Execution notes (Q3, Q5).

Suggested kind: bug (WingFoil: check the identity git will actually record).

## N33 — no command declares a team member, so the approver is added by hand-editing `dna.yaml`

`dna set` writes string leaves only; `dna set team.members …` and `dna show team.members` answer
`no DNA key named 'team.members'`. Declaring who may approve — the one fact approval authority rests
on — therefore happens outside the command surface, in a hand edit with a hand-written commit that no
WingFoil operation records. (dl-081 in WingFoil already discusses the DNA mutation surface; this is
one concrete case of it.)

Evidence: `spikes/task-011/p4p5-config.sh`; task-011 Execution notes (Q5).

Suggested kind: decision-log (WingFoil: a verb for team members, or `dna set` on collections).

## N34 — positive: the build is reproducible byte for byte

`npm ci` + `npm pack` on a clean `git archive` of `3df305e` gave the same SHA-256 twice in the pinned
`node:22-bookworm` container (Node 22.23.2), once on the host (Node 22.21.0), and the same as the
tarball vendored here days earlier. A commit identifies its package, which is what lets the benchmark
pin "the WingFoil under test" by SHA alone. Worth keeping as a property (a CI check), since nothing
states it today. The flip side, for anyone installing from the tarball: the lockfile is not in it,
and a plain `npm install` of the tarball resolved 17 of 111 dependencies to other versions.

Evidence: `spikes/task-011/p1-build.sh`, `p2-install.sh`; task-011 Execution notes (Q1, Q2).

Suggested kind: decision-log (WingFoil: reproducible builds as a stated property; lockfile-faithful
install instructions).

## N35 — positive: v0.2.2 answers N33, and its write guard leaves `submit` alone

`wingfoil dna add team.members --value "…" --entry-email … --entry-roles approver` declares a member and
commits by itself (`wf(dna): add team.members …`), keeping the comments and flow style `init` wrote; the
benchmark's wingfoil arm now uses it instead of a hand edit (task-049). N33 is answered by v0.2.2.

The write guard (dl-080) refuses `approve`, `reject` and `deprecate` on a document with uncommitted
changes and names the remedy ("commit or stash these changes first"); `submit` carries the body by design.
Worth a line in the user docs, though: from the outside the asymmetry is easy to misread — this repository's
own task-049 design first read it as refusing `submit`, from the source's general description of the guard.

Evidence: task-049 Execution notes (a reproduction with `wingfoil@0.2.2`; the W3 Docker test on v0.2.2).

Suggested kind: decision-log (WingFoil: state in the CLI docs which verbs the write guard covers).

## N36 — a gate's `--reason` is committed verbatim, with no echo, and only an unpushed amend corrects it

At v0.1's release (2026-10-05) the approver pasted two commands at once. The second one's leading `cd` ended up at
the end of the first one's `--reason`, and `memory approve rel-v0-1` committed
`Reason: … tag v0.1cd`. Nothing showed the reason back before the commit, and no verb corrects a recorded reason
(see N16, no verb amends an approved element). The commit had not been pushed yet, so it was fixed with
`git commit --amend` of the message alone (`34d2c23` → `137269b`). `memory history` then read the corrected
reason, as the record of a gate should. Once pushed, the only remedies would be a history rewrite or a second
commit explaining the first.

Evidence: rel-v0-1, Release checklist "publishing" line; this repository's `137269b`.

Suggested kind: decision-log (WingFoil: echo the transition and the reason before committing a gate, or a
`--reason-file`; a verb that corrects a gate's reason by a new, linked record).

## N37 — no verb checks an element before `submit`

`npx wingfoil memory validate` answers `unknown command 'validate'`. The required frontmatter fields of a type
(`memory.yaml`, e.g. the campaign type's `release`, `campaign_file`, `wingfoil_commit`) are only checked when
`submit` tries the transition. So the first sign that an element is incomplete is a refused transition, and there
is no way to check a whole directory of elements, for instance in CI.

Evidence: campaign-001's definition, 2026-10-03 (this repository's `6fc8e4c` → `586e5c2` → `4727cfd`).

Suggested kind: decision-log (WingFoil: `memory validate [<id>|--all]` against the type's schema).

## N38 — `memory add` takes no field values, so every required field is a hand edit

`memory add` accepts `--type`, `--title` and `--tags` only. A campaign element's `release`, `campaign_file`,
`campaign_id` and `wingfoil_commit` come out as empty strings with template comments, and are filled by editing the
file. A task's `release`, `wave`, `features`, `acceptance` and `requirements` are filled the same way: about 55
times in this release. Values that the caller already knows when it creates the element take a second, unrecorded
step.

Evidence: every `wf(task): add …` and `wf(campaign): add …` commit followed by a `docs(…)` commit filling its
frontmatter, e.g. `6fc8e4c`, then `586e5c2`.

Suggested kind: decision-log (WingFoil: `memory add … --set <key>=<value>`, or reading the frontmatter from a file).

## N39 — positive: the campaign machine's reject-back absorbed a failed execution without bending the process

The benchmark's own `campaign` type (`memory.yaml`) has three approver gates and a reject from `scored` back to
`running`. The v0.1 reference campaign's first execution lost 3 of 19 runs to a runner bug (bug-011). The
approver's `memory reject` (scored → running, `1ab1d67`) recorded why. The fix went through its own task, the
campaign ran again as execution 2, and the same element went on to `scored`, `reviewed` and `published`. The
history reads as what happened, with no hand edit and no out-of-band note. Custom per-type state machines with a
reject target (N26) carried a real incident here, not only the happy path.

Evidence: `npx wingfoil memory history campaign-001-v0-1-reference-campaign`; this repository's `1ab1d67`,
`1f8723e`, `5f3c2fc`, `7ef4c55`.

Suggested kind: none (positive: worth a worked example in WingFoil's docs on custom element types).

## N40 — an approver's decision that is not a state transition has no record

Spending consents during calibration were given in chat ("cap 4 €, stage ceiling about 10 €") and committed by the
agent as ordinary `docs(…)` commits, with no `Approver:` or `Reason:` line (`5f4b5eb`, `e37dee2`). Only transitions
produce an approval record (N24), so a decision of the approver that moves no element has nowhere to go but prose.
A ledger line says "the approver in chat". Related to N10, which concerns a plan with no verb to close it.

Evidence: docs/calibration/v0.1-ledger.md (task-050's lines); task-050 Execution notes.

Suggested kind: decision-log (WingFoil: a recorded approver decision on an element without a transition, e.g.
`memory approve <id> --decision "<text>"` leaving the state as it is).

## N41 — a gate commits on whatever branch is checked out

`memory approve` committed bug-010's approval on the task-050 branch, because the command ran in that task's linked
worktree (`ea21256`). The bug's state then differed between `main` and the branch, and the approval had to be
cherry-picked to `main` (`86327a2`) and dropped from the branch. Nothing says which branch an element's state belongs
to, nor warns when a gate runs elsewhere.

Evidence: this repository's `ea21256`, `86327a2` (2026-10-03).

Suggested kind: decision-log (WingFoil: a home branch per element type or per element, and a warning when a gate
runs off it).

## N42 — the role's context is not delivered when an agent's session starts

In the benchmark's wingfoil arm, Claude Code never loaded WingFoil's `developer-session` MCP Prompt by itself. The
agent found its rules and decisions through CLI calls instead, which took 9–19 % of a run's cost, against about
1 300 tokens for the directives themselves (calibration v0.1 §7). In the published v0.1 results the wingfoil arm
costs ×1.55 the baseline on S1, and this is part of it.

Evidence: docs/calibration/v0.1.md §7; findings/c82a5e74885b-2-s1-1.0-m-k1-baseline+wingfoil.md.

Suggested kind: decision-log (WingFoil: deliver role context at session start, e.g. a generated `CLAUDE.md`
section or a hook, rather than relying on the agent to fetch a Prompt).

## N43 — the agents' guide sets rules, not a level of process, and the benchmark's arm did not start from it

*Corrected on 2026-10-05: the first version said WingFoil recommends no manual for agents. It does:*
[`docs/agents.md`](https://github.com/wingfoil/wingfoil/blob/main/docs/agents.md), in WingFoil since 2026-09-25
(`8e5c14f4`) and part of v0.2.2.

What remains:

- **No level of process.** The guide gives an agent rules: load your role's directives, read before you write,
  change state only through the verbs, never approve. It does not say how much to record, for instance a task per
  request, a decision-log per design decision, or only what the workflow asks. The benchmark's wingfoil arm chose
  the disciplined end ("a task and a decision-log per request, each submitted and approved"). That choice, not
  WingFoil's, is what the v0.1 results measure, and the method page has to say so. A light and a strict recommended
  level would let a user, or a benchmark, adopt "WingFoil's own".
- **The benchmark's manual was not derived from the guide**, and differs from it on one rule. In the arm, the agent
  runs `memory approve` itself after the neutral approver's fixed reply (benchmark REQ-RUN-17, an approver member
  declared for the arm), where the guide says an agent never approves. The arm's design is deliberate, but nothing in
  the guide covers an automated approver, which is the benchmark's case and any unattended pipeline's.

Evidence: arms/wingfoil/manual.md; WingFoil `docs/agents.md` §4 rules 2–3; docs/calibration/v0.1.md §7;
site-content/method.md `#wingfoil-manual-process`.

Suggested kind: decision-log (WingFoil: recommended levels of process in `docs/agents.md`; how an unattended,
automated approver fits rule 2).

## N44 — the tarball installs without an executable bin

Unpacking the `npm pack` tarball of `3df305e` gives `dist/cli.js` with mode 644, and an unpacked install has no
`wingfoil` bin shim. The benchmark's container needed a wrapper script to call `wingfoil`. Related to N4, which
concerns using an unpublished WingFoil.

Evidence: task-011 Execution notes (Q2); spikes/task-011/p2-install.sh.

Suggested kind: bug.

## N45 — configuration copied in as files loses its approval provenance

The benchmark's wingfoil arm installs WingFoil's configuration and approved records into each run's workspace by
copying files (adr-003, "copy, not replay"). `memory history` then shows those records with `operation: null` and
`approver: null`: the approval that made them `approved` is not carried with them. No import verb preserves it. N7
and N8 touch `operation: null` from other causes.

Evidence: task-011 Execution notes (Q4); adr-003.

Suggested kind: decision-log (WingFoil: an import that keeps each record's approval, or marks it imported).

## N46 — `init`'s commit subject carries an internal plan id

`wingfoil init` commits `chore(wingfoil): initialize … (P5.1.1)`. `P5.1.1` is an id of WingFoil's own development
plan, meaningless in a user's repository.

Evidence: task-011 Execution notes (Q3); task-013.

Suggested kind: bug.

## N47 — `init` requires the git identity in the repository's config, and refuses the environment's

`init` fails with `git identity not configured` when the identity is given only as `GIT_AUTHOR_*` /
`GIT_COMMITTER_*` environment variables, which git itself accepts. N32 reports the same split for `approve`; this
is the same rule at `init`.

Evidence: task-011 Execution notes (Q3).

Suggested kind: bug (or extend N32).

## N48 — a second `submit` from `pending` reports a transition to "(none)"

`memory submit` on an element already `pending`, whose next state is reached only by `approve`, answers
`illegal transition pending -> (none)`. It does not say that `pending` waits for the approver. A neighbour of N12,
which reports an "illegal transition" message naming a target the verb would never reach.

Evidence: task-049 Execution notes.

Suggested kind: bug (or extend N12).

## N49 — a second `approve` on an approved element reports a transition to the type's first gate's target

`memory approve` on a task already `approved` answers `illegal transition approved -> backlog for type 'task'`.
`backlog` is where the task machine's *other* approval edge leads (`pending → backlog`); from `approved` the next
step is `submit` (→ `done`), and no `approve` applies. The message names a target the verb would never reach from
this state, and does not say the element is already approved. Same family as N12 and N48.

Evidence: task-056 Execution notes (Review and approval). **Reproduced on a terminal state** (task-058): `memory
submit` on a bug already `fixed`, the last state of its sequence, answers `illegal transition fixed -> pending`:
`pending` is the sequence's first gate, not a successor of `fixed`. It should say the element is in a final state.

Suggested kind: bug (or extend N12/N48).

## N50 — `approve --reason` accepts a template placeholder as the recorded reason

The approver ran the command handed over by the agent, with `--reason "<motivo>"` left as written; WingFoil recorded
`Reason: <motivo>` in the approval commit's trailer. A reason made only of a `<…>` placeholder (or empty of words)
is accepted, and the permanent record says nothing. The fault is the hand-over's (a placeholder where a reason was
due); WingFoil could still refuse a reason that is only an angle-bracketed token.

Evidence: task-056's approval commit, first `68c4a80` with `Reason: <motivo>`; rewritten as `c327fed` before any push, at the
approver's request (task-056 Execution notes). A wrong reason costs a history rewrite.

Suggested kind: decision-log (a minimal reason check), low priority.

## N51 — `submit` takes no `--reason`, while `approve` and `reject` require one

`npx wingfoil memory submit bug-017-… --reason "…"` failed with `error: unknown option '--reason' (Did you mean
--version?)`; the same command without it moved the bug draft → pending. A transition commit thus carries a reason
for some verbs and not for others, and a user who writes the reason by habit gets a refusal whose suggestion
(`--version`) is unrelated. Nothing was committed by the failed call.

Evidence: W12 delivery session, 2026-10-07, bug-017's submit (`5e6c6fa`). Declared (help): `submit <id>`. Observed:
as declared.

Suggested kind: decision-log (an optional `--reason` on every transition, recorded as approve's is), low priority.
