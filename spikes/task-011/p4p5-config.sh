#!/usr/bin/env bash
# P4: a small scenario configuration applied two ways — by commands (A), and by copying the files A
# produced (B) — and read back by WingFoil in both.
# P5: the Benchmark Approver member, the git identity, an approve, and a refused approve.
source "$(dirname "$0")/lib.sh"; source "$SPIKE_DIR/incontainer.sh"
APPROVER='git config user.name "Benchmark Approver" && git config user.email approver@benchmark.localhost'
# dna set writes string leaves only, so the member is written into dna.yaml and committed by hand.
MEMBER='node -e "const f=\".wingfoil/dna.yaml\",fs=require(\"fs\");fs.writeFileSync(f,fs.readFileSync(f,\"utf8\").replace(\"  members: []\",\"  members:\n    - name: Benchmark Approver\n      email: approver@benchmark.localhost\n      roles: [approver]\"))" && git commit -qam "chore(wingfoil): declare the Benchmark Approver"'
readback() {
  in_c 'echo "- dna show project:"; wingfoil dna show project
        echo "- directives list:"; wingfoil directives list 2>&1 | head -30
        echo "- memory search decision-log:"; wingfoil memory search --type decision-log
        for id in $(ls docs/memory/decision-log 2>/dev/null | sed "s/\.md$//"); do echo "- history $id:"; wingfoil memory history $id; done' </dev/null
}
echo "================ A: by commands"
start_wf_container p4a; A_WS="$WS"
seed_workspace >/dev/null
in_c "$APPROVER && wingfoil init --template Kanban >/dev/null && $MEMBER
  wingfoil dna set project.name Orders; echo \"dna set name exit=\$?\"
  wingfoil dna set project.description 'A small orders domain.'; echo \"dna set description exit=\$?\"
  wingfoil directive create --name no-throw; echo \"directive create exit=\$?\"
  wingfoil directive assign --directive no-throw --role developer; echo \"directive assign exit=\$?\"
  wingfoil memory add --type decision-log --title 'Errors are returned as a Result'; echo \"memory add exit=\$?\"
  ID=\$(ls docs/memory/decision-log | sed 's/\.md\$//')
  wingfoil memory submit \$ID; echo \"submit exit=\$?\"
  wingfoil memory approve \$ID --reason 'Scenario rule.'; echo \"approve exit=\$?\"
  echo '--- P5: approve refused under another email'
  wingfoil memory add --type decision-log --title 'Second rule' >/dev/null
  ID2=\$(ls docs/memory/decision-log | grep second | sed 's/\.md\$//'); wingfoil memory submit \$ID2 >/dev/null
  git config user.email benchmark@localhost; wingfoil memory approve \$ID2 --reason 'x'; echo \"approve as benchmark@localhost exit=\$?\"
  echo '--- P5: approve with the identity from the environment only'
  git config --unset user.email; git config --unset user.name
  GIT_CONFIG_GLOBAL=/dev/null wingfoil memory approve \$ID2 --reason 'x'; echo \"approve env-only exit=\$?\"
  git config user.name 'Benchmark Approver'; git config user.email APPROVER@benchmark.localhost
  wingfoil memory approve \$ID2 --reason 'Case-insensitive email.'; echo \"approve upper-case email exit=\$?\"
  echo '--- log'; git log --format='%h %an <%ae> %s%n%b' | grep -v '^\$'" </dev/null
readback > "$OUT/p4a/readback.txt"; cat "$OUT/p4a/readback.txt"
in_c 'git archive HEAD .wingfoil docs' > "$OUT/p4a/config.tar" </dev/null
stop_wf_container
echo "================ B: the same files copied in"
start_wf_container p4b; trap stop_wf_container EXIT
seed_workspace >/dev/null
docker cp "$OUT/p4a/config.tar" "$C:/tmp/config.tar"
in_c "$APPROVER && tar -xf /tmp/config.tar && git add -A && git commit -qm 'chore(wingfoil): apply the scenario configuration'
  echo '--- log'; git log --format='%h %an %s'" </dev/null
readback > "$OUT/p4b/readback.txt"
echo "--- readback A vs B (diff; empty means identical)"
diff "$OUT/p4a/readback.txt" "$OUT/p4b/readback.txt" && echo "(identical)"
