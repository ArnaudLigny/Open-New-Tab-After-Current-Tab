import globals from 'globals';

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
  {
    files: ['xo.config.js', 'gulpfile.js', 'playwright.config.js', 'tests/**'],
    rules: {
      'import-x/no-extraneous-dependencies': ['error', {devDependencies: true}],
      'n/no-extraneous-import': 'off',
    },
  },
  {
    // Playwright fixture functions require arrow functions with object destructuring
    // (e.g. `({}, use) =>`) which conflicts with object-shorthand and no-empty-pattern.
    files: ['tests/fixtures.js'],
    rules: {
      'object-shorthand': 'off',
      'no-empty-pattern': 'off',
    },
  },
  {
    space: true,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: {
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-top-level-await': 'off',
    },
    ignores: [
      'build/**',
    ],
  },
];

export default xoConfig;
