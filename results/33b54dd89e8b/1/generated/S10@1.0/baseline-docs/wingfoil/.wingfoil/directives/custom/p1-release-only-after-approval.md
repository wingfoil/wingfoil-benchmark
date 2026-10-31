---
id: p1-release-only-after-approval
name: p1-release-only-after-approval
type: directive
kind: custom
title: "A change is released only after the approver has approved it"
---

# A change is released only after the approver has approved it

A release is raising `version` in `package.json` with an entry in `CHANGELOG.md`. A change is released only after
the approver has approved it: the developer submits each change for approval and waits for the approver's verdict
before releasing it.
