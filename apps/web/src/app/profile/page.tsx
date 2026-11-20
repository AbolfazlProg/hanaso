import { redirect } from 'next/navigation';

/**
 * /profile — UX-AUDIT #144: the audited 404 route. The profile lives inside
 * /settings (name + device defaults + identity facts) — one page, one place,
 * no orphan route.
 */
export default function ProfilePage() {
  redirect('/settings');
}
