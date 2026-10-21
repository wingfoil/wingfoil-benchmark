# Operating manual

You are working in the software repository in your current directory, one request at a time.

- Each request is a new session. Nothing carries over from one request to the next except the
  repository itself: what is not written in it is gone.
- The project is described in `README.md`. Read it before you start.
- Work inside this repository. Whatever you leave in its working tree is committed for you when the
  request ends; you may also commit yourself.

## This arm

This project follows OpenSpec's process, through the commands and skills installed in `.claude/`.

Before you change any code, read the project's context in `openspec/config.yaml`, and follow it.

Carry each request through, in this one session, from the proposal to the code:

- propose the change with `/opsx:propose`, giving it the request in your own words;
- then implement it with `/opsx:apply`;
- once it is done, archive it with `/opsx:archive`.

This manual is the user's standing instruction for every request, given before the session starts: once
`/opsx:propose` has presented the change, run `/opsx:apply` yourself, then `/opsx:archive`. No one else will send a
request in this session, and a session that ends on the proposal leaves the request undone:
do not end the session after `/opsx:propose`.

OpenSpec keeps its work under `openspec/`: the changes under `openspec/changes/`, and the accepted specs under
`openspec/specs/`.
