/** A bare TOML key, written as it is; any other is quoted. */
const BARE_KEY = /^[A-Za-z0-9_-]+$/;

/** A TOML key: bare when it can be, quoted otherwise. */
function key(name: string): string {
  return BARE_KEY.test(name) ? name : JSON.stringify(name);
}

/** A TOML basic string: JSON's escapes, which TOML reads the same way. */
function str(value: string): string {
  return JSON.stringify(value);
}

/**
 * An arm's MCP servers, in Claude Code's `mcp.json` format, as `[mcp_servers.<name>]` tables of Codex's `config.toml`
 * (REQ-RUN-15 as amended in 1.37, dl-025, task-105): a stdio server's `command`, `args` and `env`, the keys Codex
 * 0.162.1's `McpServerTransportConfig::Stdio` reads (`codex-rs/config/src/mcp_types.rs`). A server of another kind, or
 * without a command, is refused: the run would start without the server it declares.
 */
export function codexMcpServers(json: unknown): string {
  const servers =
    json !== null && typeof json === 'object' ? (json as { mcpServers?: unknown }).mcpServers : undefined;
  if (servers === null || typeof servers !== 'object' || Array.isArray(servers)) {
    throw new Error("the arm's MCP configuration has no mcpServers map");
  }
  return Object.entries(servers as Record<string, unknown>)
    .map(([name, server]) => {
      const s = (server ?? {}) as { type?: unknown; command?: unknown; args?: unknown; env?: unknown };
      const stdio = (s.type === undefined || s.type === 'stdio') && typeof s.command === 'string';
      const args = s.args ?? [];
      if (!stdio || !Array.isArray(args) || !args.every((arg) => typeof arg === 'string')) {
        throw new Error(`${name}: only stdio servers with a command are rendered for Codex`);
      }
      const table = `mcp_servers.${key(name)}`;
      const env =
        s.env !== undefined && s.env !== null && typeof s.env === 'object'
          ? `\n[${table}.env]\n${Object.entries(s.env as Record<string, unknown>)
              .map(([k, v]) => `${key(k)} = ${str(String(v))}\n`)
              .join('')}`
          : '';
      return `[${table}]\ncommand = ${str(s.command as string)}\nargs = [${(args as string[]).map(str).join(', ')}]\n${env}`;
    })
    .join('\n');
}
