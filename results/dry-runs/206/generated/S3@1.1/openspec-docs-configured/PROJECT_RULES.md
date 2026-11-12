# Project rules

The rules this project follows. Every change follows them.

## Rules

lakeside-desk is the booking desk software of the Lakeside Windsurf School: it teaches windsurfing on the
lake from April to October, and rents boards and sails to students and to visitors who bring their own
experience. Keep that domain in mind: the season runs April to October, and customers are students or
experienced visitors.
Stack: TypeScript (strict, ES2022, NodeNext modules, ESM via "type": "module"), source in src/,
compiled output in dist/. There is no runtime dependency: do not add any; use only the language and the
Node standard library. Tests run with the Node built-in runner (`npm test`, i.e. `node --test`).
Specs, designs and tasks must be consistent with these constraints, and every task that changes behavior
must include a test and finish with `npm test` passing.
Each session starts fresh: anything that must persist has to be written in the repository
(specs under openspec/specs/, changes under openspec/changes/). Read README.md before proposing.
Keep changes minimal and in the style of the existing code; do not touch unrelated files.

## Rules per artifact

### proposal

- State what is in scope and what is out of scope
- Name the booking-desk behavior affected (lessons, rentals, customers) in domain terms
- State that no runtime dependency is introduced

### specs

- Write requirements with SHALL/MUST and at least one WHEN/THEN scenario each
- Cover edge cases such as the April to October season boundaries when dates are involved

### design

- Stay within TypeScript strict mode and the Node standard library, with no runtime dependency

### tasks

- Include a test task for each behavior change, using node:test, runnable with `npm test`
- Keep tasks small enough to verify individually

## Operations

### apply

- Run `npm test` before marking tasks complete and report the real result
- Do not modify the README or package files unless the change explicitly requires it

### archive

- Sync delta specs into openspec/specs/ when archiving
- Summarize the archive outcome before finishing
