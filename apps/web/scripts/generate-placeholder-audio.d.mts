/**
 * Type declarations for the placeholder audio generator script (consumed by
 * tests/unit/dialogue/content-schema.spec.ts to pin the content↔asset hash).
 */
export function hashLine(text: string, voiceId: string): string;
export function estimateDurationMs(tokenCount: number): number;
export function main(): Promise<void>;
