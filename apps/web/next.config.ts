import type { NextConfig } from 'next';

/**
 * HANASO web — Next.js config (KB ADR-002).
 * - `output: 'standalone'`: single deployable image (ADR-001/010 KB).
 * - React Compiler: OFF by default — decision belongs to spike TASK-M0-05 (KB OTD).
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
