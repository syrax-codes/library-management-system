// GET /api/auth/me  (any logged-in user) — the current user and role
import { ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireRole(request);
  if (error) return error;
  return ok({
    userId: user.userId,
    role: user.role,
    memberId: user.memberId,
    name: user.name,
    email: user.email,
  });
}
