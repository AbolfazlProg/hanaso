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
    // real-PostgreSQL suite lives in tests/integration-pg (own config: pnpm test:integration)
    exclude: ['tests/integration-pg/**', 'node_modules/**', '.next/**'],
    // The unit suite runs the DEV-ONLY in-memory repositories: neutralize any ambient
    // DATABASE_URL (sandbox/CI leftovers must not flip the store switch).
    env: { DATABASE_URL: '' },
  },
});
