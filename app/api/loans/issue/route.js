// POST /api/loans/issue  { memberId, bookId, copyNumber }  (Librarian, Admin)
// All the rules (copy available, < 3 active loans, fines <= Rs 100) and the
// row lock live in sp_CheckoutBook.
import { callWithOut, query } from '@/lib/db';
import { fail, handleError, ok, readBody, toId } from '@/lib/api';
import { STAFF, requireRole } from '@/lib/auth';

export async function POST(request) {
  const { error } = await requireRole(request, STAFF);
  if (error) return error;

  const body = await readBody(request);
  const memberId = toId(body.memberId);
  const bookId = toId(body.bookId);
  const copyNumber = toId(body.copyNumber);
  if (!memberId || !bookId || !copyNumber) return fail('Member, book and copy are required');

  try {
    const [{ today }] = await query('SELECT CURDATE() AS today');
    const loanId = await callWithOut('sp_CheckoutBook', [memberId, bookId, copyNumber, today]);

    const [loan] = await query(
      `SELECT l.LoanID, l.IssueDate, l.DueDate, b.Title, CONCAT(m.Fname, ' ', m.Lname) AS MemberName
       FROM Loans l
       JOIN Books b ON b.BookID = l.BookID
       JOIN Members m ON m.MemberID = l.MemberID
       WHERE l.LoanID = ?`,
      [loanId]
    );

    return ok(loan, 201);
  } catch (err) {
    return handleError(err);
  }
}
