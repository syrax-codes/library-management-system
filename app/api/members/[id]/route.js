// GET /api/members/[id]  (staff, or that member) — profile, phones, loans and fines
import { query } from '@/lib/db';
import { fail, handleError, ok, toId } from '@/lib/api';
import { isStaff, requireRole } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireRole(request);
  if (error) return error;

  const memberId = toId((await params).id);
  if (!memberId) return fail('Invalid member id');

  // A member may only open their own profile
  if (!isStaff(user) && user.memberId !== memberId) {
    return fail('You do not have permission to do this', 403);
  }

  try {
    const [member] = await query(
      `SELECT m.MemberID, m.Fname, m.Lname, m.EmailAddress, m.DOB,
              TIMESTAMPDIFF(YEAR, m.DOB, CURDATE()) AS Age,
              m.GuardianContactName, m.GuardianRelationship, m.GuardianContactNumber,
              fn_GetMemberTotalFines(m.MemberID) AS UnpaidFines
       FROM Members m
       WHERE m.MemberID = ?`,
      [memberId]
    );
    if (!member) return fail('Member not found', 404);

    const phones = await query(
      'SELECT PhoneNumber FROM Member_Phone_Numbers WHERE MemberID = ? ORDER BY PhoneNumber',
      [memberId]
    );

    const activeLoans = await query(
      'SELECT * FROM vw_ActiveLoans WHERE MemberID = ? ORDER BY DueDate',
      [memberId]
    );

    const fines = await query(
      `SELECT f.LoanID, f.FineNumber, f.AssessedDate, f.FineAmount, f.FineStatus, b.Title
       FROM Fines f
       JOIN Loans l ON l.LoanID = f.LoanID
       JOIN Books b ON b.BookID = l.BookID
       WHERE l.MemberID = ?
       ORDER BY f.FineStatus = 'Pending' DESC, f.AssessedDate DESC`,
      [memberId]
    );

    const [counts] = await query('SELECT COUNT(*) AS TotalLoans FROM Loans WHERE MemberID = ?', [memberId]);

    return ok({
      member,
      phones: phones.map((p) => p.PhoneNumber),
      activeLoans,
      fines,
      totalLoans: counts.TotalLoans,
    });
  } catch (err) {
    return handleError(err);
  }
}
