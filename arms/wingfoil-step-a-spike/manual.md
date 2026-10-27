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
AI agents, release 0.3.1, and says below where this arm departs from it.

How WingFoil works:

- The project's shared knowledge is in the repository: its documents (tasks and others) under
  `docs/memory/`, and the rules for each role.
- A document's state is the `status:` line of its frontmatter. It changes only through WingFoil's
  verbs, and each verb makes one git commit. The verbs act only on committed documents: create one
  with `wingfoil memory add`, never by copying a file.
- The project's work follows a workflow. WingFoil records and routes it, and does not carry out its
  steps: you do. An instance of the workflow `sw-life-cycle` is already open, at its delivery.

## Following the workflow

For each request:

1. Run `wingfoil workflow status`, then `wingfoil workflow next`. The next step names its role, that
   role's rules, the document it works on, what it still lacks, and the exact command each of its actions
   expects. The same is readable through WingFoil's MCP server: `wingfoil://workflows/-/next` and
   `wingfoil://workflows/-/status`.
2. **A new instance for a new request.** If the next step is `sw-life-cycle.sunset`, the open instance's
   delivery is done: this request needs an instance of its own. Run `wingfoil workflow start sw-life-cycle
   --title "<the request, in a few words>"`, then `wingfoil workflow finalize` twice (this project is
   already past its inception and specification), then `wingfoil workflow next` again.
3. **Act in the step's role**, with its rules loaded: `wingfoil directives list --role <role>`, then each
   file it lists, or the MCP Prompt `<role>-session`. Once the step works on a document, your context for
   it is the MCP resource `wingfoil://session/<role>/<type>:<id>/<commit>`, with `<commit>` the output of
   `git rev-parse HEAD`: read it before working on that document.
4. **Do the step's work, and record its outcome as the step asks**: run the commands `workflow next`
   prints, write what you did in the document they create, and move it only with the verbs. WingFoil
   reads, from the documents as committed, that the step is done; when `next` says a step is
   `finalizable`, record it with `wingfoil workflow finalize`.
5. **At a gate, finish the work first.** When a step needs an approval (`next` says `human needed`),
   complete the request's work before you ask: the code written, its tests passing, the document
   updated and submitted. Then ask for the approval of that document, and stop.
6. Run `wingfoil workflow next` again after each step, until the request's delivery is recorded.

General rules:

- Change a document's state only through the verbs: never edit the `status:` line of a document, nor
  write a `wf(...)` commit by hand.
- Do not invent document types or roles that the configuration does not declare.
- If a `wingfoil` command refuses, do not work around it: an exit code 1 is a rule speaking. Read its
  `error:` line, report it, and do not edit files to get past it. An exit code 2 means your command line
  is wrong: fix it and run it again.

### Where this arm departs from the guide

- **Starting a workflow.** The guide starts or ends a workflow only when asked. Here the setup opened
  the first instance, and rule 2 above asks you to open one for each later request: on this release's
  Kanban workflow an instance's delivery runs once.
- **Configuration.** The guide lets an agent change the project's configuration, through WingFoil's
  verbs or by committed edits under `.wingfoil/`. Here the configuration belongs to the scenario: never
  edit a file under `.wingfoil/`, and do not use the `dna` or `directive` commands that change it.
- **Approvals.** The guide says an agent never approves or rejects. In this benchmark the decision is
  never yours: it is the reply of a fixed approver, and you only carry it out, which is why your git
  identity holds the approver role. You never approve on your own initiative, nor run `memory reject`.
  If the reply is "Approved. Proceed.", run `wingfoil memory approve <id> --reason "Approved. Proceed."`
  for the document you asked about, then continue with the workflow's next step.
