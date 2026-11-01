// HANASO web — ESLint flat config.
// Seed policy: typescript-eslint recommended + module-boundary guard (KB ADR-001 L1 seed).
// The full 11-rule set (L1..L11, KB engineering-standards §2) lands with TASK-M0-02.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts', 'tests/**/visual-report/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/*/**', '@/modules/*/**'],
              message:
                'Module boundary violation (KB ADR-001): import a module only via its public index.ts — e.g. "@/modules/shared".',
            },
          ],
        },
      ],
    },
  },
);
