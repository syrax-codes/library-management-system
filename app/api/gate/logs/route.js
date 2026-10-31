// GET /api/gate/logs?date=YYYY-MM-DD  (Librarian, Admin)
// Members currently inside, plus the visit log (all dates if none given)
import { query } from '@/lib/db';
import { fail, handleError, ok } from '@/lib/api';
import { STAFF, requireRole } from '@/lib/auth';

const LOG_COLUMNS = `
  g.LogID, g.MemberID, CONCAT(m.Fname, ' ', m.Lname) AS MemberName,
  g.EntryTime, g.ExitTime, g.StayMinutes`;

export async function GET(request) {
  const { error } = await requireRole(request, STAFF);
  if (error) return error;

  const date = new URL(request.url).searchParams.get('date');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Date must be YYYY-MM-DD');

  try {
    const inside = await query(
      `SELECT ${LOG_COLUMNS}
       FROM Gate_Attendance g JOIN Members m ON m.MemberID = g.MemberID
       WHERE g.ExitTime IS NULL
       ORDER BY g.EntryTime`
    );

    const logs = await query(
      `SELECT ${LOG_COLUMNS}
       FROM Gate_Attendance g JOIN Members m ON m.MemberID = g.MemberID
       ${date ? 'WHERE DATE(g.EntryTime) = ?' : ''}
       ORDER BY g.EntryTime DESC
       LIMIT 100`,
      date ? [date] : []
    );

    return ok({ inside, logs });
  } catch (err) {
    return handleError(err);
  }
}
