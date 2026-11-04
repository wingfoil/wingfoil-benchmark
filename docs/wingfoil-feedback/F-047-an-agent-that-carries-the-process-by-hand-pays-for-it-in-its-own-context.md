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

On WingFoil 0.3.0 (`cc31d7a8`), in a project set up with `init`'s scaffold, a coding agent instructed to follow
WingFoil's process on its own runs the whole sequence itself, inside one session for each request: it lists its
role's directives, searches the approved decisions, adds a task for the request and a decision-log for each design
decision, submits each of them, and asks for an approval when its work needs one. The workflow engine is never
started: nothing outside the agent runs a step. Every command's output stays in the agent's context and is read again
at every later model call of the session (see F-046). Measured on one specification-implementation project, three
repetitions a side: such an agent costs 1.70 times an agent with no harness on the same requests, and 1.27 times an
agent that receives the same rules as plain text with no process.

## Expected

The work of a WingFoil project read as a near-deterministic sequence of WingFoil commands: creating the Memory's
elements, managing their states, executing agents, and the people's approvals; the files produced and the judgement
inside the commands, since the agent a command executes produces them. Near-deterministic, not deterministic: an
agent's output varies, but within a step whose inputs and outputs are defined; and the sequence branches where an
approval is rejected, an agent is blocked or a plan is paused. A state machine, then: its steps deterministic, their
content and the choices not. Run as commands, outside any one agent's session, the only point that cannot be
automated is the approvals: execute a step, record its state, a person approves, execute the next. An agent then pays
for its step's own work, not for carrying the sequence; a consumer measuring WingFoil's cost needs the documentation to
say which of the two readings a set-up measures.
