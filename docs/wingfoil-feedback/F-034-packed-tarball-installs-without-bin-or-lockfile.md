---
id: F-034
title: "The packed tarball installs with no executable bin and no lockfile"
kind: defect
status: needs-info
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

Answer for WingFoil's v0.3 retrospective (2026-11-05, wingfoil@0.3.1): `npm i wingfoil@0.3.1` in an empty directory
installs `node_modules/.bin/wingfoil -> ../wingfoil/dist/cli.js`, executable after the install, and `--version` prints
`0.3.1 (870bd4406f3b9bba5ecde7a5f8198b80c2a98583)`. The packed tarball (`npm pack wingfoil@0.3.1`) still holds
`package/dist/cli.js` as `-rw-r--r--` and still has no lockfile or `npm-shrinkwrap.json`: its four direct dependencies
are `^` ranges, and the install resolved 99 packages from the registry. Through npm the bin works; a tarball unpacked
without npm still has no executable, and no install is pinned to the build's lockfile.

## Expected

The packed CLI is executable, and the docs say how to install a tarball faithfully to the build's lockfile
(or the package ships one, for example `npm-shrinkwrap.json`).
