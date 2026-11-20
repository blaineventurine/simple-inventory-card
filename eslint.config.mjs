import { defineConfig } from 'eslint/config';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  {
    ignores: ['node_modules/', 'dist/', 'coverage/', 'reports/', '.stryker-tmp/'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      typescriptEslint.configs['flat/strict-type-checked'],
      typescriptEslint.configs['flat/stylistic-type-checked'],
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Rewrites `x as T` to `x!`, which no-non-null-assertion then flags; the two conflict.
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      // Templates interpolate quantities and counts; `any`, `undefined` and objects stay errors.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `||` falling back on '' / 0 / false is often deliberate; flag only nullable objects.
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true, number: true, boolean: true } },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-shadow': 'error',
      // A bare sort orders strings by code point ("Zucchini" before "apples"); say which order.
      '@typescript-eslint/require-array-sort-compare': ['error', { ignoreStringArrays: false }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.property.name='style'][property.name='display']",
          message: 'Toggle visibility with the `hidden` attribute, not style.display.',
        },
      ],
    },
  },
  {
    // Mocks and spies are untyped by nature; these rules only add noise there.
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      // Tests reach private members with bracket notation on purpose; dot-notation's private
      // exemption misses `declare private` fields, and its rewrite then breaks tsc.
      '@typescript-eslint/dot-notation': 'off',
      // Async mocks, deliberate out-of-type inputs and non-Error throws are the point of many tests.
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      // TypeScript's DOM types deprecate some tag-name overloads of querySelector/createElement.
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
  eslintPluginPrettierRecommended,
  {
    // After the Prettier config, which turns `curly` off; 'all' does not conflict with Prettier.
    files: ['**/*.ts'],
    rules: {
      curly: ['error', 'all'],
    },
  },
]);
