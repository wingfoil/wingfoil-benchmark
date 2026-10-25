/**
 * What the runner does for an agent in its container, besides calling its adapter (REQ-RUN-04, REQ-RUN-12,
 * REQ-RUN-15): where the manual goes, what the agent's environment holds, what is cleared before each step, and
 * where its credential is mounted when it is a file. One profile per agent name, so that the runner never tests a
 * name itself.
 */
export interface AgentProfile {
  /** Where the arm's manual is copied in the workspace (REQ-RUN-12 as amended in 1.32). */
  readonly manualFile: string;
  /** The agent's environment besides its credential. Not secret. */
  readonly environment: Readonly<Record<string, string>>;
  /** Run before every step's first session: what the agent kept that a new session would read (bug-006). */
  readonly clearBeforeStep: readonly string[];
  /** What {@link clearBeforeStep} clears, as a failure names it. */
  readonly cleared: string;
  /** Where a credential **file** is mounted, read-write, for an agent that takes one (dl-019). */
  readonly credentialTarget?: string;
  /** Files the runner writes in the container after it starts and before the arm's setup. */
  readonly files: readonly { readonly path: string; readonly content: string }[];
  /**
   * The file among {@link files} the arm's MCP servers are rendered into, for an agent that reads them from its own
   * configuration rather than a flag (Codex's `config.toml`, REQ-RUN-15 as amended in 1.37).
   */
  readonly mcpInConfig?: string;
}

/**
 * Claude Code (and the fake agent, which stands in for it): its auto-memory turned off and cleared (bug-006,
 * task-019); `--resume`'s session state in `~/.claude/projects/` kept within a step.
 */
const CLAUDE_CODE: AgentProfile = {
  manualFile: 'CLAUDE.md',
  environment: { CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' },
  clearBeforeStep: ['sh', '-c', 'rm -rf "$HOME"/.claude/projects/*/memory'],
  cleared: "the agent's auto-memory",
  files: [],
};

/** The run's Codex home: outside `/workspace`, created owned by the container user by the run image. */
export const CODEX_HOME = '/home/node/.codex-run';

/**
 * Codex's configuration (REQ-RUN-15 as amended in 1.32): the credential in a file, which dl-019 mounts; no history,
 * no memories, no analytics, no OpenTelemetry exporter. Every key passes Codex 0.162.1's `--strict-config`
 * (task-094's F3, offline).
 */
export const CODEX_CONFIG = [
  'cli_auth_credentials_store = "file"',
  '',
  '[history]',
  'persistence = "none"',
  '',
  '[analytics]',
  'enabled = false',
  '',
  '[features]',
  'memories = false',
  '',
  '[otel]',
  'exporter = "none"',
  '',
].join('\n');

/**
 * Codex (task-094): the manual as `AGENTS.md`; `CODEX_HOME` emptied before every step but its credential and its
 * configuration. Codex 0.162.1 keeps sqlite stores there (state, thread history, memories, goals) even with memories
 * off (task-094's F3); a resume within a step still finds its session.
 */
const CODEX: AgentProfile = {
  manualFile: 'AGENTS.md',
  environment: { CODEX_HOME },
  clearBeforeStep: [
    'sh',
    '-c',
    `find ${CODEX_HOME} -mindepth 1 -maxdepth 1 ! -name auth.json ! -name config.toml -exec rm -rf {} +`,
  ],
  cleared: `the agent's ${CODEX_HOME}`,
  credentialTarget: `${CODEX_HOME}/auth.json`,
  files: [{ path: `${CODEX_HOME}/config.toml`, content: CODEX_CONFIG }],
  mcpInConfig: `${CODEX_HOME}/config.toml`,
};

/** The profile of the agent a campaign pins. */
export function agentProfile(name: string): AgentProfile {
  return name === 'codex' ? CODEX : CLAUDE_CODE;
}
