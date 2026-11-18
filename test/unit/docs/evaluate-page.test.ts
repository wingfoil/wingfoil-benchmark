// task-155 — the evaluation page for AI agents: llms.txt, docs/evaluate.md and the README's line, kept consistent.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';

const read = (file: string) => readFileSync(repoPath(file), 'utf8');
const tracked = new Set(
  execFileSync('git', ['ls-files', '-z'], { cwd: repoPath(''), encoding: 'utf8', maxBuffer: 2 ** 28 }).split('\0'),
);

/** Every Markdown link's target in `text`, code spans and fences left out. */
function targets(text: string): string[] {
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  return [...prose.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((match) => match[1] as string);
}

const HEADINGS = [
  'What it does',
  'Problems it solves, and does not',
  'When it fits, and when not',
  'Prerequisites and adoption cost',
  'Try it in five minutes',
  'Known limits at this version',
  'Compare and measure',
  'Where it sits in the system',
];

/** The four lines of §8, as the WingFoil coordination session gave them (task-155's Design). */
const SYSTEM = [
  '- WingFoil (<https://github.com/wingfoil/wingfoil>): sets the rules for AI-assisted projects — in git, every approval with a name and a reason. A CLI and an MCP server.',
  "- WingFoil UI (<https://github.com/wingfoil/wingfoil-ui>): a local web console for a project governed by WingFoil: what requires you, gate decisions and submissions, all through the project's own WingFoil CLI.",
  "- WingFoil Templates (<https://github.com/wingfoil/wingfoil-templates>): the official catalog of template packs that configure a project's .wingfoil/ (DNA, Memory types, directives, workflows).",
  "- WingFoil Benchmark (<https://github.com/wingfoil/wingfoil-benchmark>): measures where a harness for AI coding agents makes a difference and where it does not, by rules published before any run; built by WingFoil's maintainer.",
];

describe('the evaluation page for AI agents (task-155)', () => {
  it("has llms.txt in llmstxt.org's shape: a title, a summary and sections of described links", () => {
    const lines = read('llms.txt').trimEnd().split('\n');
    expect(lines[0]).toMatch(/^# \S/);
    expect(lines.find((line) => line !== '' && !line.startsWith('# '))).toMatch(/^> \S/);
    const sections = lines.filter((line) => line.startsWith('## '));
    expect(sections.length).toBeGreaterThan(0);
    const body = lines.slice(lines.indexOf(sections[0] as string));
    for (const line of body.filter((one) => one !== '' && !one.startsWith('## ')))
      expect(line).toMatch(/^- \[[^\]]+\]\([^)\s]+\): \S/);
  });

  it('leads llms.txt with the page, then the results, the method, the release notes and the design', () => {
    const links = targets(read('llms.txt'));
    expect(links[0]).toBe('docs/evaluate.md');
    expect(links[1]).toBe('https://wingfoil.github.io/wingfoil-benchmark/');
    expect(links[2]).toMatch(/^https:\/\/wingfoil\.github\.io\/wingfoil-benchmark\/.*\/method\.html$/);
    expect(links[3]).toMatch(/^docs\/releases\/v[\d.]+\.md$/);
    expect(links[4]).toBe('docs/01_vision/09_experiment-design.md');
  });

  it.each(['llms.txt', 'docs/evaluate.md'])('resolves every relative link of %s to a tracked file', (file) => {
    const relative = targets(read(file)).filter((target) => !/^[a-z]+:/.test(target) && !target.startsWith('#'));
    expect(relative.length).toBeGreaterThan(0);
    for (const target of relative) {
      const path = normalize(join(dirname(file), target.split('#')[0] as string));
      expect(tracked.has(path), `${file}: ${target}`).toBe(true);
    }
  });

  it('has the eight headings of docs/evaluate.md, in order, and no other', () => {
    const headings = [...read('docs/evaluate.md').matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(headings).toEqual(HEADINGS);
  });

  it("holds §8's four lines unchanged, and points §7 at WingFoil's comparison", () => {
    const page = read('docs/evaluate.md').replace(/\n {2}/g, ' ');
    const last = page.slice(page.indexOf('## Where it sits in the system'));
    for (const line of SYSTEM) expect(last).toContain(line);
    expect(last.match(/^- /gm)).toHaveLength(SYSTEM.length);
    expect(page).toContain('https://wingfoil.github.io/wingfoil/docs/comparison.md');
  });

  it("resolves the page's links to its own headings, and the stored runs its commands read", () => {
    const page = read('docs/evaluate.md');
    const anchors = [...page.matchAll(/^## (.+)$/gm)].map((match) =>
      (match[1] as string).toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-'),
    );
    for (const target of targets(page).filter((one) => one.startsWith('#')))
      expect(anchors, target).toContain(target.slice(1));
    const paths = [...page.matchAll(/^\s+(results\/\S+\/r1)/gm)].map((match) => match[1] as string);
    expect(paths).toHaveLength(2);
    for (const path of paths) expect(tracked.has(`${path}/run.json`), path).toBe(true);
    expect(tracked.has('campaigns/v0-3-reference.yaml')).toBe(true);
  });

  it('says in the first lines of the README where an AI agent starts', () => {
    const first = read('README.md').split('\n').slice(0, 5).join('\n');
    expect(first).toMatch(/For AI agents.*\(llms\.txt\)/);
  });
});
