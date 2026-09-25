# Sourced by probes after lib.sh: a run-like container with the P2 (c) artefact installed, the
# workspace as its only bind mount, and `wingfoil` on the PATH. $1 = label.
start_wf_container() {
  local label="$1"; WS="$OUT/$label/ws"; C="bench-spike-task-011-$label"
  docker rm -f "$C" >/dev/null 2>&1 || true
  rm -rf "$OUT/$label"; mkdir -p "$WS"
  docker create --name "$C" --mount "type=bind,src=$WS,dst=/workspace" --user node --workdir /workspace \
    "${IMAGE:-$IMAGE_FAKE}" sleep infinity >/dev/null
  docker start "$C" >/dev/null
  docker cp "$OUT/p2/wf-b.tgz" "$C:/tmp/wf-b.tgz"
  in_c 'tar -xzf /tmp/wf-b.tgz -C ~ && mkdir -p ~/.local/bin && printf "#!/bin/sh\nexec node %s/wf-b/dist/cli.js \"\$@\"\n" "$HOME" > ~/.local/bin/wingfoil && chmod +x ~/.local/bin/wingfoil'
}
# A command in the container, with the runner's git environment (src/core/ports/git.ts).
in_c() {
  docker exec -i -e PATH=/home/node/.local/bin:/usr/local/bin:/usr/bin:/bin \
    -e GIT_CONFIG_GLOBAL=/dev/null -e GIT_CONFIG_NOSYSTEM=1 \
    -e GIT_AUTHOR_NAME="WingFoil Benchmark" -e GIT_AUTHOR_EMAIL=benchmark@localhost \
    -e GIT_COMMITTER_NAME="WingFoil Benchmark" -e GIT_COMMITTER_EMAIL=benchmark@localhost \
    ${EXTRA_ENV:-} "$C" bash -c "$1"
}
stop_wf_container() { docker rm -f "$C" >/dev/null 2>&1 || true; }
# The runner's workspace: a seed and one `seed` commit.
seed_workspace() {
  in_c 'git init -q -b main && echo "# Seed" > README.md && git add -A && git commit -q -m seed && git log --format="%h %an <%ae> %s"'
}
