---
id: F-034
title: "The packed tarball installs with no executable bin and no lockfile"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N44.

## Observed

The `npm pack` tarball holds `package/dist/cli.js` with mode 644 (`tar -tvzf` on the `3df305e` tarball and on
`wingfoil-0.2.2.tgz`, Re-run on 2026-10-10), so a tarball unpacked without npm has no executable and no `wingfoil` bin shim; a
wrapper script is needed. The tarball also has no lockfile: a plain `npm install` of it resolved 17 of 111
dependencies to other versions than the build's (first noted beside N34, the positive observation that the build
itself is reproducible).

## Expected

The packed CLI is executable, and the docs say how to install a tarball faithfully to the build's lockfile
(or the package ships one, for example `npm-shrinkwrap.json`).
