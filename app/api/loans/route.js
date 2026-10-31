// GET /api/loans               active loans (vw_ActiveLoans)
// GET /api/loans?overdue=1     only overdue loans
// GET /api/loans?history=1     recently returned loans
// Staff see every member's loans; a member only sees their own.
import { query } from '@/lib/db';
import { handleError, ok } from '@/lib/api';
import { isStaff, requireRole } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireRole(request);
  if (error) return error;

  const params = new URL(request.url).searchParams;
  const ownOnly = !isStaff(user);

  try {
    if (params.get('history') === '1') {
      const rows = await query(
        `SELECT l.LoanID, l.MemberID, CONCAT(m.Fname, ' ', m.Lname) AS MemberName,
                l.BookID, b.Title, l.CopyNumber, l.IssueDate, l.DueDate, l.ActualReturnDate,
                GREATEST(DATEDIFF(l.ActualReturnDate, l.DueDate), 0) AS DaysLate
         FROM Loans l
         JOIN Members m ON m.MemberID = l.MemberID
         JOIN Books b ON b.BookID = l.BookID
         WHERE l.ActualReturnDate IS NOT NULL
           ${ownOnly ? 'AND l.MemberID = ?' : ''}
         ORDER BY l.ActualReturnDate DESC, l.LoanID DESC
         LIMIT 50`,
        ownOnly ? [user.memberId] : []
      );
      return ok(rows);
    }

    const where = [];
    const values = [];
    if (ownOnly) {
      where.push('MemberID = ?');
      values.push(user.memberId);
    }
    if (params.get('overdue') === '1') where.push('DaysOverdue > 0');

    const rows = await query(
      `SELECT * FROM vw_ActiveLoans
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY DueDate, LoanID`,
      values
    );
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}
