#!/usr/bin/env bash
# P0 — question 7: build the run image with the agent installed, and record the version it carries.
source "$(dirname "$0")/lib.sh"

docker build \
  --build-arg AGENT_NAME=claude-code \
  --build-arg "AGENT_VERSION=$AGENT_VERSION" \
  --tag "$IMAGE" \
  --file "$SPIKE_DIR/../../docker/run-image/Dockerfile" \
  "$SPIKE_DIR/../../docker/run-image" > "$OUT/p0-build.log" 2>&1

echo "image built: $IMAGE"
docker run --rm "$IMAGE" claude --version | tee "$OUT/p0-version.txt"
docker run --rm "$IMAGE" sh -c 'ls -ld /home/node/.claude 2>&1 || echo "no /home/node/.claude in the image"' \
  | tee "$OUT/p0-config-dir.txt"
