/**
 * HANASO — shared API route helpers (owner-pass 2026-11-19).
 *
 * Convention debt from the audit: every route copy-pasted the guest 401 guard
 * and inline NextResponse.json(fail(...), {status, no-store}) shaping, and the
 * envelope's `requestId` field existed but was NEVER populated (untraceable
 * client error reports). New learning-domain routes use these helpers; the
 * existing proven routes are untouched (no churn on the graded walk engine).
 */
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { fail, type Envelope } from '@/modules/shared';

const NO_STORE = { 'cache-control': 'no-store' } as const;

/** JSON response in the Envelope<T> contract, requestId-stamped + no-store. */
export function jsonEnvelope<T>(body: Envelope<T>, status: number, requestId: string = randomUUID()): NextResponse {
  if (!body.ok && !body.error.requestId) {
    return NextResponse.json({ ok: false, error: { ...body.error, requestId } }, { status, headers: NO_STORE });
  }
  const res = NextResponse.json(body, { status, headers: NO_STORE });
  if (!body.ok) res.headers.set('x-request-id', requestId);
  return res;
}

/** The result of the learner guard — either an identity or a ready 401. */
export type LearnerGuard = { ok: true; userId: string } | { ok: false; response: NextResponse };

/**
 * Require a valid learner session (cookie `hanaso_lid`, minted/signed by the
 * middleware). Guest/absent/unsigned → the canonical 401 envelope — one guard,
 * one message, one code (`learner/no_identity`) everywhere.
 */
export async function requireLearner(req: Request): Promise<LearnerGuard> {
  const userId = await resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) {
    return {
      ok: false,
      response: jsonEnvelope(
        fail({
          code: 'learner/no_identity',
          message: 'شناسهٔ زبان‌آموز یافت نشد — کوکی «hanaso_lid» باید توسط مرورگر پذیرفته شود.',
        }),
        401,
      ),
    };
  }
  return { ok: true, userId };
}

/** Parse a JSON body with the canonical 400 envelope on malformed input. */
export async function readJson(
  req: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return {
      ok: false,
      response: jsonEnvelope(fail({ code: 'request/invalid_json', message: 'body must be JSON' }), 400),
    };
  }
}

/** Canonical zod failure envelope (details carry the field-level issues). */
export function validationFailed(module = 'request', details?: unknown, responseId?: string): NextResponse {
  return jsonEnvelope(
    fail({
      code: `${module}/validation_failed`,
      message: 'شکل درخواست معتبر نیست — فیلدهای ارسالی را با قرارداد API بررسی کنید.',
      details,
    }),
    400,
    responseId,
  );
}

/** Back-compat alias for the original positional style. */
