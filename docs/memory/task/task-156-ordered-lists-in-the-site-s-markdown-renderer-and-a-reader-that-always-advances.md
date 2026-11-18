---
id: task-156-ordered-lists-in-the-site-s-markdown-renderer-and-a-reader-that-always-advances
type: task
title: "Ordered lists in the site's Markdown renderer, and a reader that always advances"
status: in-progress
release: v0.3
wave: publishing
features: [F5.8, F7.4]
acceptance: []
requirements: [REQ-RES-02, REQ-RES-09, REQ-NFR-05]
fixes: [bug-037-the-site-s-markdown-renderer-has-no-ordered-list-and-loops-on-a-numbered-item-holding-a-nested-list]
tags: ["v0.3","site"]
---

## Context

This task fixes [bug-037](../bug/bug-037-the-site-s-markdown-renderer-has-no-ordered-list-and-loops-on-a-numbered-item-holding-a-nested-list.md) before v0.3 publishes, as the approver chose on 2026-11-17.
`src/site/markdown.ts` (task-046) renders the method page, the eligibility page, the arms' manuals, S8's directives and
the licence notices. It has two defects:

- **No ordered list.** `site-content/eligibility.md` writes the five criteria as a numbered list, and the published
  page shows them flattened into one paragraph.
- **The build can hang.** The top-level loop calls `list(lines, index, 0, …)` for any line matching `ITEM`. An item
  indented by one to three spaces fails the `indent === 0` test, so `list` returns the same index and the loop never
  advances, adding an empty `<ul>` each time until the heap runs out.

Reproduced on 2026-11-18 under a 5-second timeout: `1. a\n   - b\n2. c` is killed, as the bug says, and so is
`  - a\n1. b`. The hang needs no numbered item: **any bullet indented at the top level** triggers it, which is wider
than the bug's title.

No rendered source has that shape today, so the site builds. The only numbered list in the rendered sources is the
eligibility page's.

**Done** means the eligibility page shows its five criteria as an `<ol>`, every other published page keeps its bytes,
and no Markdown input can stop the renderer from finishing.

## Acceptance criteria

<!-- A renderer fix: unit tests in test/unit/site/markdown.test.ts, each red first. No Gherkin scenario planned. -->

1. **An ordered list renders as `<ol>`:** `1. a\n2. c` gives `<ol>` with two `<li>`, and an item takes an anchor at its
   end and continuation lines as a bullet item does.
2. **Its first number is kept:** a list that starts at another number carries `start`, as `<ol start="3">`.
3. **Nested lists work in both directions:** `1. a\n   - b\n2. c` gives one `<ol>` of two items, the first holding a
   `<ul>`, and a bullet item can hold an `<ol>`.
4. **An item keeps every nested list:** `1. a\n   - b\n   1. c` keeps both nested lists. Today a second nested list
   replaces the first, so its text would be lost.
5. **A change of marker starts a new list:** `- a\n1. b` gives a `<ul>` and then an `<ol>`.
6. **A number does not break a paragraph by accident:** inside a paragraph or an item's text, only a line starting
   `1.` opens a list, so a wrapped line such as `2026. was the year` stays text.
7. **The reader always advances:** the inputs above, a bullet indented at the top level (`  - a`) and a table of
   malformed lines each render within a bound, in a child process with a timeout so that a regression fails instead of
   hanging the suite. The top-level loop also has a guard: a line no block consumes ends as a paragraph.
8. **The published pages (characterization):** the eligibility page holds an `<ol>` with the five criteria and their
   text. Every other rendered source gives the same bytes before and after: the method page's text, each arm's manual,
   the directives and the licence notices.
9. **Checks:** `scripts/pre-review.sh main`, an independent read-only review (dl-020), and the full suites on the
   approver's go.

## Design

- **One item pattern for both markers:** `ITEM` becomes a pattern that reads the indent, the marker and the text, with
  a small helper giving each list's kind (`ul`, or `ol` with its first number). `list` ends when the kind or the indent
  changes.
- **The top-level call passes the line's own indent,** which removes the hang at its cause. The guard in criterion 7
  stays as the bound for any future block.
- **Nested lists are appended** to the item, not assigned.
- **The subset stays small:** no `1)` marker, no loose-list paragraphs and no third nesting level, because no rendered
  source needs them. Such text still renders, as text, in bounded time.
- **The same bytes for the same text (REQ-NFR-05):** the rules are fixed and use no locale or clock.
- **No spending:** no agent runs, and no campaign or dry run is touched.

## Execution notes

- **Red first:** the new tests failed before the fix. Three of them hung in the test process and were stopped by a
  timeout, which is the defect itself; the bounded test runs the renderer in a child process.
- **The guard is structural:** a paragraph now starts from the line no other block took, and a list reads its own first
  item, so the reader advances without a branch that no input could reach.
- **The published sources (characterization):** all 32 rendered sources (the manuals, `site-content/`, the directives
  and the notices) were rendered with main's build and with this branch's. Only `site-content/eligibility.md` differs.
