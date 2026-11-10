'use client';
/**
 * HANASO — LearnerIdBootstrap (TASK-LEARNING-08 / WP-5 — #109).
 *
 * Renders nothing; on mount it makes sure THIS browser has a stable learner id
 * (localStorage + cookie). It must sit high in the tree (root layout) so every
 * later RSC render / API call resolves per-browser progress instead of the
 * shared poc-user store. Idempotent and failure-tolerant (private mode).
 */
import { useEffect } from 'react';
import { getOrCreateLearnerId } from '@/lib/learner/identity';

export function LearnerIdBootstrap() {
  useEffect(() => {
    getOrCreateLearnerId();
  }, []);
  return null;
}
