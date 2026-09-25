#!/usr/bin/env bash
# P7 (spends): with a real agent, is the workspace's CLAUDE.md loaded under --setting-sources project,
# does the WingFoil MCP server appear in the init event, and are --mcp-config / --strict-mcp-config
# accepted on --resume? Haiku 4.5; ceiling 0.50 USD (task-011 Design).
source "$(dirname "$0")/lib.sh"; source "$SPIKE_DIR/incontainer.sh"
: "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"
TOKEN_FILE="${BENCH_SPIKE_TOKEN_FILE:-$HOME/.claude/bench-token}"
AGENT_VERSION="2.1.280"; MODEL="claude-haiku-4-5"; CEILING_USD="0.50"; CODEWORD="PELICAN-7342"
docker build -q -t "$IMAGE_AGENT" --build-arg AGENT_NAME=claude-code --build-arg AGENT_VERSION="$AGENT_VERSION" "$REPO_DIR/docker/run-image" >/dev/null
IMAGE="$IMAGE_AGENT" start_wf_container p7; trap stop_wf_container EXIT
seed_workspace >/dev/null
in_c "git config user.name 'Benchmark Approver' && git config user.email approver@benchmark.localhost && wingfoil init --template Kanban >/dev/null
  printf '# Project instructions\n\nWhen you reply, begin your reply with the codeword $CODEWORD.\n' > CLAUDE.md
  printf '{ \"mcpServers\": { \"wingfoil\": { \"type\": \"stdio\", \"command\": \"/home/node/.local/bin/wingfoil\", \"args\": [\"mcp\"] } } }\n' > /home/node/mcp.json
  git add -A && git commit -qm 'arm environment' && claude --version" </dev/null
spent() { { cat "$OUT"/p7/*.jsonl 2>/dev/null || true; } | node -e 'let s=0;for(const l of require("fs").readFileSync(0,"utf8").split("\n")){try{const e=JSON.parse(l);if(e.type==="result")s+=e.total_cost_usd??0}catch{}}process.stdout.write(s.toFixed(4))'; }
check() { local s; s=$(spent); echo "spent so far: $s USD of $CEILING_USD"; node -e "process.exit(Number('$s')>=Number('$CEILING_USD')?1:0)" || { echo "ceiling reached; stopping"; exit 2; }; }
agent() { # $1 = label; the rest = claude arguments. The token travels by name, never in argv.
  local label="$1"; shift
  ANTHROPIC_AUTH_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")" docker exec -i -e ANTHROPIC_AUTH_TOKEN \
    -e PATH=/home/node/.local/bin:/usr/local/bin:/usr/bin:/bin "$C" timeout 180 claude "$@" < /dev/null > "$OUT/p7/$label.jsonl" 2> "$OUT/p7/$label.stderr"
  echo "$label: exit=$?"
}
report() { node -e '
  const ev=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}});
  const init=ev.find(e=>e.type==="system"&&e.subtype==="init"); const res=ev.find(e=>e.type==="result");
  if(init){console.log("  model:",init.model,"| mcp_servers:",JSON.stringify(init.mcp_servers));
    console.log("  mcp tools:",(init.tools??[]).filter(t=>/mcp/i.test(t)).join(", ")||"(none)");
    console.log("  slash commands from wingfoil:",(init.slash_commands??[]).filter(s=>/wingfoil/i.test(s)).join(", ")||"(none)");
    console.log("  memory/CLAUDE.md fields:",Object.keys(init).filter(k=>/memory|claude|setting/i.test(k)).join(",")||"(none)");}
  else console.log("  no init event");
  if(res) console.log("  result:",res.subtype,"| cost",res.total_cost_usd,"| codeword",String(res.result).includes(process.argv[2])?"PRESENT":"absent","|",JSON.stringify(String(res.result).slice(0,300)));
  else console.log("  no result event");' "$OUT/p7/$1.jsonl" "$CODEWORD"; }
SID=$(cat /proc/sys/kernel/random/uuid)
MCP=(--mcp-config /home/node/mcp.json --strict-mcp-config)
check; agent p7a -p "Reply in two short lines: first line as your project instructions require; second line, the names of the MCP servers you can use." \
  --output-format stream-json --verbose --model "$MODEL" --session-id "$SID" --permission-mode bypassPermissions \
  --setting-sources project --max-budget-usd 0.20 "${MCP[@]}"; report p7a
check; agent p7b --resume "$SID" -p "Read the wingfoil://dna MCP resource and reply with the value of project.methodology only." \
  --output-format stream-json --verbose --permission-mode bypassPermissions "${MCP[@]}"; report p7b
if ! grep -q '"type":"result"' "$OUT/p7/p7b.jsonl"; then
  echo "p7b stderr: $(head -c 400 "$OUT/p7/p7b.stderr")"
  check; agent p7c --resume "$SID" -p "Read the wingfoil://dna MCP resource and reply with the value of project.methodology only." \
    --output-format stream-json --verbose --permission-mode bypassPermissions; report p7c
fi
echo "total spent: $(spent) USD"
