import globals from 'globals';

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
  {
    files: ['xo.config.js', 'gulpfile.js'],
    rules: {
      'import-x/no-extraneous-dependencies': ['error', {devDependencies: true}],
      'n/no-extraneous-import': 'off',
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
