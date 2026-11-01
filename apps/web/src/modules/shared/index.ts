/**
 * Shared module — the only module every other module may import (KB ADR-001).
 * Seeds the project-wide error envelope contract (KB backend-architecture):
 * every API/action response is an Envelope<T>; codes are `module/cause` strings;
 * only `unknown/internal` errors are reported to Sentry.
 */

export type ErrorCode = `${string}/${string}`;

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
  requestId?: string;
}

export type Envelope<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload };

export function ok<T>(data: T): Envelope<T> {
  return { ok: true, data };
}

export function fail(error: ErrorPayload): Envelope<never> {
  return { ok: false, error };
}

/** Thrown by `unwrap` when an Envelope carries an error. */
export class EnvelopeError extends Error {
  readonly payload: ErrorPayload;

  constructor(payload: ErrorPayload) {
    super(payload.message);
    this.name = 'EnvelopeError';
    this.payload = payload;
  }
}

export function unwrap<T>(envelope: Envelope<T>): T {
  if (envelope.ok) return envelope.data;
  throw new EnvelopeError(envelope.error);
}
