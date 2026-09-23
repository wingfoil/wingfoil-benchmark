# The image every run of one campaign executes in (REQ-RUN-01). It is built once per campaign and
# tagged with the campaign's identity, so a campaign always runs on the same image.
#
# node:22-bookworm, pinned by digest (resolved with `docker manifest inspect` on 2026-09-23), so that
# a rebuild cannot silently change the runtime (REQ-NFR-02).
FROM node:22-bookworm@sha256:ae9f58d5c9f5a537110310be6b3cf67cf9c67146a3bb9310c0cb515fe71c8392

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
