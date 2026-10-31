// GET /api/stats  (Librarian, Admin)
// Dashboard numbers and reports: overdue loans (view), top books per genre
// (RANK window function), popular genres and dues (HAVING), idle books (subquery).
import { query } from '@/lib/db';
import { handleError, ok } from '@/lib/api';
import { STAFF, requireRole } from '@/lib/auth';
import { IDLE_BOOKS, MEMBERS_WITH_DUES, POPULAR_GENRES, TOP_BOOKS_PER_GENRE } from '@/lib/reports';

export async function GET(request) {
  const { error } = await requireRole(request, STAFF);
  if (error) return error;

  try {
    const [counts] = await query(
      `SELECT (SELECT COUNT(*) FROM Members)                              AS Members,
              (SELECT COUNT(*) FROM Books)                                AS Books,
              (SELECT COUNT(*) FROM vw_ActiveLoans)                       AS ActiveLoans,
              (SELECT COUNT(*) FROM vw_ActiveLoans WHERE DaysOverdue > 0) AS OverdueLoans,
              (SELECT COALESCE(SUM(FineAmount), 0) FROM Fines WHERE FineStatus = 'Pending') AS PendingFines,
              (SELECT COUNT(*) FROM Gate_Attendance WHERE ExitTime IS NULL) AS InsideNow`
    );

    const [overdue, topBooks, popularGenres, dues, idleBooks] = await Promise.all([
      query('SELECT * FROM vw_ActiveLoans WHERE DaysOverdue > 0 ORDER BY DaysOverdue DESC'),
      query(TOP_BOOKS_PER_GENRE),
      query(POPULAR_GENRES),
      query(MEMBERS_WITH_DUES),
      query(IDLE_BOOKS),
    ]);

    return ok({ counts, overdue, topBooks, popularGenres, dues, idleBooks });
  } catch (err) {
    return handleError(err);
  }
}
