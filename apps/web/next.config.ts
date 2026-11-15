import type { NextConfig } from 'next';

/**
 * HANASO web — Next.js config (KB ADR-002).
 * - `output: 'standalone'`: single deployable image (ADR-001/010 KB).
 * - React Compiler: ON — spike TASK-M0-05 (PR #62): ~24× faster re-renders in
 *   client components, +0.5s build, zero SSR impact (byte-identical SSR bundle).
 * - TASK-LEARNING-08 Addendum-3 §10: audio + writing-data are stable static
 *   assets that used to ship `Cache-Control: max-age=0` — the browser
 *   re-validated on EVERY play/transition. Now: one-day cache + week-long
 *   stale-while-revalidate (bounded — never unlimited), while the registries
 *   (manifest.json / index.json) stay no-cache so deploy-time registry
 *   changes propagate immediately.
 */
const ASSET_CACHE = 'public, max-age=86400, stale-while-revalidate=604800';
const REGISTRY_CACHE = 'public, max-age=0, must-revalidate';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  reactCompiler: true,
  // TASK-LEARNING-09: sandbox live-preview hosts (agent browser 127.0.0.1 +
  // the platform preview gateway) must reach dev resources (HMR websocket,
  // fonts) — Next 16 blocks cross-origin dev requests by default.
  allowedDevOrigins: ['127.0.0.1', 'localhost', 'preview-chat-7136d8b9-b732-4cbc-9520-cec5d6a587f1.space-z.ai'],
  async headers() {
    return [
      // §10 — pre-generated audio assets (opus + m4a twins)
      {
        source: '/audio/:path*',
        headers: [{ key: 'Cache-Control', value: ASSET_CACHE }],
      },
      // the real MIME for opus (browsers sniff, but correctness costs nothing).
      // Addendum-5 §5: safe again — every audio filename is now ASCII
      // (kn-* kana refs / w-* word hash stems); the percent-encoded names
      // that broke wildcard+suffix matching (no-store cache loss) are gone.
      {
        source: '/audio/:path*.opus',
        headers: [{ key: 'Content-Type', value: 'audio/ogg' }],
      },
      // registries refresh immediately (they change with deploys) — listed
      // AFTER the general rule so they take precedence
      {
        source: '/audio/kana/manifest.json',
        headers: [{ key: 'Cache-Control', value: REGISTRY_CACHE }],
      },
      {
        source: '/audio/words/manifest.json',
        headers: [{ key: 'Cache-Control', value: REGISTRY_CACHE }],
      },
      {
        source: '/audio/hostwords/manifest.json',
        headers: [{ key: 'Cache-Control', value: REGISTRY_CACHE }],
      },
      // §3/§10 — KanjiVG stroke data (per-character JSON + licenses)
      {
        source: '/writing-data/:path*',
        headers: [{ key: 'Cache-Control', value: ASSET_CACHE }],
      },
      {
        source: '/writing-data/index.json',
        headers: [{ key: 'Cache-Control', value: REGISTRY_CACHE }],
      },
    ];
  },
};

export default nextConfig;
