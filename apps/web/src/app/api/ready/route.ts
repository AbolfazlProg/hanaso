import { NextResponse } from 'next/server';

/**
 * Readiness endpoint (KB backend-architecture): verifies configured dependencies.
 * Skeleton phase: only the process itself; the database check activates with
 * PostgreSQL in M0-10 (honest reporting — never a fake "ready").
 */
export const dynamic = 'force-dynamic';

type CheckStatus = 'ok' | 'skipped' | 'fail';

interface Check {
  status: CheckStatus;
  detail?: string;
}

export function GET() {
  const checks: Record<string, Check> = {
    process: { status: 'ok' },
    database: process.env.DATABASE_URL
      ? { status: 'fail', detail: 'DATABASE_URL set but DB layer lands in M0-10 — do not deploy with a DB URL yet' }
      : { status: 'skipped', detail: 'no DATABASE_URL configured (expected until M0-10)' },
  };

  const ready = Object.values(checks).every((c) => c.status !== 'fail');
  return NextResponse.json(
    { ok: ready, service: 'hanaso-web', checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
