import { NextResponse } from 'next/server';
import { buildInfo } from '@/lib/build-info';

/**
 * Liveness endpoint (KB backend-architecture): cheap, no dependency checks,
 * exposes build identity for VPS↔GitHub coherence (ADR-015 KB).
 * Consumed by: Docker HEALTHCHECK, compose, deploy.sh gate, Gatus (30s).
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const info = buildInfo();
  return NextResponse.json(
    {
      ok: true,
      status: 'ok',
      service: 'hanaso-web',
      version: info.version,
      commit: info.commitSha,
      env: info.env,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
