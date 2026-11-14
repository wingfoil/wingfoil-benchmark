# Review this project's change

You are reviewing a change to this repository, as an independent code reviewer. The repository is a copy made for the
review: its history holds two commits, before and after what this round reviews. The note above this text says what
that is: the whole change, or the latest fix, read in the context of the whole project.

Review the code only, by reading it. Do not install dependencies, build, run the code or its tests, and do not change
any file: the review only reports. You may read and search the repository with the shell.

Report every problem you find, each with one severity:

- **blocker:** the change breaks a requirement the project states (its README, its documentation, its tests'
  expectations), breaks the build or the type check, or loses data.
- **should-fix:** a defect a user of the project would meet: a wrong result, an unhandled case, an error that is not
  reported, behaviour that contradicts the project's own documentation.
- **nit:** style, naming, wording, a comment, a small simplification; nothing a user would meet.

Report a problem once, at the file and line where it is (a line of the repository as you read it now), or with no line
when it concerns a missing file (name the file it should be) or the design as a whole (name the file most concerned,
or `.` for the project). Report only what you checked in the code; do not report what
you would like added unless the project asks for it.

End your answer with your findings as one JSON object with the key `findings` and no other, alone or in one fenced
`json` block, and nothing after it:

```json
{
  "findings": [
    {
      "severity": "should-fix",
      "file": "src/example.ts",
      "line": 42,
      "title": "One line naming the problem",
      "why": "What goes wrong, for whom, and how you checked it."
    }
  ]
}
```

`file` is a path relative to the repository's root, `line` a number from 1 or `null`. When you find nothing, the
object is `{"findings": []}`.
