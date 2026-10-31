// POST /api/gate/entry  { memberId }  (Librarian, Admin) — record a member entering
import { query } from '@/lib/db';
import { fail, handleError, ok, readBody, toId } from '@/lib/api';
import { STAFF, requireRole } from '@/lib/auth';

export async function POST(request) {
  const { error } = await requireRole(request, STAFF);
  if (error) return error;

  const memberId = toId((await readBody(request)).memberId);
  if (!memberId) return fail('Choose a member');

  try {
    const [inside] = await query('SELECT LogID FROM Gate_Attendance WHERE MemberID = ? AND ExitTime IS NULL', [memberId]);
    if (inside) return fail('This member is already inside the library');

    const result = await query('INSERT INTO Gate_Attendance (MemberID, EntryTime) VALUES (?, NOW())', [memberId]);
    return ok({ logId: result.insertId }, 201);
  } catch (err) {
    return handleError(err);
  }
}
