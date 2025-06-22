// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'json', 'progress'],
  testRunner: 'vitest',
  ignoreStatic: true,
  coverageAnalysis: 'perTest',
  checkers: ['typescript'],
  mutator: {
    excludedMutations: ['StringLiteral'],
  },
  htmlReporter: {
    fileName: 'reports/mutation/mutation.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/mutation.json',
  },
};
export default config;
