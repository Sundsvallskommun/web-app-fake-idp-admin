import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@app': fromRoot('./src/app'),
      '@components': fromRoot('./src/components'),
      '@contexts': fromRoot('./src/contexts'),
      '@data-contracts': fromRoot('./src/data-contracts'),
      '@hooks': fromRoot('./src/hooks'),
      '@interfaces': fromRoot('./src/interfaces'),
      '@layouts': fromRoot('./src/layouts'),
      '@middlewares': fromRoot('./src/utils/middlewares'),
      '@public': fromRoot('./public'),
      '@services': fromRoot('./src/services'),
      '@styles': fromRoot('./src/styles'),
      '@utils': fromRoot('./src/utils'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['vitest/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest/setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/vitest',
      reporter: ['text', 'lcov'],
    },
  },
});
