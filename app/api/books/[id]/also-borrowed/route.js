// GET /api/books/[id]/also-borrowed  (all roles)
// Neo4j: books most often borrowed by members who borrowed this book.
// Neo4j returns bookIds and scores; titles and availability come from MySQL.
import { query } from '@/lib/db';
import { fail, ok, toId } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { alsoBorrowed } from '@/lib/recommendations';

export async function GET(request, { params }) {
  const { error } = await requireRole(request);
  if (error) return error;

  const bookId = toId((await params).id);
  if (!bookId) return fail('Invalid book id');

  let ranked;
  try {
    ranked = await alsoBorrowed(bookId);
  } catch (err) {
    return ok({ available: false, items: [], message: 'Recommendations are offline (Neo4j is not running)' });
  }

  if (ranked.length === 0) return ok({ available: true, items: [] });

  const ids = ranked.map((r) => r.bookId);
  const rows = await query(
    `SELECT BookID, Title, AvailableCopies FROM vw_BookCatalog WHERE BookID IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const byId = Object.fromEntries(rows.map((r) => [r.BookID, r]));
  const items = ranked
    .filter((r) => byId[r.bookId])
    .map((r) => ({ ...byId[r.bookId], SharedReaders: r.sharedReaders }));

  return ok({ available: true, items });
}
