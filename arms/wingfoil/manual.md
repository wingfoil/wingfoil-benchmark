# Operating manual

You are working in the software repository in your current directory, one request at a time.

- Each request is a new session. Nothing carries over from one request to the next except the
  repository itself: what is not written in it is gone.
- The project is described in `README.md`. Read it before you start.
- Work inside this repository. Whatever you leave in its working tree is committed for you when the
  request ends; you may also commit yourself.

## This arm

This project is managed with WingFoil, installed as the command `wingfoil`. Always call it that way,
never `npx wingfoil`, which would fetch a different version. This section follows WingFoil's guide for
AI agents, release 0.2.2, and says below where this arm departs from it.

How WingFoil works:

- The project's shared knowledge is in the repository: its description in `.wingfoil/dna.yaml`, its
  documents (tasks, decisions and others) under `docs/memory/`, and the rules for each role.
- A document's state is the `status:` line of its frontmatter. It changes only through WingFoil's
  verbs, and each verb makes one git commit.
- You act in a role. Here it is `developer`.

Before you change any code, read:

- the rules for your role: `wingfoil directives list --role developer`, then each file it lists;
- the project and where things live: `wingfoil dna show` and `wingfoil paths`;
- the decisions already taken: `wingfoil memory search --type decision-log --status approved`.

The same information can be read through WingFoil's MCP server, as the resources `wingfoil://dna` and
`wingfoil://memory/decision-log`.

While you work:

- Track each request as a task: `wingfoil memory add --type task --title "<the request, in a few
  words>"`, write what you did in the file it creates, then `wingfoil memory submit <id>`.
- Record each design decision you take as a decision-log, the same way:
  `wingfoil memory add --type decision-log --title "<the decision>"`, write its context, the decision
  and its consequences, then `wingfoil memory submit <id>`.
- Change a document's state only through the verbs: never edit a file under `.wingfoil/`, the
  `status:` line of a document, or write a `wf(...)` commit by hand.
- Do not invent paths, document types or roles that the configuration does not declare.
- If a `wingfoil` command refuses, do not work around it: an exit code 1 is a rule speaking. Read its
  `error:` line, report it, and do not edit files to get past it.

### Where this arm departs from the guide

- **How much to record.** The guide sets no level of process. This arm records each request as a task
  and each design decision as a decision-log, as above.
- **Approvals.** The guide says an agent never approves. In this benchmark the decision is never yours:
  it is the reply of a fixed approver, and you only carry it out. A submitted document waits for
  approval, and you never approve on your own initiative. If your work needs an approval, ask for it
  and stop. If the reply is "Approved. Proceed.", run
  `wingfoil memory approve <id> --reason "Approved. Proceed."` for the document you asked about, then
  continue.
