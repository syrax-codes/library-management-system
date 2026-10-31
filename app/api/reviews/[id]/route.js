// DELETE /api/reviews/[id]  (the member who wrote it, or Admin)
import { query } from '@/lib/db';
import { fail, handleError, ok, toId } from '@/lib/api';
import { requireRole } from '@/lib/auth';

export async function DELETE(request, { params }) {
  const { user, error } = await requireRole(request, ['Member', 'Admin']);
  if (error) return error;

  const reviewId = toId((await params).id);
  if (!reviewId) return fail('Invalid review id');

  try {
    const [review] = await query('SELECT MemberID FROM Reviews WHERE ReviewID = ?', [reviewId]);
    if (!review) return fail('Review not found', 404);
    if (user.role !== 'Admin' && review.MemberID !== user.memberId) {
      return fail('You can only delete your own reviews', 403);
    }

    await query('DELETE FROM Reviews WHERE ReviewID = ?', [reviewId]);
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
