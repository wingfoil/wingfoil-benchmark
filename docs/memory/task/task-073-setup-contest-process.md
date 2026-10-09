---
id: task-073-setup-contest-process
type: task
title: "Setup contest process"
status: in-progress
release: v0.2
wave: W13
features: [F7.2]
acceptance:
  - "competitors.feature#A setup can be contested from its page"
  - "competitors.feature#A corrected setup runs as a new campaign and the old one stays published"
requirements: [REQ-RES-10, REQ-RES-02, REQ-FMT-13]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

The setup contest process ([rel-v0-2](../release/rel-v0-2.md), W13, F7.2; REQ-RES-10):

- `.github/ISSUE_TEMPLATE/contest-setup.yml` asks for the arm, the setup step, what the tool's official documentation
  says and the proposed correction; every setup page links it;
- `site-content/contests.yaml` (`{campaign, arm, issue, followed_by}`), written by the maintainer and read by the site:
  a contested execution's setup page links its contest and the campaign that followed;
- **task-067's review point B**, which the approver placed here (2026-10-07): a contested execution must stay
  buildable after its arm is corrected. Today a rebuild is refused once a ran harness arm's files differ from the
  `arm_digest` its runs recorded (and the manual's sha256). The approver's choice: **read the arm — setup page and
  manual — at its recorded state**, from the repository's history, so the old pages stay as they ran and gain the
  links.

The third F7.2 scenario ("a campaign file whose pinned arm digest no longer matches the arm is refused") was delivered
by task-064. **No real agent, no spending.** **Done** means: the two scenarios green; a site built after an arm's
correction keeps the contested execution's setup and manual pages as they ran, with the contest's links.

## Acceptance criteria

- `competitors.feature#A setup can be contested from its page`. **Red-first.**
- `competitors.feature#A corrected setup runs as a new campaign and the old one stays published`. **Red-first**
  (including the rebuild after the arm's correction, point B).

## Design

Delivered under kanban-delivery version 5. By day: typecheck, lint and the touched tests, niced. The full suites run
on demand before approval.

### 1. The contest form (REQ-RES-10)

`.github/ISSUE_TEMPLATE/contest-setup.yml` is a GitHub issue form with four required fields:

- **the arm:** a dropdown of the harness arms;
- **the setup step contested:** where in the setup script, or which generated file;
- **what the tool's official documentation says:** a text area, with its URL;
- **the proposed correction.**

Its labels name the setup page's sections, so that a reader can find each one.

### 2. Where the site finds the form and the contests

`site-content/contests.yaml`, written by the maintainer and read by the site (REQ-RES-02):

```yaml
repository: https://github.com/wingfoil/wingfoil-benchmark   # where the form is
contests:                                                      # may be empty
  - { campaign: <12 hex>, arm: <arm>, issue: <URL>, followed_by: <12 hex>/<n> }
```

- Every setup page gets a "Contest this setup" link to `<repository>/issues/new?template=contest-setup.yml`.
- A contested execution's setup page gains "Contested in <issue>", and "followed by campaign <id>, execution <n>",
  with a link to that execution's pages when this site holds them.
- No file means no contest link and no contests. The page says the setup cannot be contested from here, rather than
  print a broken link.
- The `repository` key is new. REQ-RES-10 is amended (requirements 1.29): the site cannot know its repository
  otherwise without reading a git remote.

### 3. The arm as it ran, from the repository's history (point B, the approver's choice)

Runs record each arm's `arm_digest` (REQ-FMT-13) and the manual's sha256, but no commit of this repository. So the
site reads an arm **at its recorded state**:

- **First the working tree,** when `arms/<arm>/` digests to the recorded value, as today.
- **Otherwise the repository's history:**
  - the commits touching `arms/<arm>/`, newest first (`git log --format=%H -- arms/<arm>`);
  - for each, the digest computed from that commit's tree (`git ls-tree -r` and each blob's bytes, the same lines as
    `armDigest`, a symlink as `link:<target>`);
  - the first commit that matches gives the arm's `arm.yaml`, setup script and manual for the page.
- **The manual,** for every arm, controls included, is checked the same way: the working tree's `manual.md` when its
  sha256 is the recorded one, otherwise the newest commit whose `arms/<arm>/manual.md` has it.
- **Neither found:** the build is refused, as today, the message adding "and no commit of the repository holds it".
  A site built outside a git repository finds no history, and behaves as before.

`armDigest` gains a twin, `armDigestOf(files)`, over a path → bytes map. `armDigest` itself becomes "read the working
tree, then `armDigestOf`", so both digests are one computation. The site reads git through a new read-only
`HistoryPort` in `src/core/ports/history.ts`, with `commitsTouching(repo, path)` and `filesAt(repo, commit, path)`
run by the system's git with the isolated environment. `buildSite` becomes asynchronous, and the CLI awaits it.

### 4. Scenario 2 (REQ-RES-10)

A corrected setup is a new campaign:

- the campaign file pins the corrected arm's digest (`arm_digests`), so its identity changes (task-064, REQ-FMT-02);
- the contested execution still builds: its values are unchanged, and its setup page shows the setup as it ran, read
  from history, with the contest and the campaign that followed.

### Tests

- **unit:**
  - the form's four required fields;
  - `contests.yaml` read, absent, or malformed (refused, naming it);
  - `armDigestOf` equal to `armDigest` on the same files;
  - the history lookup on a temporary git repository: the working tree's version, an older commit, none;
  - the setup page's contest links;
  - the manual from history.
- **acceptance:**
  - `#A setup can be contested from its page`: the built setup page links the form, and the form asks for the four
    things;
  - `#A corrected setup runs as a new campaign and the old one stays published`: a site execution in a git
    repository, its wingfoil arm corrected and committed, the campaign file with the new pin a new identity, and the
    old execution rebuilt with its setup as it ran and both links.
- **method.md:** `{#setup-pages}` names the contest link and the setup read as it ran.

## Execution notes

- `npx wingfoil memory add --type task --title "Setup contest process"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-073-setup-contest-process`, `status: draft`. Matches.
