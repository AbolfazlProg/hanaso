import { NextResponse } from 'next/server';
import { checkDatabaseReadiness } from '@/db/readiness';

/**
 * Readiness endpoint (KB backend-architecture + infrastructure-and-devops §پایش):
 * verifies configured dependencies — `SELECT 1` on PostgreSQL from the app's own pool
 * when DATABASE_URL is set, honestly skipped when it is not. Never a fake "ready".
 */
export const dynamic = 'force-dynamic';

type CheckStatus = 'ok' | 'skipped' | 'fail';

interface Check {
  status: CheckStatus;
  detail?: string;
  latencyMs?: number;
  serverVersion?: string;
}

export async function GET() {
  const database = await checkDatabaseReadiness();
  const checks: Record<string, Check> = {
    process: { status: 'ok' },
    database:
      database.status === 'ok'
        ? {
            status: 'ok',
            detail: 'SELECT 1 via the app pool',
            latencyMs: database.latencyMs,
            serverVersion: database.serverVersion,
          }
        : database.status === 'skipped'
          ? { status: 'skipped', detail: database.detail }
          : {
              status: 'fail',
              // raw driver errors (hosts, users, auth internals) stay in server logs —
              // never on the public response body (PR #74 review r2/S3)
              detail: 'database check failed — see server logs',
              latencyMs: database.latencyMs,
            },
  };

  const ready = Object.values(checks).every((c) => c.status !== 'fail');
  return NextResponse.json(
    { ok: ready, service: 'hanaso-web', checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
