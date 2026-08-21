import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@components': fromRoot('./src/components'),
      '@config': fromRoot('./src/config'),
      '@contexts': fromRoot('./src/contexts'),
      '@data-contracts': fromRoot('./src/data-contracts'),
      '@interfaces': fromRoot('./src/interfaces'),
      '@layouts': fromRoot('./src/layouts'),
      '@middlewares': fromRoot('./src/utils/middlewares'),
      '@pages': fromRoot('./src/pages'),
      '@public': fromRoot('./public'),
      '@services': fromRoot('./src/services'),
      '@styles': fromRoot('./src/styles'),
      '@utils': fromRoot('./src/utils'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/vitest',
      reporter: ['text', 'lcov'],
    },
  },
});
