---
id: F-025
title: "The MCP server answers tools/list with \"Method not found\""
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N31.

## Observed

`wingfoil mcp`, after `initialize`, declares the capabilities `resources` and `prompts` only, and answers
`tools/list` with `{"error":{"code":-32601,"message":"Method not found"}}` (Re-run on 2026-10-10, `0.2-pre-3df305e` and
`0.2.2`). The server has no Tools by design, but a client that probes them gets a protocol error rather than an
empty list; registering the `tools` capability with no Tools would return one.

## Expected

`tools/list` returns an empty list while there are no Tools, and each build publishes which CLI verbs and MCP
capabilities it offers. WingFoil bug-151 (closed) and task-174 (done) make `tools/list` answer an empty list in
a later build.
