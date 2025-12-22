import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    watch: false,
    // Only run tests from our `tests` and `src` folders
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
    ],
    // Transform source files for SSR runtime
    testTransformMode: {
      ssr: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    setupFiles: ['tests/vitest-ssr-helper-setup.ts'],
    // Exclude verification/playwright tests and dependencies
    exclude: ['verification/**', 'node_modules/**'],
  },
});
