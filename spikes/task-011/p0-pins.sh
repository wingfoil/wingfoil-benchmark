#!/usr/bin/env bash
# P0: the pinned commit, the clone's state before anything runs, and the two run images.
source "$(dirname "$0")/lib.sh"
{
  echo "pin $PIN -> $(git -C "$WINGFOIL_REPO" rev-parse "$PIN^{commit}")"
  clone_state
} | tee "$OUT/p0-clone-before.txt"
echo "node image: $NODE_IMAGE"
docker build -q -t "$IMAGE_FAKE" --build-arg AGENT_NAME=fake "$REPO_DIR/docker/run-image"
