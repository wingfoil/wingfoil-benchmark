import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';

import { TEST_REGISTER, writeRegister } from './eligibility-fixture.js';
import { tempDir } from './scenario-fixture.js';

/** A complete arm definition (REQ-FMT-05): every field, the optional ones included. */
export function completeArmYaml(name = 'wingfoil'): Record<string, unknown> {
  return {
    name,
    setup: 'setup.sh',
    manual: 'manual.md',
    environment: 'environment',
    mcp: 'mcp.json',
    requires: 'wingfoil',
    telemetry_off: [],
  };
}

/** A plain-agent arm: no environment, no MCP, no harness. */
export function plainArmYaml(name = 'baseline'): Record<string, unknown> {
  // A docs control names the harness arm it is generated from, as the repository's do (REQ-RUN-11).
  const docsOf = DOCS_OF[name];
  return {
    name,
    setup: 'setup.sh',
    manual: 'manual.md',
    ...(docsOf === undefined ? {} : { docs_of: docsOf }),
  };
}

const DOCS_OF: Readonly<Record<string, string>> = { 'baseline-docs': 'wingfoil', 'speckit-docs': 'speckit' };

/** The files a {@link completeArmYaml} declares, created with some content. */
export const COMPLETE_ARM_FILES = ['setup.sh', 'manual.md', 'environment/NOTES.md', 'mcp.json'];

/** A setup script that succeeds, an empty MCP configuration, and a line naming any other file. */
function contentOf(file: string): string {
  if (file.endsWith('.sh')) return '#!/bin/sh\nexit 0\n';
  if (file.endsWith('.json')) return '{ "mcpServers": {} }\n';
  return `${file}\n`;
}

/**
 * Write `<root>/<name>/arm.yaml` (a string verbatim) and `files`, each with a line of content. The
 * directory `environment/` exists as soon as one of its files is listed.
 */
export function writeArmAt(
  root: string,
  name: string,
  yaml: Record<string, unknown> | string,
  files: readonly string[],
): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'arm.yaml'), typeof yaml === 'string' ? yaml : stringify(yaml));
  for (const file of files) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), contentOf(file));
  }
  return dir;
}

/**
 * The arms `names` in `arms/` under `root` (default: a temporary directory; default names: the three
 * v0.1 arms). wingfoil requires the `wingfoil` harness; every other arm runs the plain agent.
 */
export function writeArmsNamed(
  root: string = tempDir('bench-arms-'),
  names: readonly string[] = ['baseline', 'baseline-docs', 'wingfoil'],
): string {
  const arms = join(root, 'arms');
  // A repository with arms gets the register that admits the test pins (F7.4), unless it has one already.
  if (!existsSync(join(root, 'eligibility', 'register.yaml'))) writeRegister(root, TEST_REGISTER);
  for (const name of names) {
    if (name === 'wingfoil') writeArmAt(arms, name, completeArmYaml(name), COMPLETE_ARM_FILES);
    else writeArmAt(arms, name, plainArmYaml(name), ['setup.sh', 'manual.md']);
  }
  return arms;
}
