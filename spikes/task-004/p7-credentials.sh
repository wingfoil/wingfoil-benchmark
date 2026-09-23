#!/usr/bin/env bash
# P7 — question 5, run FIRST because every other session probe needs it: which environment variable
# the pinned version honours for a long-lived token. The value is never printed or copied.
source "$(dirname "$0")/lib.sh"
ensure_container

for var in ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY; do
  AUTH_VAR="$var"
  session "p7-$var" "$CHEAP_MODEL" 'Reply with the single word: ready' "$(uuid)"
  echo "final message: $(final_message "p7-$var")"
  outcome "p7-$var"
done
