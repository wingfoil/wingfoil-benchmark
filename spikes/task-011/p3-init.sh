#!/usr/bin/env bash
# P3: `wingfoil init` with no terminal, in a workspace made the way the runner makes it.
# Templates at 3df305e (src/storage/templates.ts): Scrum (default), Kanban; `init --help` lists neither.
source "$(dirname "$0")/lib.sh"; source "$SPIKE_DIR/incontainer.sh"
start_wf_container p3; trap stop_wf_container EXIT
seed_workspace
echo "--- init without --template, stdin closed"; in_c 'wingfoil init; echo "exit=$?"' </dev/null
for t in Kanban Scrum; do
  echo "=== template $t, identity from the runner's env only (no user.email in git config)"
  in_c "git reset -q --hard \$(git rev-list --max-parents=0 HEAD) && git clean -qfdx
        wingfoil init --template $t; echo \"exit=\$?\"
        echo '--- log'; git log --format='%h %an <%ae> %s'
        echo '--- status'; git status --porcelain
        echo '--- files'; git ls-files | grep -v '^README.md$' | sed 's#/[^/]*\$#/#' | sort | uniq -c" </dev/null
done
echo "=== Kanban, identity also in the repository's git config"
in_c 'git reset -q --hard $(git rev-list --max-parents=0 HEAD) && git clean -qfdx
      git config user.name "WingFoil Benchmark" && git config user.email benchmark@localhost
      wingfoil init --template Kanban; echo "exit=$?"; git log --format="%h %an <%ae> %s"; git status --porcelain | head' </dev/null
