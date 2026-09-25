#!/bin/bash
# The wingfoil arm's setup (REQ-RUN-03, adr-003 decisions 3, 6, 8, 9; REQ-RUN-17). The runner has
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

# 2. The project, with the benchmark's own process template. `init` commits by itself.
wingfoil init --template Kanban > /dev/null

# 3. The scenario's configuration, if any (dl-005): copied over init's files, committed once.
if [ -d "$HOME/scenario" ]; then
  cp -R "$HOME/scenario/." "$WORKSPACE/"
  git add --all
  git commit --quiet --message "chore(wingfoil): apply the scenario configuration"
fi

# 4. The approver member, after the scenario's configuration, which may bring its own dna.yaml; added
#    only if it is not there yet. WingFoil has no verb for it (usage note N33).
node - <<'JS'
const fs = require('node:fs');
const yaml = require(`${process.env.HOME}/wingfoil/node_modules/js-yaml`);
const file = '.wingfoil/dna.yaml';
const dna = yaml.load(fs.readFileSync(file, 'utf8'));
const email = 'approver@benchmark.localhost';
dna.team.members = dna.team.members ?? [];
if (!dna.team.members.some((member) => String(member.email).toLowerCase() === email)) {
  dna.team.members.push({ name: 'Benchmark Approver', email, roles: ['approver'] });
  fs.writeFileSync(file, yaml.dump(dna, { lineWidth: -1 }));
}
JS
if ! git diff --quiet -- .wingfoil/dna.yaml; then
  git add .wingfoil/dna.yaml
  git commit --quiet --message "chore(wingfoil): declare the Benchmark Approver"
fi
echo "setup done: $(git log --format=%s | head -n 3 | tr '\n' '|')"
