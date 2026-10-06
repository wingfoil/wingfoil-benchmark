# The image every run of one campaign executes in (REQ-RUN-01). It is built once per campaign and
# tagged with the campaign's identity, so a campaign always runs on the same image.
#
# node:22-bookworm, pinned by the digest of its multi-architecture index, so that a rebuild cannot
# silently change the runtime (REQ-NFR-02) and the pin does not tie the benchmark to one architecture.
# Resolved with `docker buildx imagetools inspect node:22-bookworm` on 2026-09-23; `docker manifest
# inspect` prints the per-architecture manifests instead, and pinning one of those would be amd64-only.
FROM node:22-bookworm@sha256:dd5847a04b0deee391fa145f1f4c6d214196668b6bcc7988ebed67249f226844

# Python 3.11.2 is the base image's own (`python3 --version` at the digest above, 2026-10-06), for a Python harness's
# wheel bundle (REQ-RUN-01 as amended, REQ-FMT-12: Spec Kit). uv 0.12.23 installs that bundle; it is copied from its official image,
# pinned by the digest `docker buildx imagetools inspect ghcr.io/astral-sh/uv:0.12.23` gave on 2026-10-06.
COPY --from=ghcr.io/astral-sh/uv:0.12.23@sha256:61d393e44e249f2e4b526b6c7ddcecce245946826e608e11c93ad4f5bba55b21 /uv /uvx /usr/local/bin/

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

# Where an arm's setup puts the harness it installs (adr-003 decision 3), first on the PATH so the
# agent's shell finds it. Empty in an arm with no harness, so the image is the same for every arm.
ENV PATH=/home/node/.local/bin:$PATH

# Runs execute as an unprivileged user, in the only directory bound into the container.
USER node
WORKDIR /workspace
