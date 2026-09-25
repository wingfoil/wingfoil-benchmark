#!/usr/bin/env bash
# P1: build the WingFoil under test from a clean archive of the pin, twice in the run image's base and
# once on the host; compare the tarballs with each other and with the vendored one.
source "$(dirname "$0")/lib.sh"
build_in_container() {
  local label="$1" dir="$OUT/p1/$1" t0 t1
  archive_pin "$dir/src"
  t0=$(now)
  docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$dir/src:/build" -w /build "$NODE_IMAGE" \
    sh -c 'node --version && npm --version && npm ci --no-audit --no-fund >/dev/null 2>&1 && npm pack --pack-destination /build 2>/dev/null | tail -1' \
    > "$dir/log.txt" 2>&1
  t1=$(now)
  echo "$label: $(tr '\n' ' ' < "$dir/log.txt") time=$(elapsed "$t0" "$t1")s"
}
build_on_host() {
  local dir="$OUT/p1/host" t0 t1
  archive_pin "$dir/src"
  t0=$(now)
  (cd "$dir/src" && node --version && npm ci --no-audit --no-fund >/dev/null 2>&1 && npm pack 2>/dev/null | tail -1) > "$dir/log.txt"
  t1=$(now)
  echo "host: $(tr '\n' ' ' < "$dir/log.txt") time=$(elapsed "$t0" "$t1")s"
}
build_in_container c1
build_in_container c2
build_on_host
echo "--- tarballs"
for f in "$OUT"/p1/*/src/wingfoil-*.tgz "$REPO_DIR/vendor/wingfoil-0.2-pre-3df305e.tgz"; do
  printf '%s  %s bytes  %s\n' "$(sha256sum "$f" | cut -c1-16)" "$(stat -c %s "$f")" "${f#$OUT/}"
done
