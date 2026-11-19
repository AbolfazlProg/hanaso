/**
 * HANASO — worker event-retention job (owner-pass 2026-11-19 — OQ-020/021 mechanism).
 *
 * The durable learning_events table is append-only with a RETENTION sweep:
 * rows older than HANASO_EVENTS_RETENTION_DAYS (default 180, clamped 7..3650)
 * are deleted daily at 04:10 Asia/Tehran (after the backup/verify windows, so a
 * retention delete can never race the nightly dump). The policy NUMBER stays an
 * OQ-020/021 decision; the MECHANISM ships now so the 20GB server can never
 * grow the analytics table unbounded.
 */
import { sweepExpiredLearningEvents } from '@/modules/analytics/store';

export async function runEventsRetention(): Promise<{ deleted: number; cutoff: string; retentionDays: number }> {
  const result = await sweepExpiredLearningEvents();
  return {
    deleted: result.deleted,
    cutoff: result.cutoff,
    retentionDays: Number(process.env.HANASO_EVENTS_RETENTION_DAYS ?? 180) || 180,
  };
}
