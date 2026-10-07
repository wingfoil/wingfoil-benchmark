#!/usr/bin/env bash
# The openspec arm's setup (REQ-RUN-18, task-071, from task-070's spike): OpenSpec 1.14.0 installed from its artifact and
# initialized as its documentation says for Claude Code. The artifact is the installed tree (`installed.tgz`: the npm
# registry's tarball installed with its dependencies into a prefix), which the runner copies to ~/harness.tgz; HOME and
# WORKSPACE are the runner's (the project rules' snapshot runs this with HOME=/build, WORKSPACE=/build/workspace).
set -euo pipefail
WORKSPACE="${WORKSPACE:-/workspace}"
mkdir -p "$HOME/.local/bin" && tar -xzf "$HOME/harness.tgz" -C "$HOME/.local"
# On the agent's PATH too, not only this shell's: the image's PATH holds $HOME/.local/bin (docker/run-image), and its
# skills call `openspec` directly.
ln -sf "$HOME/.local/openspec/bin/openspec" "$HOME/.local/bin/openspec"
export PATH="$HOME/.local/bin:$PATH"
cd "$WORKSPACE"
# Telemetry off (REQ-FMT-05): the arm's telemetry_off sets it for a run; the project rules' snapshot runs this setup in
# a one-off container that carries no environment, so the setup sets it itself too.
export OPENSPEC_TELEMETRY="${OPENSPEC_TELEMETRY:-0}"
# REQ-RUN-18's flags, verified on 1.14.0: six skills and six /opsx:* commands under .claude/, openspec/config.yaml. The
# scenario's rules are written into that file's context by the runner after this setup (REQ-FMT-14).
openspec init --tools claude --profile core --force
