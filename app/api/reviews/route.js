// POST /api/reviews  { bookId, rating, text }  (Member)
// One review per member per book, enforced by UNIQUE(MemberID, BookID).
import { query } from '@/lib/db';
import { fail, handleError, ok, readBody, toId } from '@/lib/api';
import { requireRole } from '@/lib/auth';

export async function POST(request) {
  const { user, error } = await requireRole(request, ['Member']);
  if (error) return error;

  const body = await readBody(request);
  const bookId = toId(body.bookId);
  const rating = Number(body.rating);
  if (!bookId) return fail('Book is required');
  if (!Number.isInteger(rating)) return fail('Choose a star rating');

  try {
    // The 1-5 range is checked by chk_star_rating in MySQL
    const result = await query(
      'INSERT INTO Reviews (MemberID, BookID, StarRating, ReviewText) VALUES (?, ?, ?, ?)',
      [user.memberId, bookId, rating, (body.text || '').trim() || null]
    );
    return ok({ reviewId: result.insertId }, 201);
  } catch (err) {
    return handleError(err);
  }
}
