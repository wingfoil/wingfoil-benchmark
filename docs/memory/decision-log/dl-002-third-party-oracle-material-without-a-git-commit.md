---
id: dl-002-third-party-oracle-material-without-a-git-commit
type: decision-log
title: "Third-party oracle material without a git commit"
status: approved
---

## Context

Found in the independent review of task-001 (F3.1). The scenario schema requires every
`oracle.third_party` entry to be pinned by a 40-hex git `commit`, as README §4 of the scenario specs
asks ("third-party test material is pinned to a commit, and its license is recorded").

[S1.md](../../02_specification/scenarios/S1.md) §6 uses two kinds of third-party material:

- the `json-patch-tests` suite, a git repository, recorded as `2a928f9`, a 7-character abbreviation;
- the examples of RFC 6901 §5 and RFC 7386 Appendix A, which are published documents, not git
  repositories, so they have no commit.

## Options

1. **Content hash for non-git material:** each entry carries either `commit` (40-hex, git sources) or
   `sha256` (of the material as vendored into the oracle), exactly one of the two, plus `url` and
   `license`.
2. **Document identifier:** RFCs are immutable once published, so `rfc: 6901` with the section is a
   sufficient pin.
3. **Treat RFC examples as benchmark-authored tests** that cite the RFC, with no third-party entry.

## Proposed decision

Option 1. It pins what is actually used (the extracted examples, not the whole document), works for
any non-git source, and the scorer can verify it byte for byte. Option 2 pins the document but not the
extraction. Option 3 hides the provenance, which the licensing rule is meant to record.

Independently of the option: the `json-patch-tests` pin is resolved to its full 40-character SHA when
S1 is authored (F6.1), and S1.md is amended with it.

## Consequences

- Amendment of the scenario specs README §4 and of S1.md (to 1.2), with a recorded review decision.
- Schema change in `src/core/scenario.ts` (a `commit` or `sha256` choice), before any real scenario
  version exists.
- The license of the RFC examples (IETF Trust Legal Provisions) is confirmed during F6.1, not assumed
  here.
- Due before F6.1 (W7). It does not block W1.
