// POST /api/rooms/reserve  { roomId, date, start, end, memberId? }
// Members book for themselves; staff book on behalf of a member.
// sp_ReserveRoom locks the room row and rejects overlapping bookings.
import { callWithOut } from '@/lib/db';
import { fail, handleError, ok, readBody, toId } from '@/lib/api';
import { isStaff, requireRole } from '@/lib/auth';

const TIME = /^\d{2}:\d{2}$/;

export async function POST(request) {
  const { user, error } = await requireRole(request);
  if (error) return error;

  const body = await readBody(request);
  // A member's ID always comes from the token, never the request body
  const memberId = isStaff(user) ? toId(body.memberId) : user.memberId;
  const roomId = toId(body.roomId);

  if (!memberId) return fail('Choose the member this booking is for');
  if (!roomId) return fail('Choose a room');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) return fail('Choose a date');
  if (!TIME.test(body.start || '') || !TIME.test(body.end || '')) return fail('Start and end times are required');

  try {
    const reservationId = await callWithOut('sp_ReserveRoom', [memberId, roomId, body.date, body.start, body.end]);
    return ok({ reservationId }, 201);
  } catch (err) {
    return handleError(err);
  }
}
