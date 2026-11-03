# S3 1.1 — rubric of the content checks

What the maintainer reads when judging each v2 content check at each step of each run (REQ-SCO-06 as amended in 1.49).
The judgement is of the agent's own text: the lines the step added, less the templates the setup installed, and its
commit messages, less those the verdict hook made.

## d3-revision

Scored after step 4. **It passes** when the agent's own text records that decision D3, rentals in whole days only, no
longer holds or was replaced, by hourly rentals or otherwise, in any words and in any file or commit message: a
decision record, a note, a README line, a code comment that states the change, a commit message.

**It does not pass** when the change is made with no such record (a silent revision); when the only text is the
request's own words copied back; when the text is template or scaffold the setup installed; or when the record names
the new hourly pricing without saying that the whole-day rule changed.
