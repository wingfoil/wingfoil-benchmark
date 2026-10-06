#!/usr/bin/env bash
# DRAFT for task-066 (the speckit arm), from task-065's spike: Spec Kit installed from its wheel bundle and
# initialized as its documentation says for Claude Code. The runner copies the harness artifact (the bundle, packed as
# a .tgz, REQ-FMT-12) to /home/node/harness.tgz, as it does for WingFoil.
set -euo pipefail
BUNDLE=/home/node/speckit-bundle
mkdir -p "$BUNDLE" && tar -xzf /home/node/harness.tgz -C "$BUNDLE"
# Offline, from the bundle only: the wheel of the pinned tag and its dependencies, resolved when the bundle was built.
uv tool install --offline --no-index --find-links "$BUNDLE" specify-cli
# `--integration claude` is required: without it a non-interactive init defaults to Copilot (docs/reference/core.md).
specify init --here --force --integration claude --script sh --ignore-agent-tools
# Telemetry: Spec Kit v1.1.0 has none (no telemetry or analytics code; init and install ran with --network none).
