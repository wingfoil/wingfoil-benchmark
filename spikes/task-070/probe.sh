#!/usr/bin/env bash
# task-070: OpenSpec 1.14.0 in the run container. B1 builds its artifact: the npm tarball, checked against the
# registry, installed with its dependencies into a prefix packed as installed.tgz, as WingFoil's artifact is (an npm
# cache alone does not install offline: its package metadata is missing). B2 installs it and runs `openspec init` with
# no network. R1 is one real Sonnet 5 session on S3 step 1 at --effort high, R2 resumes it once to measure --effort
# under --resume (ceiling 3.00 USD for both, under the 3 EUR consented at task-070's gate, e8edbd0).
# Usage: probe.sh B1 | B2 | R1 | R2 (R1 and R2 need BENCH_SPIKE_CONFIRM=1).
set -euo pipefail
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN="$(git -C "$SPIKE_DIR" worktree list --porcelain | sed -n '1s/^worktree //p')"
OUT="${BENCH_SPIKE_OUT:-$MAIN/spikes/task-070/out}"; mkdir -p "$OUT"
IMAGE="bench-spike-task-070"; PACKAGE="@fission-ai/openspec@1.14.0"
INTEGRITY="sha512-V+zitRK918I6B3EIcYL3gVYoPoPgzknSxE1zL0zUQdbd4NsO5kbrxU5jVceuNNEznD94pbRPCvpCDIa6BeEaPA=="
TOKEN_FILE="${BENCH_AGENT_TOKEN_FILE:-$HOME/.claude/bench-token}"; CEILING_USD="3.00"; MODEL="claude-sonnet-5"

image() {
  docker image inspect "$IMAGE" >/dev/null 2>&1 && return
  docker build -q --build-arg AGENT_NAME=claude-code --build-arg AGENT_VERSION=2.1.280 -t "$IMAGE" \
    "$MAIN/docker/run-image" >/dev/null
}

b1() { # the artifact: the tarball, and the tree it installs with its dependencies, fetched once
  image; rm -rf "$OUT/b1"; mkdir -p "$OUT/b1/bundle"
  docker run --rm -v "$OUT/b1/bundle:/bundle" "$IMAGE" bash -c "
    set -e; cd /bundle
    npm pack --silent '$PACKAGE'
    npm install --global --prefix /home/node/openspec --no-audit --no-fund ./fission-ai-openspec-1.14.0.tgz
    npm ls --global --prefix /home/node/openspec --all > /bundle/tree.txt || true
    tar -czf /bundle/installed.tgz -C /home/node openspec" > "$OUT/b1/log.txt" 2>&1
  local got; got="sha512-$(openssl dgst -sha512 -binary "$OUT/b1/bundle/fission-ai-openspec-1.14.0.tgz" | base64 -w0)"
  [ "$got" = "$INTEGRITY" ] && echo "B1: tarball matches the registry's integrity" || { echo "B1: integrity MISMATCH"; exit 4; }
  (cd "$OUT/b1/bundle" && find . -type f ! -name tree.txt | sort | xargs sha256sum > ../bundle.sha256)
  echo "B1: $(wc -l < "$OUT/b1/bundle.sha256") files in the bundle"; cat "$OUT/b1/bundle/tree.txt"
}

b2() { # install offline and init with no network, in a copy of S3@1.0's seed
  image; rm -rf "$OUT/b2"; mkdir -p "$OUT/b2"; cp -r "$MAIN/scenarios/S3/1.0/seed" "$OUT/b2/ws"
  git -C "$OUT/b2/ws" init -q -b main && git -C "$OUT/b2/ws" add -A && git -C "$OUT/b2/ws" -c user.name=seed -c user.email=seed@x commit -q -m seed
  set +e
  docker run --rm --network none -e OPENSPEC_TELEMETRY=0 -v "$OUT/b1/bundle:/bundle:ro" -v "$OUT/b2/ws:/workspace" \
    -w /workspace "$IMAGE" bash -c '
    set -e
    tar -xzf /bundle/installed.tgz -C /home/node && export PATH=/home/node/openspec/bin:$PATH
    openspec --version
    openspec init --help
    openspec init --tools claude --profile core --force' > "$OUT/b2/log.txt" 2>&1
  echo "B2: exit $?"; set -e
  git -C "$OUT/b2/ws" status --porcelain --untracked-files=all > "$OUT/b2/status.txt"
  echo "B2: $(wc -l < "$OUT/b2/status.txt") paths added or changed"; tail -5 "$OUT/b2/log.txt"
}

spent() { cat "$OUT"/r1/session.jsonl "$OUT"/r2/session.jsonl 2>/dev/null | node -e 'let s=0;for(const l of require("fs").readFileSync(0,"utf8").split("\n")){try{const e=JSON.parse(l);if(e.type==="result")s=Math.max(s,e.total_cost_usd??0)}catch{}}process.stdout.write(s.toFixed(4))'; }

scan() { # the secret scan: no file of the output holds the token
  [ -s "$TOKEN_FILE" ] || { echo "secret scan failed: no token"; exit 3; }
  set +e; HITS="$(grep -rlFf <(tr -d '[:space:]' < "$TOKEN_FILE") -- "$OUT" 2>/dev/null)"; RC=$?; set -e
  [ "$RC" -le 1 ] || { echo "secret scan failed: grep exited $RC"; exit 3; }
  echo "files containing the token: $(printf '%s' "$HITS" | grep -c . || true)"
}

session() { # $1 = stage dir, the rest the claude arguments after -p "<text>"
  local dir="$1"; shift
  ANTHROPIC_AUTH_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")" docker exec -i -e ANTHROPIC_AUTH_TOKEN \
    -e CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 -e OPENSPEC_TELEMETRY=0 -e PATH=/home/node/openspec/bin:/usr/local/bin:/usr/bin:/bin \
    "$C" timeout 1800 "$@" \
    < /dev/null > "$OUT/$dir/session.jsonl" 2> "$OUT/$dir/stderr.txt" || echo "exit $?" > "$OUT/$dir/exit.txt"
}

container() { # a container on R1's workspace, OpenSpec installed offline from the bundle
  C="bench-spike-task-070-r"; docker rm -f "$C" >/dev/null 2>&1 || true
  docker create --name "$C" -e OPENSPEC_TELEMETRY=0 -v "$OUT/b1/bundle:/bundle:ro" -v "$OUT/r1/ws:/workspace" \
    -v "$OUT/home:/home/node/.claude" "$IMAGE" sleep infinity >/dev/null
  docker start "$C" >/dev/null
  docker exec "$C" bash -c 'tar -xzf /bundle/installed.tgz -C /home/node && /home/node/openspec/bin/openspec --version' \
    > "$OUT/$1/install.txt" 2>&1
}

r1() { # one real session on B2's workspace
  : "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"
  node -e "process.exit(Number('$(spent)')>=Number('$CEILING_USD')?1:0)" || { echo "ceiling reached"; exit 2; }
  image; rm -rf "$OUT/r1" "$OUT/home"; mkdir -p "$OUT/r1" "$OUT/home"; cp -r "$OUT/b2/ws" "$OUT/r1/ws"
  local prompt; prompt="$(cat "$MAIN/scenarios/S3/1.0/prompts/01.md")

This project follows OpenSpec's process (its commands and skills are installed under .claude). Use them for this
work: propose the change, apply it, then archive it."
  container r1
  session r1 claude -p "$prompt" --output-format stream-json --verbose --model "$MODEL" --effort high \
    --session-id "$(cat /proc/sys/kernel/random/uuid)" --permission-mode bypassPermissions \
    --setting-sources project --max-budget-usd 2.50
  docker rm -f "$C" >/dev/null
  git -C "$OUT/r1/ws" status --porcelain --untracked-files=all > "$OUT/r1/status.txt"
  echo "R1: spent $(spent) USD"; scan
}

r2() { # the same session resumed once, at --effort high, within what is left of the ceiling
  : "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"
  local left; left="$(node -e "const l=Number('$CEILING_USD')-Number('$(spent)');process.stdout.write(Math.min(0.40,l).toFixed(2))")"
  node -e "process.exit(Number('$left')<=0.05?1:0)" || { echo "R2: not run, nothing left of the ceiling"; exit 2; }
  local id; id="$(node -e 'for(const l of require("fs").readFileSync(process.argv[1],"utf8").split("\n")){try{const e=JSON.parse(l);if(e.session_id){console.log(e.session_id);break}}catch{}}' "$OUT/r1/session.jsonl")"
  image; rm -rf "$OUT/r2"; mkdir -p "$OUT/r2"
  container r2
  session r2 claude --resume "$id" -p "Continue." --output-format stream-json --verbose --effort high \
    --permission-mode bypassPermissions --setting-sources project --max-budget-usd "$left"
  docker rm -f "$C" >/dev/null
  git -C "$OUT/r1/ws" status --porcelain --untracked-files=all > "$OUT/r2/status.txt"
  echo "R2: session total $(spent) USD (budget given $left)"; scan
}

case "${1:-}" in B1) b1 ;; B2) b2 ;; R1) r1 ;; R2) r2 ;; *) echo "usage: probe.sh B1|B2|R1|R2"; exit 64 ;; esac
