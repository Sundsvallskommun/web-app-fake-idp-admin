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
      'react-refresh/only-export-components': ['error', { allowExportNames: ['getServerSideProps'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Vendorade shadcn/ui-komponenter. De genereras av `npx shadcn add` och ska inte
    // handredigeras, så vi anpassar reglerna istället för filerna: shadcn exporterar
    // medvetet både komponenter och cva-varianter/hooks per fil, och
    // SidebarMenuSkeleton använder Math.random() för sin platshållarbredd.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    files: ['*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  eslintConfigPrettier,
  globalIgnores([
    '.next/**',
    'dist/**',
    'coverage/**',
    '**/*.jsx',
    '**/*.d.ts',
  ]),
]);
