---
id: project-conventions
name: project-conventions
type: directive
kind: custom
title: "Project conventions"
format: 1
---

# Project conventions

- Language: TypeScript with `strict` enabled; ES modules under NodeNext resolution, so relative imports carry the `.js` extension. Library code lives in `src/`; keep declarations (`declaration: true`) accurate.
- Tests run with `npm test` (`node --test`); run it before finishing and report the real result. Keep tests in `test/`, deterministic and dependency-free.
- Do not commit `node_modules/` or `dist/` (both are git-ignored).
- Keep `README.md` in step with the public behaviour of the library when behaviour changes.
- Never edit `package.json` dependency fields to add a runtime dependency.
