#!/usr/bin/env bash
# P6: `wingfoil mcp` over stdio with no terminal: initialize, then list tools, prompts, resources.
source "$(dirname "$0")/lib.sh"; source "$SPIKE_DIR/incontainer.sh"
start_wf_container p6; trap stop_wf_container EXIT
seed_workspace >/dev/null
in_c 'git config user.name "Benchmark Approver" && git config user.email approver@benchmark.localhost && wingfoil init --template Kanban >/dev/null' </dev/null
REQ='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"prompts/list"}
{"jsonrpc":"2.0","id":4,"method":"resources/list"}
{"jsonrpc":"2.0","id":5,"method":"resources/templates/list"}'
t0=$(now)
printf '%s\n' "$REQ" | in_c 'timeout 15 wingfoil mcp; echo "exit=$?" >&2' > "$OUT/p6/responses.jsonl" 2> "$OUT/p6/stderr.txt"
echo "time=$(elapsed "$t0" "$(now)")s; stderr: $(tr '\n' ' ' < "$OUT/p6/stderr.txt")"
node -e '
const lines=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").map(JSON.parse);
for (const r of lines) {
  const res=r.result??{}; const e=r.error?` ERROR ${JSON.stringify(r.error)}`:"";
  if (r.id===1) console.log(`initialize: server=${JSON.stringify(res.serverInfo)} capabilities=${Object.keys(res.capabilities??{}).join(",")}${e}`);
  if (r.id===2) console.log(`tools (${(res.tools??[]).length}): ${(res.tools??[]).map(t=>t.name+(t.annotations?.readOnlyHint?"[ro]":"")).join(", ")}${e}`);
  if (r.id===3) console.log(`prompts (${(res.prompts??[]).length}): ${(res.prompts??[]).map(p=>p.name).join(", ")}${e}`);
  if (r.id===4) console.log(`resources (${(res.resources??[]).length}): ${(res.resources??[]).slice(0,8).map(p=>p.uri).join(", ")}${e}`);
  if (r.id===5) console.log(`resource templates (${(res.resourceTemplates??[]).length}): ${(res.resourceTemplates??[]).map(p=>p.uriTemplate).join(", ")}${e}`);
}' "$OUT/p6/responses.jsonl"
cat > "$OUT/p6/mcp-config.json" <<'JSON'
{ "mcpServers": { "wingfoil": { "type": "stdio", "command": "wingfoil", "args": ["mcp"] } } }
JSON
echo "--- clone after P1-P6"; clone_state | tee "$OUT/p6-clone-after.txt"
