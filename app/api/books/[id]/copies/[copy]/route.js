// DELETE /api/books/[id]/copies/[copy]  (Admin)
// Removes a physical copy. A copy with loan history is refused by the
// RESTRICT foreign key on Loans, so history can never be lost by accident.
import { query } from '@/lib/db';
import { fail, handleError, ok, toId } from '@/lib/api';
import { ADMIN, requireRole } from '@/lib/auth';

export async function DELETE(request, { params }) {
  const { error } = await requireRole(request, ADMIN);
  if (error) return error;

  const { id, copy } = await params;
  const bookId = toId(id);
  const copyNumber = toId(copy);
  if (!bookId || !copyNumber) return fail('Invalid book or copy number');

  try {
    const result = await query('DELETE FROM Physical_Copy WHERE BookID = ? AND CopyNumber = ?', [bookId, copyNumber]);
    if (result.affectedRows === 0) return fail('Copy not found', 404);
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
