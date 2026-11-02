// HANASO web — ESLint flat config.
// Seed policy: typescript-eslint recommended + module-boundary guard (KB ADR-001 L1 seed).
// The full 11-rule set (L1..L11, KB engineering-standards §2) lands with TASK-M0-02.
//
// TASK-DLG-POC-01 refinement: modules expose TWO public entries — `index` (client-safe,
// no node builtins) and `server` (node-only: fs/crypto). Both are legal import targets;
// only deep paths stay forbidden.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts', 'tests/**/visual-report/**', '.tools/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/modules/*/!(server)',
                '**/modules/*/!(server)/**',
                '**/modules/*/server/**',
                '@/modules/*/!(server)',
                '@/modules/*/!(server)/**',
                '@/modules/*/server/**',
              ],
              message:
                'Module boundary violation (KB ADR-001): import a module only via its public entries — "@/modules/<name>" (client-safe) or "@/modules/<name>/server" (node-only).',
            },
          ],
        },
      ],
    },
  },
);
