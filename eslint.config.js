import { join } from 'node:path';

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

import { moduleBoundaries } from './eslint/module-boundaries.js';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'vendor/', 'docs/', 'runs/', 'results/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // Node build scripts: plain ESM with the Node globals ESLint's browser-less base config omits.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { URL: 'readonly', process: 'readonly' } },
  },
  {
    files: ['src/**/*.{ts,mts,cts,tsx}'],
    plugins: { bench: { rules: { 'module-boundaries': moduleBoundaries } } },
    rules: { 'bench/module-boundaries': ['error', { srcRoot: join(import.meta.dirname, 'src') }] },
  },
);
