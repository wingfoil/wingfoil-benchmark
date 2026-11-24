#!/usr/bin/env bash
# Install the runner's schedule as systemd user units, one timer per line of config/runner.yaml,
# every schedule_minutes, DISABLED (docs/bootstrap.md § 7): nothing runs until the approver
# enables a line's timer:
#   systemctl --user enable --now <project>-runner@<line>.timer     # turn a line on
#   systemctl --user disable --now <project>-runner@<line>.timer    # turn it off
#   journalctl --user -u <project>-runner@<line>.service            # its output
# Usage: scripts/runner/install-schedule.sh   (re-run after moving the repository or Node; it
# rewrites the units and leaves every timer's enabled state as it was)
set -euo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"
node="$(command -v node)"
project="$(cd "$repo" && "$node" -p "require('./package.json').name")"
minutes="$(sed -n 's/^schedule_minutes: *\([0-9][0-9]*\).*/\1/p' "$repo/config/runner.yaml")"
lines="$(cd "$repo" && "$node" -e "const y=require('js-yaml');console.log(Object.keys(y.load(require('fs').readFileSync('config/runner.yaml','utf8')).lines).join(' '))")"
units="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
# The PATH the timer runs with: the user's own bins first, so the agents' CLIs are the ones the
# adapters were verified with (the shell's own `command -v claude codex`), then Node's.
path="$HOME/.local/bin:$HOME/.npm-global/bin:$(dirname "$node"):/usr/local/bin:/usr/bin:/bin"
mkdir -p "$units"
for kind in service timer; do
  sed -e "s|@REPO@|$repo|g" -e "s|@NODE@|$node|g" -e "s|@PATH@|$path|g" -e "s|@PROJECT@|$project|g" -e "s|@MINUTES@|${minutes:-10}|g" \
    "$repo/scripts/runner/systemd/runner@.$kind" > "$units/$project-runner@.$kind"
done
systemctl --user daemon-reload
for cli in claude codex; do
  echo "$cli for the timer: $(PATH="$path" command -v "$cli" || echo missing) ($(PATH="$path" "$cli" --version 2>/dev/null | head -1))"
done
# Codex's sandbox, checked where the timer runs (a user service, which inherits no desktop app's
# AppArmor profile): on Ubuntu 23.10 and later it needs a profile installed once (docs/setup.md).
if sandbox="$(systemd-run --user --quiet --pipe --wait -E PATH="$path" -E HOME="$HOME" bash "$repo/scripts/setup/codex-apparmor.sh" --check 2>&1)"; then
  echo "$sandbox (for the timer)"
else
  echo "WARNING: $sandbox"
  echo "WARNING: until then the runner launches no Codex step from the timer and opens a notice instead."
fi
for line in $lines; do
  echo "$project-runner@$line.timer: $(systemctl --user is-enabled "$project-runner@$line.timer" 2>/dev/null || echo disabled)"
done
echo "Installed in $units. Enable a line with: systemctl --user enable --now $project-runner@<line>.timer"
