---
id: dl-009-benchmark-findings-linked-to-wingfoil-both-ways-and-verified-by-the-next-campaign
type: decision-log
title: "Benchmark findings linked to WingFoil both ways and verified by the next campaign"
status: approved
---

## Context

Raised by the approver on 2026-10-04, at campaign-001's `findings` phase. The v0.1 reference campaign exported its
first finding note: [M-K1 on S1@1.0, baseline against wingfoil](../../../findings/c82a5e74885b-2-s1-1.0-m-k1-baseline+wingfoil.md),
as a decision-log for WingFoil. The question was how findings are linked to the WingFoil project.

**What exists** (F5.4, REQ-CLI-07, REQ-RES-05):

- `bench finding` writes a note into this repository only, under `findings/`. It holds the campaign, the WingFoil
  commit, the scenario version, the runs, the metric's values and the `bench run show` commands. It ends with a block
  in the shape of a WingFoil bug or decision-log, at the template of the WingFoil release the campaign ran
  (v0.2.2), with `context: "benchmark finding"`.
- The maintainer files it in WingFoil by hand, with `wingfoil memory add`. The benchmark never writes into the
  WingFoil repository (plan-003 constraint).
- The campaign element's template lists "finding verification" among a campaign's purposes.

**What is missing:**

- **A stable link from WingFoil to the evidence.** The note's links are paths in this repository, which is private
  until plan-003 step 6. A WingFoil element filed now would point at nothing a reader can open.
- **The way back.** Nothing in the benchmark records which WingFoil element a finding became, so a finding cannot be
  followed to its decision, nor known to be still unfiled.
- **The close.** Nothing says when a finding is settled. A WingFoil decision that claims to change a metric is only
  confirmed by a later campaign on the WingFoil release that carries it.

## Options

- **A. By hand, as today.** The maintainer files the note and remembers the rest. Nothing to build; nothing traced.
- **B. Conventions only.** A fixed procedure and fields in the existing documents: permalinks after publishing, the
  WingFoil id recorded back in the campaign element and the note, and a verification line in the WingFoil element.
  No code.
- **C. B, with tool support.** `bench finding` gains a way to record the WingFoil element a note became, for
  example `bench finding … --filed-as <wingfoil-id>`, or a `findings/index.md` the site and the next campaign read.
  `campaign estimate` or `campaign validate` lists the open findings a campaign on a newer WingFoil release could
  verify.

## Proposal

**B for v0.1, C considered at v0.2's planning**, once there are more findings than one.

1. **File after publishing.** A finding is filed in WingFoil only once the benchmark's repository is public, and
   tagged (plan-003 step 6). The WingFoil element links:
   - the note's permalink at the release tag (`…/blob/v0.1/findings/<note>.md`);
   - the site's category page of the scenario's category.
2. **Record the way back.** Once filed, the WingFoil element's id is written back in two places:
   - the campaign element's **Findings** section, beside the note;
   - the note itself, in a line "Filed in WingFoil as `<id>` (`<WingFoil commit>`)" under its title.

   The note is otherwise generated: the line is the one hand-written addition, and it is said so in the commit.
3. **State the verification.** The WingFoil element's Actions say which benchmark campaign verifies it, by the
   metric and scenario of the note: for the M-K1 finding, the v0.2 reference campaign, which is calibration §11's
   **H1**. The campaign element of that campaign lists the findings it verifies in its **Purpose**, and its
   **Findings** section says whether each held or failed.
4. **The close.** A finding is settled when a verifying campaign has read its metric again, whatever the outcome.
   The outcome is recorded in both places: the benchmark's campaign element and the WingFoil element (the
   maintainer's).

## Consequences

- The M-K1 finding of campaign-001 is filed in WingFoil after plan-003 step 6. Its id is then recorded in
  campaign-001's Findings and in the note.
- The v0.2 reference campaign's element names the M-K1 finding among the findings it verifies.
- REQ-RES-05 is unchanged under B. Under C, the note's format and `bench finding` change, by a task and an amendment.
- Nothing is written into the WingFoil repository by the benchmark or its agent: filing, and the WingFoil side of
  each link, stay the maintainer's.
