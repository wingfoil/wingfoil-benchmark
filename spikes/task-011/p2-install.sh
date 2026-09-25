#!/usr/bin/env bash
# P2: install the P1 tarball in the run image as `node`, outside /workspace: (a) plain, dependencies
# floating; (b) with the archive's lockfile, dependencies pinned; (c) (b) packed once as the artefact
# the runner could cache per commit, then only unpacked, with no network, in the run container.
source "$(dirname "$0")/lib.sh"
D="$OUT/p2"; rm -rf "$D"; mkdir -p "$D"
cp "$OUT/p1/c1/src/wingfoil-0.1.0.tgz" "$OUT/p1/c1/src/package-lock.json" "$D/"
run() { docker run --rm --user node -e HOME=/home/node -v "$D:/spike" -v "$SPIKE_DIR/installed-vs-lock.mjs:/iv.mjs:ro" "$@"; }
t0=$(now); run "$IMAGE_FAKE" bash -c '
  set -e; npm install --no-audit --no-fund --prefix ~/wf /spike/wingfoil-0.1.0.tgz >/dev/null 2>&1
  echo "a: version=$(~/wf/node_modules/.bin/wingfoil --version)"; node /iv.mjs ~/wf /spike/package-lock.json'
echo "a: time=$(elapsed "$t0" "$(now)")s"
t0=$(now); run "$IMAGE_FAKE" bash -c '
  set -e; mkdir ~/wf-b && tar -xzf /spike/wingfoil-0.1.0.tgz -C ~/wf-b --strip-components=1
  cp /spike/package-lock.json ~/wf-b/ && (cd ~/wf-b && npm ci --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null 2>&1)
  echo "b: version=$(node ~/wf-b/dist/cli.js --version) size=$(du -sh ~/wf-b | cut -f1)"; node /iv.mjs ~/wf-b /spike/package-lock.json
  tar -C ~ -czf /spike/wf-b.tgz wf-b'
echo "b: time=$(elapsed "$t0" "$(now)")s; c: artefact $(stat -c %s "$D/wf-b.tgz") bytes"
t0=$(now); run --network none "$IMAGE_FAKE" bash -c '
  set -e; tar -xzf /spike/wf-b.tgz -C ~; mkdir -p ~/.local/bin
  printf "#!/bin/sh\nexec node %s/wf-b/dist/cli.js \"\$@\"\n" "$HOME" > ~/.local/bin/wingfoil; chmod +x ~/.local/bin/wingfoil
  export PATH=~/.local/bin:$PATH; mkdir -p /tmp/w && cd /tmp/w
  echo "c (no network): which=$(command -v wingfoil) version=$(wingfoil --version)"
  echo "c: npx --no-install wingfoil -> $(npx --no-install wingfoil --version 2>&1 | head -1)"'
echo "c: time=$(elapsed "$t0" "$(now)")s"
echo "registry: $(npm view wingfoil version 2>&1 | head -1)"
