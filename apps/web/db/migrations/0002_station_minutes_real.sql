--> TASK-LEARNING-02: station est-minutes carry blueprint fractions (2.5/1.5) —
--> integer column rejected them at seed time (22P02). Expand-only type widening
--> int -> real (implicit cast, no data loss, no drops — SKL-006).
ALTER TABLE "content"."lessons" ALTER COLUMN "est_minutes" SET DATA TYPE real;
