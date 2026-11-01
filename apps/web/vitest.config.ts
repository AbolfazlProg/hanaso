import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // .tsx (component markup via react-dom/server) added in TASK-M0-09
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'tests/**/*.test.tsx', 'db/tests/**/*.spec.ts'],
  },
});
