import type { NextConfig } from 'next';

/**
 * HANASO web — Next.js config (KB ADR-002).
 * - `output: 'standalone'`: single deployable image (ADR-001/010 KB).
 * - React Compiler: ON — spike TASK-M0-05 (PR #62): ~24× faster re-renders in
 *   client components, +0.5s build, zero SSR impact (byte-identical SSR bundle).
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  reactCompiler: true,
};

export default nextConfig;
