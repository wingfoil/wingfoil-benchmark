# The image hidden tests run in (REQ-SCO-01, REQ-SCO-02, task-027): never a run's image. It holds the
# run image's pinned Node, tsx and TypeScript at a fixed path with their lockfile, the benchmark's node:test reporter and its AST checks
# — no agent, no git, no harness. Its tag is the SHA-256 of this directory, so any change here is a new
# image.
FROM node:22-bookworm@sha256:dd5847a04b0deee391fa145f1f4c6d214196668b6bcc7988ebed67249f226844

# tsx loads a snapshot's TypeScript (REQ-SCO-02), and TypeScript's parser reads it for the AST checks
# (REQ-SCO-05); from their lockfile, so every build installs the same.
WORKDIR /opt/score
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY reporter.mjs ast-checks.mjs ./

# Where a snapshot and its suites are laid out as in the scenario version (task-027 Design). The
# snapshot is copied in; the suites are mounted read-only; the directory belongs to the unprivileged user.
RUN mkdir /score && chown node:node /score
USER node
WORKDIR /score
