import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      '@config': fromRoot('./src/config'),
      '@controllers': fromRoot('./src/controllers'),
      '@dtos': fromRoot('./src/dtos'),
      '@exceptions': fromRoot('./src/exceptions'),
      '@interfaces': fromRoot('./src/interfaces'),
      '@middlewares': fromRoot('./src/middlewares'),
      '@models': fromRoot('./src/models'),
      '@services': fromRoot('./src/services'),
      '@utils': fromRoot('./src/utils'),
    },
  },
  test: {
    // Globaler på: testerna som kom in med feature/separate-idp-admin-flows och
    // feature/structured-users-and-groups skrevs mot jest och förlitar sig på
    // describe/it/expect/beforeEach utan import.
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    sequence: {
      hooks: 'list',
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/vitest',
      reporter: ['text', 'lcov'],
    },
  },
});
