#!/usr/bin/env bash
# The speckit arm's setup (REQ-RUN-18), from task-065's spike: Spec Kit installed from its wheel bundle and
# initialized as its documentation says for Claude Code. The runner copies the harness artifact (the bundle, packed as
# a .tgz with the wheels flat at its root, REQ-FMT-12) to ~/harness.tgz, as it does for WingFoil; HOME and WORKSPACE
# are the runner's (the project rules' snapshot runs this with HOME=/build, WORKSPACE=/build/workspace).
set -euo pipefail
WORKSPACE="${WORKSPACE:-/workspace}"
export PATH="$HOME/.local/bin:$PATH"
cd "$WORKSPACE"
BUNDLE="$HOME/speckit-bundle"
mkdir -p "$BUNDLE" && tar -xzf "$HOME/harness.tgz" -C "$BUNDLE"
# Offline, from the bundle only: the wheel of the pinned tag and its dependencies, resolved when the bundle was built
# (for the run image's Python 3.11 on amd64: pyyaml's wheel is platform-specific).
uv tool install --offline --no-index --find-links "$BUNDLE" specify-cli
# `--integration claude` is required: without it a non-interactive init defaults to Copilot (docs/reference/core.md).
specify init --here --force --integration claude --script sh --ignore-agent-tools
# Telemetry: Spec Kit v1.1.0 has none (no telemetry or analytics code; install and init ran with --network none).
