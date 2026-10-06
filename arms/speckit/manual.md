# Operating manual

You are working in the software repository in your current directory, one request at a time.

- Each request is a new session. Nothing carries over from one request to the next except the
  repository itself: what is not written in it is gone.
- The project is described in `README.md`. Read it before you start.
- Work inside this repository. Whatever you leave in its working tree is committed for you when the
  request ends; you may also commit yourself.

## This arm

This project follows GitHub Spec Kit's process, through the skills installed in `.claude/skills/`.

Before you change any code, read the project's rules in `.specify/memory/constitution.md`, and follow
them.

For each request:

- describe the change with `/speckit-specify`, giving it the request in your own words; if the
  request leaves a question open, settle it with `/speckit-clarify`;
- then plan it with `/speckit-plan`, break it into tasks with `/speckit-tasks`, and carry them out
  with `/speckit-implement`.

Spec Kit keeps its work under `specs/`. Never run `specify workflow`: the process is followed through
the skills, one request at a time.
