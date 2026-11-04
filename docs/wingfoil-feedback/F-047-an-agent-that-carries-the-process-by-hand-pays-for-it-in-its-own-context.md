---
id: F-047
title: "An agent that carries the process by hand pays for it in its own context"
kind: request
status: open
wingfoil_version: 0.3.0
answered_by: []
---

New note (task-133).

## Observed

On WingFoil 0.3.0 (`cc31d7a8`), in a project made with `wingfoil init --template Kanban`, a coding agent is instructed,
beyond WingFoil's guide for AI agents (which sets no level of process), to run the process itself at every request,
inside that request's session: `wingfoil directives list --role developer` and each file it lists; `wingfoil memory
search --type decision-log --status approved`; `wingfoil memory add --type task` for the request and `wingfoil memory
add --type decision-log` for each design decision, each then `wingfoil memory submit <id>`; and, when its work needs an
approval, it asks for one and stops, then runs `wingfoil memory approve <id> --reason "<the reply>"`, its identity
holding the approver role. No `wingfoil workflow start` and no `wingfoil agent execute` is run. Every command's output
stays in the agent's context and is read again at every later model call of the session (see F-046). Measured outside
WingFoil, on one specification-implementation project with three repetitions a side: such an agent's mean cost per run
is 1.70 times that of an agent with no harness on the same requests, and 1.27 times that of an agent that receives the
same rules as a Markdown file, with no commands.

## Expected

Documentation that says which of two readings a set-up measures, so that a consumer measuring WingFoil's cost knows what
the figure is the cost of: an agent carrying the process by hand, as above; or the work run as a near-deterministic
sequence of WingFoil commands: creating the Memory's elements, managing their states, executing agents and recording
people's approvals, the files and the judgement produced inside the commands by the agent a command executes.
Near-deterministic, not deterministic: an agent's output varies, but within a step whose inputs and outputs are defined;
and, in this reading, the sequence branches where an approval is rejected, a step cannot go on, or the work is set aside
(a reading of the process, not a list of what WingFoil 0.3.0 implements). A state machine, then: its steps
deterministic, their content and the choices not. Run as commands, outside any one agent's session, the only point that
cannot be automated is the approvals (execute a step, record its state, a person approves, execute the next), and an
agent pays for its step's own work, not for carrying the sequence; see F-041 for what keeps a step from being handed to
`wingfoil agent execute` unattended today.
