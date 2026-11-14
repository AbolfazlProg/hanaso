/**
 * Build/runtime info — exposed values only (never secrets).
 * CI sets NEXT_PUBLIC_BUILD_SHA / NEXT_PUBLIC_APP_VERSION at build time;
 * local defaults are 'dev' (honest signal, never a fake version).
 */
export interface BuildInfo {
  version: string;
  commitSha: string;
  env: string;
}

export function buildInfo(): BuildInfo {
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
    commitSha: process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev',
    env: process.env.NEXT_PUBLIC_ENV ?? 'local',
  };
}
