---
id: bug-037-the-site-s-markdown-renderer-has-no-ordered-list-and-loops-on-a-numbered-item-holding-a-nested-list
type: bug
title: "The site's Markdown renderer has no ordered list and loops on a numbered item holding a nested list"
status: draft
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3","site"]
---

## Context

Found by task-114 (2026-10-27), writing the step-A wingfoil manual from task-107's spike arm, whose rules are a
numbered list with a nested bullet list under one item. The site renders every arm's manual through its own Markdown
subset (`src/site/markdown.ts`, task-046), which knows headings, paragraphs, bullet lists (`-` or `*`), code fences,
tables and comments, and no ordered list.

## Expected

A numbered list renders as `<ol>`, and any text the renderer does not know ends as a paragraph, in bounded time.

## Actual

- `1. a\n2. c` renders as one paragraph, `<p>1. a 2. c</p>`: a manual's numbered rules lose their structure on the
  site.
- `1. a\n   - b\n2. c` (a numbered item holding an indented bullet) never returns: `renderMarkdown` loops, allocating
  until the process runs out of heap. The task-114 branch's unit tests of the site (`test/unit/site/build.test.ts`,
  `eligibility.test.ts`, `method.test.ts`, `publish.test.ts`) aborted with "JavaScript heap out of memory" while the
  step-A manual had that shape; the same tests pass in seconds once the manual uses bullets only.

Reproduced on the renderer alone, each input under a 5-second timeout: the first returns, the second is killed.

## Impact

The published eligibility page is affected now: `site-content/eligibility.md` lists the five criteria as a numbered
list, which the page shows flattened into one paragraph. No manual has a numbered list. A manual or site text that
adds a numbered item holding a nested list breaks the site build (a hang, not a refusal). task-114 wrote
the step-A manual in bullets to avoid it, so the arm's text does not wait on this fix.

## Resolution

To be planned: the renderer reads ordered lists as `<ol>` (nested lists included), and a line it cannot consume
advances the reader, with a test that renders the hanging input within a bound.
