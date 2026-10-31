// PUT /api/fines/pay  { loanId, fineNumber, status: 'Paid' | 'Waived' }  (Librarian, Admin)
import { query } from '@/lib/db';
import { fail, handleError, ok, readBody, toId } from '@/lib/api';
import { STAFF, requireRole } from '@/lib/auth';

export async function PUT(request) {
  const { error } = await requireRole(request, STAFF);
  if (error) return error;

  const body = await readBody(request);
  const loanId = toId(body.loanId);
  const fineNumber = toId(body.fineNumber);
  const status = body.status || 'Paid';
  if (!loanId || !fineNumber) return fail('Loan id and fine number are required');
  if (!['Paid', 'Waived'].includes(status)) return fail('Status must be Paid or Waived');

  try {
    const result = await query(
      `UPDATE Fines SET FineStatus = ?
       WHERE LoanID = ? AND FineNumber = ? AND FineStatus = 'Pending'`,
      [status, loanId, fineNumber]
    );
    if (result.affectedRows === 0) return fail('Fine not found or already settled', 404);
    return ok({ loanId, fineNumber, status });
  } catch (err) {
    return handleError(err);
  }
}
