// PUT /api/rooms/reservations/[id]/cancel  (the member who booked it, or staff)
import { query } from '@/lib/db';
import { fail, handleError, ok, toId } from '@/lib/api';
import { isStaff, requireRole } from '@/lib/auth';

export async function PUT(request, { params }) {
  const { user, error } = await requireRole(request);
  if (error) return error;

  const reservationId = toId((await params).id);
  if (!reservationId) return fail('Invalid reservation id');

  try {
    const [booking] = await query('SELECT MemberID, BookingStatus FROM Room_Reservations WHERE ReservationID = ?', [
      reservationId,
    ]);
    if (!booking) return fail('Booking not found', 404);
    if (!isStaff(user) && booking.MemberID !== user.memberId) {
      return fail('You can only cancel your own bookings', 403);
    }
    if (booking.BookingStatus !== 'Confirmed') return fail('Only confirmed bookings can be cancelled');

    await query("UPDATE Room_Reservations SET BookingStatus = 'Cancelled' WHERE ReservationID = ?", [reservationId]);
    return ok({ reservationId, status: 'Cancelled' });
  } catch (err) {
    return handleError(err);
  }
}
