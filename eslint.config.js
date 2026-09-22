import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// REQ-ARC-02: cli → (runner, scoring, site) → (campaign, scenario, arms, agents, results) → core.
// scoring never imports runner, and the reverse holds too. Each module lists what it must not import.
const MIDDLE = ['campaign', 'scenario', 'arms', 'agents', 'results'];
const TOP = ['runner', 'scoring', 'site'];

const forbiddenImports = {
  core: [...MIDDLE, ...TOP, 'cli'],
  ...Object.fromEntries(
    MIDDLE.map((module) => [module, [...MIDDLE.filter((m) => m !== module), ...TOP, 'cli']]),
  ),
  runner: ['scoring', 'site', 'cli'],
  scoring: ['runner', 'site', 'cli'],
  site: ['runner', 'scoring', 'cli'],
};

const dependencyRule = Object.entries(forbiddenImports).map(([module, forbidden]) => ({
  files: [`src/${module}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: forbidden.flatMap((target) => [`**/${target}`, `**/${target}/**`]),
            message: `REQ-ARC-02: module '${module}' must not import ${forbidden.join(', ')}.`,
          },
        ],
      },
    ],
  },
}));

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'vendor/', 'docs/', 'runs/', 'results/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...dependencyRule,
);
