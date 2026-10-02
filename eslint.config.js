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
    // Node build scripts, and the scoring image's reporter: plain ESM with the Node globals ESLint's
    // browser-less base config omits.
    files: ['scripts/**/*.mjs', 'docker/**/*.mjs'],
    languageOptions: { globals: { URL: 'readonly', console: 'readonly', process: 'readonly' } },
  },
  {
    // A scenario version is hashed over its bytes (REQ-FMT-09): an oracle file is not edited after its version has
    // been dry-run, so two strict style rules give way there. S1's create-patch applier (task-050) indexes paths it
    // has checked and deletes the member a patch names.
    files: ['scenarios/*/*/oracle/**/*.{ts,mts}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,mts,cts,tsx}'],
    plugins: { bench: { rules: { 'module-boundaries': moduleBoundaries } } },
    rules: { 'bench/module-boundaries': ['error', { srcRoot: join(import.meta.dirname, 'src') }] },
  },
);
