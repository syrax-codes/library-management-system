// POST /api/gate/exit  { logId }  (Librarian, Admin) — record the exit.
// StayMinutes is then computed by MySQL (generated column).
import { query } from '@/lib/db';
import { fail, handleError, ok, readBody, toId } from '@/lib/api';
import { STAFF, requireRole } from '@/lib/auth';

export async function POST(request) {
  const { error } = await requireRole(request, STAFF);
  if (error) return error;

  const logId = toId((await readBody(request)).logId);
  if (!logId) return fail('Log id is required');

  try {
    const result = await query('UPDATE Gate_Attendance SET ExitTime = NOW() WHERE LogID = ? AND ExitTime IS NULL', [logId]);
    if (result.affectedRows === 0) return fail('Visit not found or already closed', 404);

    const [row] = await query('SELECT LogID, StayMinutes FROM Gate_Attendance WHERE LogID = ?', [logId]);
    return ok(row);
  } catch (err) {
    return handleError(err);
  }
}
