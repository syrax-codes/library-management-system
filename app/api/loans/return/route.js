// POST /api/loans/return  { loanId, returnDate? }  (Librarian, Admin)
// A plain UPDATE. trg_BookReturned then frees the copy and, if the return
// is late, inserts a Pending fine of Rs 5 per day.
import { query } from '@/lib/db';
import { fail, handleError, ok, readBody, toId } from '@/lib/api';
import { STAFF, requireRole } from '@/lib/auth';

export async function POST(request) {
  const { error } = await requireRole(request, STAFF);
  if (error) return error;

  const body = await readBody(request);
  const loanId = toId(body.loanId);
  if (!loanId) return fail('Loan id is required');

  try {
    const [{ today }] = await query('SELECT CURDATE() AS today');
    const returnDate = body.returnDate || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) return fail('Return date must be YYYY-MM-DD');
    if (returnDate > today) return fail('Return date cannot be in the future');

    const result = await query(
      'UPDATE Loans SET ActualReturnDate = ? WHERE LoanID = ? AND ActualReturnDate IS NULL',
      [returnDate, loanId]
    );
    if (result.affectedRows === 0) return fail('Loan not found or already returned', 404);

    // Read back any fine the trigger just created
    const [fine] = await query(
      `SELECT FineNumber, FineAmount FROM Fines
       WHERE LoanID = ? AND AssessedDate = ?
       ORDER BY FineNumber DESC LIMIT 1`,
      [loanId, returnDate]
    );

    return ok({ loanId, returnDate, fine: fine ? fine.FineAmount : 0 });
  } catch (err) {
    return handleError(err);
  }
}
