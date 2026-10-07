#!/usr/bin/env bash
# DRAFT for task-071 (the openspec arm), from task-070's spike: OpenSpec 1.14.0 installed from its artifact and
# initialized as its documentation says for Claude Code. The artifact is the installed tree (`installed.tgz`: the npm
# tarball, checked against the registry's integrity, installed with its dependencies into a prefix), copied by the
# runner to ~/harness.tgz as WingFoil's is; HOME and WORKSPACE are the runner's (the project rules' snapshot runs this
# with HOME=/build, WORKSPACE=/build/workspace). An npm cache alone does not install offline (task-070 B2).
set -euo pipefail
WORKSPACE="${WORKSPACE:-/workspace}"
mkdir -p "$HOME/.local" && tar -xzf "$HOME/harness.tgz" -C "$HOME/.local"
export PATH="$HOME/.local/openspec/bin:$PATH"
cd "$WORKSPACE"
# Telemetry off (REQ-FMT-05): OPENSPEC_TELEMETRY=0 is the arm's telemetry_off, set in the container by the runner; it
# also silences OpenSpec's version check against the npm registry (dist/telemetry/opt-out.js: both outbound surfaces).
# REQ-RUN-18's flags, verified on 1.14.0: six skills and six /opsx:* commands under .claude/, openspec/config.yaml.
openspec init --tools claude --profile core --force
# The scenario's rules (REQ-FMT-14) go into openspec/config.yaml's `context:` (and per-artifact `rules:`), which init
# writes commented out: task-071's rules generator writes them there after this setup, as Spec Kit's writes the
# constitution.
