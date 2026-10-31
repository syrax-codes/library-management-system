// GET  /api/books?q=&genre=&available=1   (all roles)  catalog search
// POST /api/books                          (Admin)      add a book with genres and copies
import { query, transaction } from '@/lib/db';
import { fail, handleError, ok, readBody } from '@/lib/api';
import { ADMIN, requireRole } from '@/lib/auth';

export async function GET(request) {
  const { error } = await requireRole(request);
  if (error) return error;

  const params = new URL(request.url).searchParams;
  const q = (params.get('q') || '').trim();
  const genre = (params.get('genre') || '').trim();
  const availableOnly = params.get('available') === '1';

  const where = [];
  const values = [];
  let select = 'SELECT c.*, NULL AS Relevance';
  let order = 'ORDER BY c.Title';

  if (q) {
    // Full-text search on Title + Description, ranked by relevance score.
    // The search text is a bound parameter, so input like ' OR 1=1 -- is just text.
    select = 'SELECT c.*, MATCH(b.Title, b.Description) AGAINST (? IN NATURAL LANGUAGE MODE) AS Relevance';
    values.push(q);
    where.push('MATCH(b.Title, b.Description) AGAINST (? IN NATURAL LANGUAGE MODE)');
    values.push(q);
    order = 'ORDER BY Relevance DESC';
  }
  if (genre) {
    where.push('c.BookID IN (SELECT BookID FROM Book_Genres WHERE Genre = ?)');
    values.push(genre);
  }
  if (availableOnly) where.push('c.AvailableCopies > 0');

  try {
    const books = await query(
      `${select}
       FROM vw_BookCatalog c
       JOIN Books b ON b.BookID = c.BookID
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ${order}`,
      values
    );
    const genres = await query('SELECT DISTINCT Genre FROM Book_Genres ORDER BY Genre');
    return ok({ books, genres: genres.map((g) => g.Genre) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request) {
  const { error } = await requireRole(request, ADMIN);
  if (error) return error;

  const body = await readBody(request);
  const title = (body.title || '').trim();
  const isbn = (body.isbn || '').trim();
  const copies = Number(body.copies || 1);
  const genres = (Array.isArray(body.genres) ? body.genres : String(body.genres || '').split(','))
    .map((g) => g.trim())
    .filter(Boolean);

  if (!title || !isbn) return fail('Title and ISBN are required');
  if (!Number.isInteger(copies) || copies < 1 || copies > 20) return fail('Copies must be between 1 and 20');

  try {
    // Book, genres and copies are inserted together or not at all
    const bookId = await transaction(async (conn) => {
      const [result] = await conn.execute(
        'INSERT INTO Books (Title, Publisher, PublicationYear, ISBN, Description) VALUES (?, ?, ?, ?, ?)',
        [title, body.publisher || null, body.year ? Number(body.year) : null, isbn, body.description || null]
      );
      const id = result.insertId;
      for (const genre of genres) {
        await conn.execute('INSERT INTO Book_Genres (BookID, Genre) VALUES (?, ?)', [id, genre]);
      }
      for (let n = 1; n <= copies; n++) {
        await conn.execute(
          `INSERT INTO Physical_Copy (BookID, CopyNumber, Floor, Aisle, ShelfNumber, AcquisitionDate)
           VALUES (?, ?, ?, ?, ?, CURDATE())`,
          [id, n, body.floor || null, body.aisle || null, body.shelf || null]
        );
      }
      return id;
    });
    return ok({ bookId }, 201);
  } catch (err) {
    return handleError(err);
  }
}
