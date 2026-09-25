#!/bin/bash
# The wingfoil arm's setup (REQ-RUN-03). Installing the WingFoil under test, `init`, the Benchmark
# Approver and the scenario's configuration are task-013 (adr-003 decisions 1-9). Until then a
# wingfoil run is refused here, loudly, rather than run as a baseline in disguise.
set -euo pipefail
echo "the wingfoil arm's setup is not implemented yet (task-013): refusing to run without WingFoil" >&2
exit 1
