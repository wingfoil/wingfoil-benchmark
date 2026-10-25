import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { doubles } from '../../support/runner-doubles.js';

/** A Codex campaign of one S1 run; the agent is the doubles', whatever the file names. */
function codexCampaign() {
  const { root, file } = writeRepo(
    {
      ...completeCampaignYaml(),
      harnesses: {},
      arms: ['baseline'],
      scenarios: [{ id: 'S1', version: '1.0' }],
      repetitions: { S1: 1 },
      agent: { name: 'codex', version: '0.162.1', effort: { 'gpt-6.1-sol': 'medium' } },
      models: { default: 'gpt-6.1-sol' },
    },
    ['S1@1.0'],
  );
  const checked = checkCampaign(file);
  if (!checked.ok)
    throw new Error(checked.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '));
  return { root, checked: checked.value };
}

const CODEX_HOME = '/home/node/.codex-run';
const AUTH = '/home/maintainer/.codex-bench/auth.json';
const WRITE = 'printf "%s" "$1" > "$2"';

describe("Codex's home in the run container (REQ-RUN-15, REQ-NFR-01 as amended in 1.32, dl-019)", () => {
  it("mounts the credential file read-write at the run's CODEX_HOME, and names CODEX_HOME in the environment only", async () => {
    const { checked } = codexCampaign();
    const ports = doubles();

    await runCampaign(checked, { ...ports, credentialFile: AUTH });

    expect(ports.recorded.creates.map((create) => create.mounts)).toEqual([
      [{ source: AUTH, target: `${CODEX_HOME}/auth.json` }],
    ]);
    // No Claude Code variable, and nothing secret: the credential is the mount.
    expect(ports.recorded.creates.map((create) => create.env)).toEqual([{ CODEX_HOME }]);
  });

  it("writes Codex's configuration before the arm's setup: a file credential store, no history, memories, analytics or exporter", async () => {
    const { checked } = codexCampaign();
    const ports = doubles();

    await runCampaign(checked, { ...ports, credentialFile: AUTH });

    const commands = ports.recorded.execs.map((exec) => exec.command);
    const written = commands.findIndex((command) => command[2] === WRITE);
    const setup = commands.findIndex((command) => command[0] === 'bash');
    expect(written).toBeGreaterThanOrEqual(0);
    expect(written).toBeLessThan(setup);
    const [, , , , content, target] = commands[written] ?? [];
    expect(target).toBe(`${CODEX_HOME}/config.toml`);
    for (const line of [
      'cli_auth_credentials_store = "file"',
      '[history]\npersistence = "none"',
      '[analytics]\nenabled = false',
      '[features]\nmemories = false',
      '[otel]\nexporter = "none"',
    ])
      expect(content).toContain(line);
  });

  it('empties CODEX_HOME but its credential and configuration before every step, so only the repository carries state', async () => {
    const { checked } = codexCampaign();
    const ports = doubles();

    await runCampaign(checked, { ...ports, credentialFile: AUTH });

    const clears = ports.recorded.execs
      .map((exec) => exec.command.join(' '))
      .filter((command) => command.includes('-mindepth 1'));
    expect(clears.length).toBeGreaterThan(0);
    for (const command of clears) {
      expect(command).toContain('! -name auth.json');
      expect(command).toContain('! -name config.toml');
    }
    // Claude Code's auto-memory is not Codex's business.
    expect(ports.recorded.execs.some((exec) => exec.command.join(' ').includes('.claude/projects'))).toBe(
      false,
    );
  });

  it('refuses a container with a mount other than the workspace and the credential', async () => {
    const { checked } = codexCampaign();
    const ports = doubles({ extraMounts: ['/etc:/host-etc'] });

    const summary = await runCampaign(checked, { ...ports, credentialFile: AUTH });

    expect(summary.runs[0]?.outcome).toBe('failed');
    expect(summary.runs[0]?.error).toMatch(/mounts other than its workspace: .*\/host-etc/);
  });
});

describe("a refreshed credential's values (REQ-NFR-01 as amended in 1.32, review 1)", () => {
  it('scrubs what the runner stores with the values the credential holds when it stores it, not only at the start', async () => {
    const { checked } = codexCampaign();
    const refreshed = 'at-refreshed-during-the-run-0002';
    const ports = doubles({ patchOf: () => `+token=${refreshed}\n` });

    const summary = await runCampaign(checked, {
      ...ports,
      credentialFile: AUTH,
      secrets: ['at-original-0001-long'],
      refreshSecrets: () => [refreshed],
    });

    const patch = readFileSync(join(summary.runs[0]?.outputDir ?? '', 'steps', '01', 'diff.patch'), 'utf8');
    expect(patch).not.toContain(refreshed);
    expect(patch).toContain('[redacted]');
  });
});

describe("Codex's manual (REQ-RUN-12 as amended in 1.32)", () => {
  it("puts the arm's manual in the workspace as AGENTS.md, and records that file", async () => {
    const { root, checked } = codexCampaign();
    const ports = doubles();

    const summary = await runCampaign(checked, { ...ports, credentialFile: AUTH });

    const workspace = summary.runs[0]?.workspace ?? '';
    expect(readFileSync(join(workspace, 'AGENTS.md'), 'utf8')).toBe(
      readFileSync(join(root, 'arms', 'baseline', 'manual.md'), 'utf8'),
    );
    expect(existsSync(join(workspace, 'CLAUDE.md'))).toBe(false);
    const record = JSON.parse(readFileSync(join(summary.runs[0]?.outputDir ?? '', 'run.json'), 'utf8')) as {
      manual: { file: string };
    };
    expect(record.manual.file).toBe('AGENTS.md');
  });
});

describe("an arm's MCP server and manual under Codex (dl-025, task-105)", () => {
  it("adds the arm's MCP servers to Codex's config.toml, from its mcp.json", async () => {
    const { root, checked } = codexCampaign();
    writeFileSync(
      join(root, 'arms', 'baseline', 'arm.yaml'),
      'name: baseline\nsetup: setup.sh\nmanual: manual.md\nmcp: mcp.json\n',
    );
    writeFileSync(
      join(root, 'arms', 'baseline', 'mcp.json'),
      JSON.stringify({
        mcpServers: { wingfoil: { type: 'stdio', command: '/home/node/.local/bin/wingfoil', args: ['mcp'] } },
      }),
    );
    const again = checkCampaign(join(root, 'campaigns', 'campaign.yaml'));
    if (!again.ok) throw new Error(JSON.stringify(again.issues));
    const ports = doubles();

    await runCampaign(again.value, { ...ports, credentialFile: AUTH });

    const written =
      ports.recorded.execs.map((exec) => exec.command).find((command) => command[2] === WRITE) ?? [];
    expect(written[5]).toBe(`${CODEX_HOME}/config.toml`);
    expect(written[4]).toContain(
      '[mcp_servers.wingfoil]\ncommand = "/home/node/.local/bin/wingfoil"\nargs = ["mcp"]\n',
    );
    void checked;
  });

  it("merges an AGENTS.md the arm's setup wrote with the manual, as a CLAUDE.md is under Claude Code (characterization)", async () => {
    const { root } = codexCampaign();
    writeFileSync(
      join(root, 'arms', 'baseline', 'setup.sh'),
      'printf "the tool\'s own guide\\n" >> AGENTS.md\n',
    );
    const again = checkCampaign(join(root, 'campaigns', 'campaign.yaml'));
    if (!again.ok) throw new Error(JSON.stringify(again.issues));
    const ports = doubles({ execResultOf: () => undefined });

    const summary = await runCampaign(again.value, { ...ports, credentialFile: AUTH });

    const record = JSON.parse(readFileSync(join(summary.runs[0]?.outputDir ?? '', 'run.json'), 'utf8')) as {
      manual: { file: string };
    };
    expect(record.manual.file).toBe('AGENTS.md');
  });
});
