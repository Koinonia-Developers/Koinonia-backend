const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  // Base recommended rules
  js.configs.recommended,

  // TypeScript configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      
      // General rules
      'no-console': 'off',
      'no-unused-vars': 'off', // Handled by TypeScript rule
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      'build/',
      'dist/',
      'coverage/',
      '.git/',
      '*.config.js',
      'scripts/**/*',
      'prisma/**/*',
    ],
  },
];