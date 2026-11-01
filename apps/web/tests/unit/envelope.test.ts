import { describe, expect, it } from 'vitest';
import { EnvelopeError, fail, ok, unwrap, type Envelope } from '@/modules/shared';

describe('Envelope contract (modules/shared)', () => {
  it('ok() wraps data', () => {
    const e: Envelope<{ id: number }> = ok({ id: 7 });
    expect(e).toEqual({ ok: true, data: { id: 7 } });
  });

  it('fail() carries module/cause code, message and requestId', () => {
    const e = fail({ code: 'review/card_not_found', message: 'not found', requestId: 'req-1' });
    expect(e.ok).toBe(false);
    if (!e.ok) {
      expect(e.error.code).toBe('review/card_not_found');
      expect(e.error.requestId).toBe('req-1');
    }
  });

  it('unwrap() returns data on success', () => {
    expect(unwrap(ok('value'))).toBe('value');
  });

  it('unwrap() throws EnvelopeError with the payload on failure', () => {
    let caught: unknown;
    try {
      unwrap(fail({ code: 'unknown/internal', message: 'boom' }));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(EnvelopeError);
    expect((caught as EnvelopeError).payload.code).toBe('unknown/internal');
    expect((caught as EnvelopeError).message).toBe('boom');
  });

  it('error codes must be module/cause shaped (type-level contract runtime smoke)', () => {
    const e = fail({ code: 'auth/forbidden', message: 'no' });
    if (!e.ok) expect(e.error.code.split('/')).toHaveLength(2);
  });
});
