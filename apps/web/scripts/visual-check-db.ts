/**
 * Local visual-check bootstrap: migrations + seeds onto the sandbox's
 * embedded PostgreSQL (port 5433, unix socket /tmp). Run once before
 * `next dev` gets DATABASE_URL.
 */
import { runMigrations } from '../src/db/migrate';
import { runSeed } from '../src/db/seed';
import { runCurriculumSeed } from '../src/db/seed-curriculum';

const url = 'postgresql://postgres@/hanaso_dev?host=/tmp&port=5433';

async function main(): Promise<void> {
  const mig = await runMigrations({ url });
  console.log('migrations:', JSON.stringify(mig));
  await runSeed({ url });
  console.log('seed: ok');
  await runCurriculumSeed({ url });
  console.log('curriculum seed: ok');
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
