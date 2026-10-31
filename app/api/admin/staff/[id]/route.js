// PUT /api/admin/staff/[id]  { isActive }  (Admin) — deactivate or reactivate a librarian
import { query } from '@/lib/db';
import { fail, handleError, ok, readBody, toId } from '@/lib/api';
import { ADMIN, requireRole } from '@/lib/auth';

export async function PUT(request, { params }) {
  const { error } = await requireRole(request, ADMIN);
  if (error) return error;

  const userId = toId((await params).id);
  if (!userId) return fail('Invalid account id');
  const { isActive } = await readBody(request);
  if (typeof isActive !== 'boolean') return fail('isActive must be true or false');

  try {
    // Only librarian accounts can be switched, so the admin cannot lock themselves out
    const result = await query("UPDATE User_Accounts SET IsActive = ? WHERE UserID = ? AND Role = 'Librarian'", [
      isActive,
      userId,
    ]);
    if (result.affectedRows === 0) return fail('Librarian account not found', 404);
    return ok({ userId, isActive });
  } catch (err) {
    return handleError(err);
  }
}
