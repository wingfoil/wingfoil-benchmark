#!/bin/bash
# The wingfoil arm's setup, step A (REQ-RUN-03, adr-003 decisions 3, 6, 8, 9; REQ-RUN-17; dl-021 step A, task-114):
# WingFoil set up as its documentation sets it up, then one workflow instance opened. The runner has
# already written the git identity (Benchmark Approver), copied this directory to ~/arm, the WingFoil
# under test to ~/harness.tgz and, if the scenario has one, its configuration to ~/scenario.
set -euo pipefail
# WORKSPACE and HOME are set otherwise only when the runner snapshots this configuration for the
# baseline-docs generator (task-015), in a one-off container with a build directory as its home.
WORKSPACE="${WORKSPACE:-/workspace}"
export PATH="$HOME/.local/bin:$PATH"
cd "$WORKSPACE"

# 1. The WingFoil under test, outside the workspace, called `wingfoil` (never `npx wingfoil`).
mkdir -p "$HOME/.local/bin"
tar -xzf "$HOME/harness.tgz" -C "$HOME"
printf '#!/bin/sh\nexec node %s/wingfoil/dist/cli.js "$@"\n' "$HOME" > "$HOME/.local/bin/wingfoil"
chmod +x "$HOME/.local/bin/wingfoil"
echo "WingFoil under test: commit $(cat "$HOME/wingfoil/.wingfoil-commit"), at $(command -v wingfoil)"

# 2. The project, as WingFoil's documentation sets it up: `init`'s Kanban scaffold, no workflow of the benchmark's own
#    (experiment design 1.5). `init` commits by itself.
wingfoil init --template Kanban > /dev/null

# 3. The scenario's configuration, if any (dl-005): copied over init's files, committed once.
if [ -d "$HOME/scenario" ]; then
  cp -R "$HOME/scenario/." "$WORKSPACE/"
  git add --all
  git commit --quiet --message "chore(wingfoil): apply the scenario configuration"
fi

# 4. The approver member, after the scenario's configuration, which may bring its own dna.yaml; added
#    only if no member has its e-mail yet. `dna add` commits by itself (since WingFoil v0.2.2; usage note N33
#    asked for this verb), and WingFoil reads approval authority from the committed dna.yaml (v0.2.2 and
#    v0.3.0, which decides every transition from HEAD). The team is
#    read whole first, as JSON: `grep -q` closing a pipe early would fail it under pipefail. A scenario's
#    dna.yaml naming another member "Benchmark Approver", or with no `approver` role, makes `dna add`
#    refuse, and the setup fail.
team="$(wingfoil --format json dna show team)"
if ! grep -qi '"approver@benchmark\.localhost"' <<< "$team"; then
  wingfoil dna add team.members --value "Benchmark Approver" --entry-email approver@benchmark.localhost \
    --entry-roles approver > /dev/null
fi

# 5. One workflow instance, opened by the setup (dl-021 step A): the scenario starts from a project already past its
#    inception and specification, so those two steps are recorded complete here, and the instance waits at its
#    delivery. The agent opens a new instance for a later request (the manual's rule; task-107's option A: on 0.3.1's
#    Kanban scaffold an instance's delivery runs once, then reaches its sunset).
wingfoil workflow start sw-life-cycle > /dev/null
wingfoil workflow finalize > /dev/null
wingfoil workflow finalize > /dev/null
echo "setup done: $(git log --format=%s | head -n 3 | tr '\n' '|')"
