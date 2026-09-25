#!/bin/bash
# The fixture arm's setup (REQ-RUN-03): it leaves a mark outside the workspace, so the docker suite
# can tell that the setup ran in the container, and changes nothing the agent will see.
set -euo pipefail
echo "fixture setup ran" > "$HOME/setup-ran"
