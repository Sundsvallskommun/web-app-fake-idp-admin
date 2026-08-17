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
