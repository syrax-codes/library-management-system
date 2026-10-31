// POST /api/auth/logout  (any user) — clears the session cookie
import { ok } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const response = ok({ loggedOut: true });
  clearSessionCookie(response);
  return response;
}
