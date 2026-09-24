#!/usr/bin/env bash
# P3 — question 2: the same trivial session on the reference campaign's model, to confirm the
# result event carries the same fields there.
source "$(dirname "$0")/lib.sh"
ensure_container
session p3-sonnet "$CAMPAIGN_MODEL" 'Reply with the single word: ready' "$(uuid)"
outcome p3-sonnet
