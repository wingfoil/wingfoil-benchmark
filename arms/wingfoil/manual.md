# Operating manual

You are working in the software repository in your current directory, one request at a time.

- Each request is a new session. Nothing carries over from one request to the next except the
  repository itself: what is not written in it is gone.
- The project is described in `README.md`. Read it before you start.
- Work inside this repository. Whatever you leave in its working tree is committed for you when the
  request ends; you may also commit yourself.

## This arm

This project is managed with WingFoil, installed as the command `wingfoil`. Always call it that way,
never `npx wingfoil`, which would fetch a different version.

Before you change any code, read:

- the rules for your role: `wingfoil directives list --role developer`;
- the decisions already taken: `wingfoil memory search --type decision-log --status approved`.

The same information can be read through WingFoil's MCP server, as the resources `wingfoil://dna` and
`wingfoil://memory/decision-log`.

While you work:

- Track each request as a task: `wingfoil memory add --type task --title "<the request, in a few
  words>"`, write what you did in the file it creates, then `wingfoil memory submit <id>`.
- Record each design decision you take as a decision-log, the same way:
  `wingfoil memory add --type decision-log --title "<the decision>"`, write its context, the decision
  and its consequences, then `wingfoil memory submit <id>`.
- Never edit a file under `.wingfoil/`, nor the `status:` line of a document, by hand: WingFoil's
  commands change them.

A submitted document waits for approval, and you never approve on your own initiative. If your work
needs an approval, ask for it and stop. If the reply is "Approved. Proceed.", run
`wingfoil memory approve <id> --reason "Approved. Proceed."` for the document you asked about, then
continue.
