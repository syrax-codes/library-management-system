// GET /api/recommendations/[memberId]  (that member, or staff)
// Neo4j: "for you" books, similar readers and the reading profile.
import { query } from '@/lib/db';
import { fail, ok, toId } from '@/lib/api';
import { isStaff, requireRole } from '@/lib/auth';
import { forYou, readingProfile, similarReaders } from '@/lib/recommendations';

export async function GET(request, { params }) {
  const { user, error } = await requireRole(request);
  if (error) return error;

  const memberId = toId((await params).memberId);
  if (!memberId) return fail('Invalid member id');
  if (!isStaff(user) && user.memberId !== memberId) {
    return fail('You do not have permission to do this', 403);
  }

  let picks, readers, profile;
  try {
    [picks, readers, profile] = await Promise.all([forYou(memberId), similarReaders(memberId), readingProfile(memberId)]);
  } catch (err) {
    return ok({
      available: false,
      message: 'Recommendations are offline (Neo4j is not running)',
      forYou: [],
      similarReaders: [],
      readingProfile: [],
    });
  }

  // Titles and live availability for the recommended books come from MySQL
  let books = [];
  if (picks.length) {
    const ids = picks.map((p) => p.bookId);
    const rows = await query(
      `SELECT BookID, Title, AvailableCopies FROM vw_BookCatalog WHERE BookID IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const byId = Object.fromEntries(rows.map((r) => [r.BookID, r]));
    books = picks
      .filter((p) => byId[p.bookId])
      .map((p) => ({ ...byId[p.bookId], Popularity: p.popularity, ViaGenres: p.viaGenres }));
  }

  return ok({ available: true, forYou: books, similarReaders: readers, readingProfile: profile });
}
