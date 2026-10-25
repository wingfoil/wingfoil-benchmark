import { describe, expect, it } from 'vitest';

import { codexMcpServers } from '../../../src/agents/index.js';

/** dl-025, task-105: an arm's MCP server (Claude Code's `mcp.json`) rendered for Codex's `config.toml`. */
describe("an arm's MCP servers in Codex's config.toml (REQ-RUN-15 as amended in 1.37)", () => {
  it('renders each stdio server as an mcp_servers table, its command and args quoted', () => {
    const toml = codexMcpServers({
      mcpServers: { wingfoil: { type: 'stdio', command: '/home/node/.local/bin/wingfoil', args: ['mcp'] } },
    });
    expect(toml).toBe('[mcp_servers.wingfoil]\ncommand = "/home/node/.local/bin/wingfoil"\nargs = ["mcp"]\n');
  });

  it('renders an environment, and quotes a name that is not bare', () => {
    const toml = codexMcpServers({
      mcpServers: { 'my server': { command: 'x', args: [], env: { A: 'b "c"' } } },
    });
    expect(toml).toBe(
      '[mcp_servers."my server"]\ncommand = "x"\nargs = []\n\n[mcp_servers."my server".env]\nA = "b \\"c\\""\n',
    );
  });

  it('refuses a server Codex cannot start from these keys', () => {
    expect(() =>
      codexMcpServers({ mcpServers: { web: { type: 'http', url: 'https://example.org' } } }),
    ).toThrow(/web: only stdio servers with a command are rendered for Codex/);
    expect(() => codexMcpServers({ servers: {} })).toThrow(/has no mcpServers/);
  });
});
