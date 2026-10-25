// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'json', 'progress'],
  testRunner: 'vitest',
  // Same pool as the normal suite (vitest's default). Stryker's runner defaults to threads,
  // where a test that sets process.env.TZ at runtime (historyView) doesn't take effect.
  vitest: { pool: 'forks' },
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
