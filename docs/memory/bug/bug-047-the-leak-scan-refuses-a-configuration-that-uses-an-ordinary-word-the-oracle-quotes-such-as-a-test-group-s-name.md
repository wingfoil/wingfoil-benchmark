---
id: bug-047-the-leak-scan-refuses-a-configuration-that-uses-an-ordinary-word-the-oracle-quotes-such-as-a-test-group-s-name
type: bug
title: "The leak scan refuses a configuration that uses an ordinary word the oracle quotes, such as a test group's name"
status: approved
fixed_by: task-143-w18-the-twelve-configurations-of-s1-s2-s3-and-s8-at-1.1
tags: ["v0.3","configured","leak-scan"]
---

## Context

Found by [task-143](../task/task-143-w18-the-twelve-configurations-of-s1-s2-s3-and-s8-at-1.1.md) after its twelve
configuring sessions (2026-11-08, 0.7237 EUR, every one written). `bench scenario configure` scans only the
configuring prompt before a session (REQ-RUN-20); the configuration it writes is scanned by `bench scenario validate`
(REQ-FMT-08 as amended in 1.50), which no step of the command runs. After the sessions, S1@1.1 and S3@1.1 validate;
S2@1.1 and S8@1.1 do not, and the acceptance tests that validate the real 1.1 versions (task-131, task-132) fail.

## Expected

A configuration written from the seed by an agent that saw no oracle passes the leak scan when it holds no oracle
value: an ordinary English word used as prose, in a sentence paraphrasing the README, is not an oracle literal.

## Actual

`scenario validate` refuses four configurations, each for one word of eight letters or more that an oracle file
quotes as the name of a test group:

| Version | Configuration | Word | Where the oracle quotes it | The configuration's sentence |
|---|---|---|---|---|
| S2@1.1 | speckit-configured, wingfoil-configured | `duplicate` | `oracle/reports-3/reports.test.mts`: `const DUPLICATE = 'duplicate'`, a `describe` label | "duplicate SKUs merged" (the README: "Two lines with the same SKU are merged into one") |
| S8@1.1 | openspec-configured, speckit-configured | `identifiers` | `oracle/ids/ids.test.mts`: `describe('identifiers', …)` | "no `Math.random()`, no random identifiers" |

Neither word is in the version's seed or prompts. `oracleLiterals` takes every quoted string of at least
`oracle_literal_min_length` (8) characters with a letter or digit, so a one-word test group name is a literal; a
hand-written prompt or seed rarely meets one by chance, an agent's prose does.

## Fix (the approver's choice, 2026-11-09: fix 1, inside task-143)

1. **Recommended:** in a configuration, look only for the oracle literals that are more than one word or hold a
   character other than a letter (a value, a message, a code such as `ORD-0001`), and keep every literal for the
   prompts, the seed and the arm configurations as today; a red test with S2's case first.
2. Or a per-scenario allow list in `scenarios/leak-scan.yaml`, naming the words a configuration may use.
3. Or raise `oracle_literal_min_length` for configurations only.

The configurations are kept as written either way: their records hold their files' SHA-256, and no session reruns.

## Resolution

Fixed by [task-143](../task/task-143-w18-the-twelve-configurations-of-s1-s2-s3-and-s8-at-1.1.md), narrower than fix 1
as proposed: review round 1 found that skipping every all-letter literal would also skip camelCase names and
upper-case codes. A configuration may use an oracle literal only when it is one prose word, lower case or
capitalised; a literal of more than one word, holding a non-letter, or with an inner capital is still refused.
Prompts, seed and arm configurations keep every literal. Requirements 1.55 (REQ-FMT-08).
