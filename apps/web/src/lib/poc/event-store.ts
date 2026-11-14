/**
 * HANASO — PoC analytics event store (TASK-DLG-POC-01; structure follows ADR-016
 * events.yaml shape: { name: object_action, props } — endpoint-only for the PoC).
 *
 * // DEV-ONLY — in-memory; the real pipeline (events.yaml + analytics module) is ADR-016 scope.
 */
import { z } from 'zod';

export const pocEventSchema = z.object({
  /** object_action naming per ADR-016 events.yaml (e.g. 'dialogue_line_replayed'). */
  name: z.string().regex(/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/, 'event name must be object_action snake_case'),
  props: z.record(z.string(), z.unknown()).default({}),
});

export interface PocEvent {
  name: string;
  props: Record<string, unknown>;
  at: string;
}

export class InMemoryEventStore {
  // DEV-ONLY — PoC storage.
  private readonly events: PocEvent[] = [];
  private readonly maxLength = 1000;

  record(name: string, props: Record<string, unknown>): PocEvent {
    const event: PocEvent = { name, props, at: new Date().toISOString() };
    this.events.push(event);
    if (this.events.length > this.maxLength) this.events.splice(0, this.events.length - this.maxLength);
    return event;
  }

  list(limit = 50): PocEvent[] {
    return this.events.slice(-limit).reverse();
  }

  count(): number {
    return this.events.length;
  }
}
