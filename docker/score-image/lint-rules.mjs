// The benchmark's lint configuration for M-Q2 (REQ-SCO-04 as amended in 1.16, task-041): two published,
// versioned rule sets, never the project's own. It is named so that no ESLint finds it by itself, and
// quality.mjs passes it explicitly. No type information is used, so no tsconfig is read and an agent's
// type errors change nothing. Complexity is not a rule here: quality.mjs reads it apart.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { files: ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
];
