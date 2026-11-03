---
id: r1-no-new-dependency
name: r1-no-new-dependency
type: directive
kind: custom
title: "No new runtime dependency"
---

# No new runtime dependency

Do not add a package to `dependencies` in `package.json`: the project's runtime dependencies are the
ones it already has. Development tools may go in `devDependencies`.
