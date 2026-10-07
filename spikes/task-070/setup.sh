#!/usr/bin/env bash
# DRAFT for task-071 (the openspec arm), from task-070's spike: OpenSpec 1.14.0 installed from its artifact and
# initialized as its documentation says for Claude Code. The artifact is the installed tree (`installed.tgz`: the npm
# tarball, checked against the registry's integrity, installed with its dependencies into a prefix), copied by the
# runner to ~/harness.tgz as WingFoil's is; HOME and WORKSPACE are the runner's (the project rules' snapshot runs this
# with HOME=/build, WORKSPACE=/build/workspace). An npm cache alone does not install offline (task-070 B2).
set -euo pipefail
WORKSPACE="${WORKSPACE:-/workspace}"
mkdir -p "$HOME/.local/bin" && tar -xzf "$HOME/harness.tgz" -C "$HOME/.local"
# On the agent's PATH too, not only this shell's: the image's PATH holds $HOME/.local/bin (docker/run-image), and the
# skills call `openspec` directly (task-070's review).
ln -sf "$HOME/.local/openspec/bin/openspec" "$HOME/.local/bin/openspec"
export PATH="$HOME/.local/bin:$PATH"
cd "$WORKSPACE"
# Telemetry off (REQ-FMT-05): OPENSPEC_TELEMETRY=0 is the arm's telemetry_off, which the runner sets for a run. The
# project rules' snapshot runs this setup in a one-off container that carries no environment, so the setup sets it
# itself too. It also silences the version check against the npm registry (dist/telemetry/opt-out.js).
export OPENSPEC_TELEMETRY="${OPENSPEC_TELEMETRY:-0}"
# REQ-RUN-18's flags, verified on 1.14.0: six skills and six /opsx:* commands under .claude/, openspec/config.yaml.
openspec init --tools claude --profile core --force
# The scenario's rules (REQ-FMT-14) go into openspec/config.yaml's `context:` (and per-artifact `rules:`), which init
# writes commented out: task-071's rules generator writes them there after this setup, as Spec Kit's writes the
# constitution. The file also has a commented `operations:` (apply and archive guidance), and its header asks to keep
# general project documentation out: both matter to task-071's renderer and task-072's docs control.
