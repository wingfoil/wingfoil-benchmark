# The image every run of one campaign executes in (REQ-RUN-01). It is built once per campaign and
# tagged with the campaign's identity, so a campaign always runs on the same image.
#
# node:22-bookworm, pinned by the digest of its multi-architecture index, so that a rebuild cannot
# silently change the runtime (REQ-NFR-02) and the pin does not tie the benchmark to one architecture.
# Resolved with `docker buildx imagetools inspect node:22-bookworm` on 2026-09-23; `docker manifest
# inspect` prints the per-architecture manifests instead, and pinning one of those would be amd64-only.
FROM node:22-bookworm@sha256:dd5847a04b0deee391fa145f1f4c6d214196668b6bcc7988ebed67249f226844

# git: every workspace is a repository, and steps are compared through it (REQ-RUN-02, REQ-RUN-05).
RUN apt-get update \
    && apt-get install --yes --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# The agent the campaign pins. `fake` is the scripted stand-in of the benchmark's own tests: it needs
# nothing installed, so a campaign that uses it never downloads an agent.
ARG AGENT_NAME=fake
ARG AGENT_VERSION
RUN if [ "$AGENT_NAME" = "claude-code" ]; then \
        npm install --global "@anthropic-ai/claude-code@${AGENT_VERSION}"; \
    fi

# Runs execute as an unprivileged user, in the only directory bound into the container.
USER node
WORKDIR /workspace
