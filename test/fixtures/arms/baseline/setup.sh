#!/bin/bash
# The fixture arm's setup (REQ-RUN-03). It says who and where it ran, which the docker suite reads
# back from setup/log.txt, and changes nothing the agent will see.
set -euo pipefail
echo "fixture setup ran as $(id -un) in $(pwd), from $(dirname "$0")"
