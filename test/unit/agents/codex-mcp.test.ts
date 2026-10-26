import { describe, expect, it } from 'vitest';

import { codexMcpServers } from '../../../src/agents/index.js';

/** dl-025, task-105: an arm's MCP server (Claude Code's `mcp.json`) rendered for Codex's `config.toml`. */
describe("an arm's MCP servers in Codex's config.toml (REQ-RUN-15 as amended in 1.37)", () => {
  it('renders each stdio server as an mcp_servers table, its command and args quoted', () => {
    const toml = codexMcpServers({
      mcpServers: { wingfoil: { type: 'stdio', command: '/home/node/.local/bin/wingfoil', args: ['mcp'] } },
    });
    expect(toml).toBe(
      '[mcp_servers.wingfoil]\ncommand = "/home/node/.local/bin/wingfoil"\nargs = ["mcp"]\nrequired = true\n',
    );
  });

  it('renders an environment, and quotes a name that is not bare', () => {
    const toml = codexMcpServers({
      mcpServers: { 'my server': { command: 'x', args: [], env: { A: 'b "c"' } } },
    });
    expect(toml).toBe(
      '[mcp_servers."my server"]\ncommand = "x"\nargs = []\nrequired = true\n\n[mcp_servers."my server".env]\nA = "b \\"c\\""\n',
    );
  });

  it('refuses a server Codex cannot start from these keys', () => {
    expect(() =>
      codexMcpServers({ mcpServers: { web: { type: 'http', url: 'https://example.org' } } }),
    ).toThrow(/web: only stdio servers with a command are rendered for Codex/);
    expect(() => codexMcpServers({ servers: {} })).toThrow(/has no mcpServers/);
  });

  it('escapes DEL, refuses a lone surrogate and an environment value that is not a string (review round 1)', () => {
    expect(codexMcpServers({ mcpServers: { a: { command: 'x\u007f', args: [] } } })).toContain(
      'command = "x\\u007f"',
    );
    expect(() => codexMcpServers({ mcpServers: { a: { command: 'x\ud800', args: [] } } })).toThrow(
      /not valid TOML/,
    );
    expect(() =>
      codexMcpServers({ mcpServers: { a: { command: 'x', args: [], env: { A: { b: 1 } } } } }),
    ).toThrow(/a: env values must be strings/);
    expect(() => codexMcpServers({ mcpServers: { a: { command: 'x', args: [], env: ['A'] } } })).toThrow(
      /a: env values must be strings/,
    );
  });

  it('refuses a server name or an env key that is not valid TOML either (review round 2)', () => {
    expect(() => codexMcpServers({ mcpServers: { 'a\ud800': { command: 'x', args: [] } } })).toThrow(
      /not valid TOML/,
    );
    expect(() =>
      codexMcpServers({ mcpServers: { a: { command: 'x', args: [], env: { 'k\ud800': 'v' } } } }),
    ).toThrow(/not valid TOML/);
    expect(codexMcpServers({ mcpServers: { 'a\u007f': { command: 'x', args: [] } } })).toContain(
      '[mcp_servers."a\\u007f"]',
    );
  });
});
