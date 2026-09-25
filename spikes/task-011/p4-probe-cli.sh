#!/usr/bin/env bash
# P4, first look: the CLI surface of the WingFoil under test and the files init wrote.
source "$(dirname "$0")/lib.sh"; source "$SPIKE_DIR/incontainer.sh"
start_wf_container p4; trap stop_wf_container EXIT
seed_workspace >/dev/null
in_c 'git config user.name "WingFoil Benchmark" && git config user.email benchmark@localhost && wingfoil init --template Kanban >/dev/null
  wingfoil --help | sed -n "/Commands/,\$p"; for n in dna directive memory; do echo "--- $n"; wingfoil $n --help | sed -n "/Commands/,\$p"; done
  echo "--- dna.yaml"; cat .wingfoil/dna.yaml; echo "--- roles.yaml"; head -40 .wingfoil/roles.yaml
  echo "--- memory.yaml paths"; grep -n "path:" .wingfoil/memory.yaml' </dev/null
