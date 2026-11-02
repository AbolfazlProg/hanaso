/**
 * HANASO — bundle the standalone ops tools (TASK-M0-10 DB-layer / Issue #11).
 *
 * Produces self-contained ESM bundles (node builtins external, everything else inlined):
 * - .tools/worker.mjs  — the pg-boss worker entry (compose service `worker`)
 * - .tools/db-cli.mjs  — migrate/seed/ready/backup/restore/verify/jobs CLI
 *
 * Why bundles: the Next standalone output only traces SERVER code; the worker and CLI
 * are separate processes. Bundling makes them deterministic — no reliance on which
 * node_modules Next happened to trace. Run as part of `pnpm --filter web build`
 * (CI + Docker build stage both call it).
 */
import { build } from 'esbuild';

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: false,
  logLevel: 'info',
  // node builtins stay external; `pg` uses no native addons (pure JS).
  external: ['node:*'],
  alias: { '@': './src' },
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
};

await build({
  ...shared,
  entryPoints: ['src/worker/main.ts'],
  outfile: '.tools/worker.mjs',
});

await build({
  ...shared,
  entryPoints: ['src/db/cli.ts'],
  outfile: '.tools/db-cli.mjs',
});

console.log('bundled: .tools/worker.mjs + .tools/db-cli.mjs');
