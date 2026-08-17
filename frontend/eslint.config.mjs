import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import reactRefresh from 'eslint-plugin-react-refresh';

export default defineConfig([
  eslint.configs.recommended,
  ...nextVitals,
  ...nextTypescript,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['generateMetadata', 'generateStaticParams'] },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  eslintConfigPrettier,
  globalIgnores([
    '.next/**',
    'dist/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '**/*.jsx',
    '**/*.d.ts',
    'middleware-envs.js',
  ]),
]);
