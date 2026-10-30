#!/bin/bash
# The wingfoil arm's verdict hook (REQ-FMT-05 as amended in 1.44, task-118, dl-029 option (b1)): carries a scenario's
# scripted verdict out through WingFoil's own approval verb, under the scenario's approver. The runner runs it in the
# container at a step's first approval request as
#   bash verdict.sh <approve|reject> <approver name> <approver e-mail> <reason>
# The approver's identity is set for WingFoil's command only (GIT_AUTHOR_* and GIT_COMMITTER_*, which WingFoil reads
# before git's configuration), never in the agent's environment. The target is the one element awaiting a verdict: in
# `in-review` or `pending`; none, or more than one, is reported and nothing is guessed. Prints one JSON line.
set -uo pipefail
WORKSPACE="${WORKSPACE:-/workspace}"
export PATH="$HOME/.local/bin:$PATH"
cd "$WORKSPACE" || exit 2
verdict="$1" name="$2" email="$3" reason="$4"

answer() { printf '{"outcome":"%s"%s}\n' "$1" "${2:+,\"target\":\"$2\"}"; }

waiting=""
for status in in-review pending; do
  found="$(wingfoil --format json memory search --status "$status" 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{for(const m of JSON.parse(s).matches)console.log(m.id)}catch{}})')"
  [ -n "$found" ] && waiting="${waiting}${found}"$'\n'
done
targets="$(printf '%s' "$waiting" | sed '/^$/d' | sort -u)"
count="$(printf '%s\n' "$targets" | grep -c .)"
if [ "$count" -eq 0 ]; then answer no-target; exit 0; fi
if [ "$count" -gt 1 ]; then answer ambiguous; exit 0; fi

case "$verdict" in
  approve) verb=approve ;;
  reject) verb=reject ;;
  *) answer "unknown-verdict"; exit 0 ;;
esac
if GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
  wingfoil memory "$verb" "$targets" --reason "$reason" > /dev/null 2>&1; then
  answer done "$targets"
else
  answer refused "$targets"
fi
