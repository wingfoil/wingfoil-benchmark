import { join } from 'node:path';

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

import { moduleBoundaries } from './eslint/module-boundaries.js';

export default tseslint.config(
  // `spikes/` holds throwaway probes and whatever an agent wrote while being probed: it is evidence,
  // not project code, and it is never built or published.
  { ignores: ['dist/', 'coverage/', 'vendor/', 'docs/', 'runs/', 'results/', 'spikes/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // Node build scripts: plain ESM with the Node globals ESLint's browser-less base config omits.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { URL: 'readonly', console: 'readonly', process: 'readonly' } },
  },
  {
    files: ['src/**/*.{ts,mts,cts,tsx}'],
    plugins: { bench: { rules: { 'module-boundaries': moduleBoundaries } } },
    rules: { 'bench/module-boundaries': ['error', { srcRoot: join(import.meta.dirname, 'src') }] },
  },
);
