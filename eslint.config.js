import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'vendor/', 'docs/', 'runs/', 'results/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
);
