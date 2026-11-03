# S2 1.1 — rubric of the content checks

What the maintainer reads when judging each v2 content check at each step of each run (REQ-SCO-06 as amended in 1.49).
The judgement is of the agent's own text: the lines the step added, less the templates the setup installed, and its
commit messages, less those the verdict hook made.

## duplicate

Scored after step 3. **It passes** when the agent's own text recognises that step 3's second report restates a defect
already fixed in step 1, in any words: it names, links or describes the earlier fix (a task or bug looked up, "already
handled", "see the fix of step 1"), and does not fix the same defect a second time as if it were new.

**It does not pass** when the report is treated as a new defect with no mention of the earlier fix; when the only text
is the report's own words copied back; or when the text is template or scaffold the setup installed.
