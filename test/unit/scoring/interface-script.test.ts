import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/**
 * The scoring image's `interface.mjs` (M-R2, REQ-SCO-05 as amended in 1.17, task-042), run on this
 * machine with the TypeScript the image pins. `npm run test:docker` runs it in the real image.
 */

function snapshot(files: Readonly<Record<string, string>>): string {
  const root = tempDir('bench-interface-snap-');
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function entries(root: string, files: readonly string[]): string[] {
  const result = spawnSync(
    process.execPath,
    [repoPath('docker/score-image/interface.mjs'), root, JSON.stringify(files)],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(`interface.mjs exited ${result.status}: ${result.stderr}`);
  return result.stdout
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as string);
}

const PATCH =
  "import type { Op } from './op.js';\n\n" +
  '/** Applies. */\n' +
  'export function apply<T>(doc: T,  ops: Op[] /* inline */ = []): T {\n  return doc;\n}\n' +
  'function helper(): number {\n  return 1;\n}\n' +
  'export const get = (p: string): number => p.length;\n' +
  "export const VERSION: string = '1';\n" +
  "export interface Options { mode: 'strict' | 'loose'; depth?: number }\n" +
  'export type Pointer = string[];\n' +
  'export enum Kind { A, B }\n' +
  'export class Patch {\n  constructor(private readonly x: number) {}\n  run(a: number): void {}\n' +
  '  private hidden(): void {}\n  #secret = 1;\n  static of(): Patch {\n    return new Patch(helper());\n  }\n}\n';

describe('interface.mjs (M-R2, REQ-SCO-05, task-042)', { timeout: 60_000 }, () => {
  it('reads each exported declaration as its signature: no body, no initializer, no comment', () => {
    const root = snapshot({ 'src/patch.ts': PATCH });
    expect(entries(root, ['src/patch.ts'])).toEqual([
      'src/patch.ts: export class Patch { constructor(x: number); run(a: number): void; static of(): Patch; }',
      'src/patch.ts: export const VERSION: string;',
      'src/patch.ts: export const get = (p: string): number => { };',
      'src/patch.ts: export enum Kind { A, B }',
      'src/patch.ts: export function apply<T>(doc: T, ops: Op[] = []): T;',
      "src/patch.ts: export interface Options { mode: 'strict' | 'loose'; depth?: number; }",
      'src/patch.ts: export type Pointer = string[];',
    ]);
  });

  it("keeps re-exports and default exports, one entry per overload but none for the overloads' implementation, sorted and without duplicates", () => {
    const root = snapshot({
      'src/index.ts':
        "export { apply as applyPatch } from './patch.js';\nexport * from './pointer.js';\n" +
        "export { apply as applyPatch } from './patch.js';\n",
      'src/over.ts':
        'export function f(a: string): string;\nexport function f(a: number): number;\n' +
        'export function f(a: unknown): unknown {\n  return a;\n}\nexport default f;\n',
    });
    expect(entries(root, ['src/index.ts', 'src/over.ts'])).toEqual([
      "src/index.ts: export * from './pointer.js';",
      "src/index.ts: export { apply as applyPatch } from './patch.js';",
      'src/over.ts: export default f;',
      'src/over.ts: export function f(a: number): number;',
      'src/over.ts: export function f(a: string): string;',
    ]);
  });

  it('says a file that does not parse, and reads nothing of a file with no export', () => {
    const root = snapshot({
      'src/broken.ts': 'export function (: {\n',
      'src/quiet.ts': 'const a = 1;\nconsole.log(a);\n',
    });
    expect(entries(root, ['src/broken.ts', 'src/quiet.ts'])).toEqual(['src/broken.ts: (does not parse)']);
  });

  it('gives the same entries for the same code, whatever its layout', () => {
    const one = snapshot({ 'a.ts': 'export function f(a:number,b:string):void{}\n' });
    const two = snapshot({
      'a.ts': '/** F. */\nexport function f(\n  a: number,\n  b: string,\n): void {\n  return;\n}\n',
    });
    expect(entries(one, ['a.ts'])).toEqual(entries(two, ['a.ts']));
  });

  it("gives a private parameter property no property modifier, and keeps a public or protected one's", () => {
    const root = snapshot({
      'a.ts':
        'export class A {\n  constructor(private readonly x: number, readonly y: number, protected z: string) {}\n}\n',
    });
    expect(entries(root, ['a.ts'])).toEqual([
      'a.ts: export class A { constructor(x: number, readonly y: number, protected z: string); }',
    ]);
  });

  it('keeps the exported members of an exported namespace, nested names included', () => {
    const root = snapshot({
      'n.ts':
        'export namespace N {\n  export function f(x: number): void {}\n  function hidden(): void {}\n}\n' +
        'export namespace A.B {\n  export const c: number = 1;\n}\n',
    });
    expect(entries(root, ['n.ts'])).toEqual([
      'n.ts: export namespace A.B { export const c: number; }',
      'n.ts: export namespace N { export function f(x: number): void; }',
    ]);
  });

  it('reads a function or a class behind an expression: parentheses, a type assertion, satisfies, a default export', () => {
    const root = snapshot({
      'e.ts':
        'export const g = ((x: number): number => x) as F;\n' +
        'export const h = ((x: number): number => x) satisfies F;\n' +
        'export const K = class {\n  run(a: number): void {}\n  private y = 1;\n};\n' +
        'export default (a: number): number => a * 2;\n',
    });
    expect(entries(root, ['e.ts'])).toEqual([
      'e.ts: export const K = class { run(a: number): void; };',
      'e.ts: export const g: F;',
      'e.ts: export const h = (x: number): number => { };',
      'e.ts: export default (a: number): number => { };',
    ]);
  });
});
