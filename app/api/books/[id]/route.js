// GET /api/books/[id]  (all roles) — book with copies, digital media and reviews
import { query } from '@/lib/db';
import { fail, handleError, ok, toId } from '@/lib/api';
import { isStaff, requireRole } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireRole(request);
  if (error) return error;

  const bookId = toId((await params).id);
  if (!bookId) return fail('Invalid book id');

  try {
    const [book] = await query(
      `SELECT c.*, b.Description
       FROM vw_BookCatalog c
       JOIN Books b ON b.BookID = c.BookID
       WHERE c.BookID = ?`,
      [bookId]
    );
    if (!book) return fail('Book not found', 404);

    // Current holder of each copy comes from vw_ActiveLoans
    const copies = await query(
      `SELECT p.CopyNumber, p.Floor, p.Aisle, p.ShelfNumber, p.AcquisitionDate, p.AvailabilityStatus,
              a.LoanID, a.MemberID AS HolderID, a.MemberName AS HolderName, a.DueDate
       FROM Physical_Copy p
       LEFT JOIN vw_ActiveLoans a ON a.BookID = p.BookID AND a.CopyNumber = p.CopyNumber
       WHERE p.BookID = ?
       ORDER BY p.CopyNumber`,
      [bookId]
    );

    const media = await query(
      `SELECT MediaNumber, FileFormat, FileSizeMB
       FROM Digital_Media
       WHERE BookID = ?
       ORDER BY MediaNumber`,
      [bookId]
    );

    const reviews = await query(
      `SELECT r.ReviewID, r.MemberID, CONCAT(m.Fname, ' ', m.Lname) AS MemberName,
              r.StarRating, r.ReviewText, r.SubmissionTimestamp
       FROM Reviews r
       JOIN Members m ON m.MemberID = r.MemberID
       WHERE r.BookID = ?
       ORDER BY r.SubmissionTimestamp DESC`,
      [bookId]
    );

    // Members see whether a copy is out, but not who has it
    const visibleCopies = isStaff(user)
      ? copies
      : copies.map(({ HolderID, HolderName, LoanID, ...rest }) => rest);

    return ok({ book, copies: visibleCopies, media, reviews });
  } catch (err) {
    return handleError(err);
  }
}
