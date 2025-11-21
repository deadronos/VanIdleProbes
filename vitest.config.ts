import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    watch: false,
    testTransformMode: {
      ssr: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    setupFiles: ['tests/vitest-ssr-helper-setup.ts'],
  },
});
